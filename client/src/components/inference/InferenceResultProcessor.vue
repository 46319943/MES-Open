<template>
  <div class="q-gutter-md">
    <!-- Results Display -->
    <div v-if="inferenceResults" class="text-body2">
      <q-icon name="check_circle" color="positive" size="1.5em" class="q-mr-sm" />
      <span class="text-positive"><strong>Inference completed!</strong></span>
      <div class="q-mt-sm">
        <div>
          <strong>Total Data Points Processed:</strong> {{ inferenceResults.totalProcessed }}
        </div>
        <div><strong>Successful:</strong> {{ inferenceResults.successful }}</div>
        <div><strong>Failed:</strong> {{ inferenceResults.failed }}</div>
        <div><strong>Total Time:</strong> {{ inferenceResults.duration }}</div>
        <div v-if="inferenceResults.metrics">
          <strong>Success Rate:</strong>
          {{ Math.round((inferenceResults.successful / inferenceResults.totalProcessed) * 100) }}%
        </div>
      </div>
    </div>

    <!-- Validation Results (for validation mode) -->
    <div
      v-if="
        inferenceResults && inferenceSettings?.mode === 'validation' && inferenceResults.metrics
      "
    >
      <q-separator class="q-my-md" />
      <div class="text-subtitle2 q-mb-sm">Validation Metrics</div>
      <q-card flat bordered>
        <q-card-section>
          <div class="row q-gutter-md">
            <div class="col">
              <div class="text-h6 text-center">
                {{ inferenceResults.metrics.precision.toFixed(3) }}
              </div>
              <div class="text-caption text-center text-grey-6">Precision</div>
            </div>
            <div class="col">
              <div class="text-h6 text-center">
                {{ inferenceResults.metrics.recall.toFixed(3) }}
              </div>
              <div class="text-caption text-center text-grey-6">Recall</div>
            </div>
            <div class="col">
              <div class="text-h6 text-center">{{ inferenceResults.metrics.f1.toFixed(3) }}</div>
              <div class="text-caption text-center text-grey-6">F1 Score</div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { Data, DataSegment } from '@/shared/models/data.model';
import type { FineTuneRecord } from 'src/local/models/fine-tune.model';
import dataApi from '@/shared/sdk/data.api';
import { useConsoleStore } from '@/stores/console.store';
import { parseCoTToSegments } from '@/utils/cot-parser';
import { calculateIndividualF1Score, calculateValidationMetrics } from '@/utils/f1-score';
import { getOutputFormatFromFineTune, getOutputFormatTypeFromFineTune } from '@/utils/finetune-meta';
import { parseOrderPreservingJson, parseSensePrioritizedJson } from '@/utils/json-parser.util';
import { nextTick, ref } from 'vue';
import type { IndividualDataMetrics, InferenceResults, InferenceSettings, ValidationMetrics } from './inference.types';

defineOptions({
  name: 'InferenceResultProcessor',
});

// Props
const props = defineProps<{
  selectedFineTune: FineTuneRecord;
  inferenceSettings: InferenceSettings;
}>();

// Store
const consoleStore = useConsoleStore();

// Component state
const inferenceResults = ref<InferenceResults | null>(null);
const processedCount = ref(0);
const failedCount = ref(0);
const validationMetrics = ref<ValidationMetrics | null>(null);
const individualMetrics = ref<IndividualDataMetrics[]>([]);
const processingStartTime = ref<number | null>(null);

// Raw response processing data
const rawResponses = ref<Array<{ dataPoint: Data; response: string; index: number }>>([]);
const parsedResults = ref<Array<{ dataPoint: Data; segments: DataSegment[]; index: number }>>([]);

// Helper function to add logs
function addResultLog(type: 'info' | 'success' | 'warning' | 'error', message: string) {
  consoleStore.addLog(type, message, 'Result Processing');
}

// Helper function to get output format from selectedFineTune metadata

// Methods that will be moved from InferenceExecution
function processValidationMode(dataPoint: Data, segments: DataSegment[], index: number) {
  // Calculate individual F1 score immediately
  const individualMetric = calculateIndividualF1Score(dataPoint, segments, index);
  individualMetrics.value.push(individualMetric);

  // Log the individual F1 score
  addResultLog('success', `Data point ${index + 1}: F1=${individualMetric.f1.toFixed(3)}, Precision=${individualMetric.precision.toFixed(3)}, Recall=${individualMetric.recall.toFixed(3)} (TP:${individualMetric.truePositives}, FP:${individualMetric.falsePositives}, FN:${individualMetric.falseNegatives})`);
  addResultLog('info', `Validation mode: processed ${segments.length} predicted segments for data point ${index + 1}`);
}

async function processInferenceMode(dataPoint: Data, segments: DataSegment[], index: number) {
  // For inference mode, update the data with the parsed segments
  try {
    // Update the data object with the new segments
    const updatedData = {
      text: dataPoint.text,
      segments: segments,
      metaData: dataPoint.metaData
    };

    // Call the API to update the data
    await dataApi.updateData(
      props.inferenceSettings.dataset.id,
      dataPoint.id,
      updatedData
    );

    addResultLog('success', `Inference mode: updated data point ${index + 1} with ${segments.length} segments`);
  } catch (error) {
    const errorMsg = `Failed to update data point ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    addResultLog('error', errorMsg);
    throw error; // Re-throw to be handled by the caller
  }
}

function calculateValidationMetricsWrapper() {
  if (individualMetrics.value.length === 0) {
    addResultLog('warning', 'No individual metrics available for validation metrics calculation');
    return;
  }

  addResultLog('info', 'Calculating aggregate validation metrics from individual scores...');

  const metrics = calculateValidationMetrics(individualMetrics.value);
  validationMetrics.value = metrics;

  addResultLog('success', `Aggregate validation metrics calculated - F1: ${metrics.f1.toFixed(3)}, Precision: ${metrics.precision.toFixed(3)}, Recall: ${metrics.recall.toFixed(3)}`);
  addResultLog('info', `Total - True Positives: ${metrics.totalTruePositives}, False Positives: ${metrics.totalFalsePositives}, False Negatives: ${metrics.totalFalseNegatives}`);
}


// Method to handle raw response from execution component
async function handleRawResponse(dataPoint: Data, response: string, index: number) {
  // Store raw response for processing
  rawResponses.value.push({ dataPoint, response, index });

  addResultLog('info', `Processing response for data point ${index + 1}`);

  try {
    // Get output format type from selectedFineTune metadata
    const outputFormatType = getOutputFormatTypeFromFineTune(props.selectedFineTune);
    addResultLog('info', `Using output format type: ${outputFormatType} for data point ${index + 1}`);

    let segments: DataSegment[];

    // Parse the response based on the output format type
    if (outputFormatType === 'sense-prioritized') {
      // Get output format for JSON parsing
      const outputFormat = await getOutputFormatFromFineTune(props.selectedFineTune);
      segments = parseSensePrioritizedJson(response, outputFormat, dataPoint.text);
      addResultLog('info', `Parsed sense-prioritized JSON for data point ${index + 1}`);
    } else if (outputFormatType === 'order-preserving') {
      // Get output format for JSON parsing
      const outputFormat = await getOutputFormatFromFineTune(props.selectedFineTune);
      segments = parseOrderPreservingJson(response, outputFormat, dataPoint.text);
      addResultLog('info', `Parsed order-preserving JSON for data point ${index + 1}`);
    } else {
      // Default to CoT format
      const outputFormat = await getOutputFormatFromFineTune(props.selectedFineTune);
      segments = parseCoTToSegments(response, outputFormat, dataPoint.text, true);
      addResultLog('info', `Parsed CoT format for data point ${index + 1}`);
    }

    // Store parsed results
    parsedResults.value.push({ dataPoint, segments, index });

    addResultLog('success', `Successfully parsed response for data point ${index + 1} - found ${segments.length} segments`);

    // Process the response based on mode
    if (props.inferenceSettings?.mode === 'validation') {
      processValidationMode(dataPoint, segments, index);
    } else {
      await processInferenceMode(dataPoint, segments, index);
    }

    processedCount.value++;
  } catch (error) {
    // Log parsing error and skip this data point
    const errorMsg = `Parsing failed for data point ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    addResultLog('error', errorMsg);
    failedCount.value++;
  }
}

// Method to finalize results when inference is complete
async function finalizeResults() {
  await nextTick();

  if (!processingStartTime.value) {
    processingStartTime.value = Date.now();
  }

  // Calculate metrics for validation mode
  if (props.inferenceSettings?.mode === 'validation') {
    calculateValidationMetricsWrapper();
  }

  const duration = Math.round((Date.now() - processingStartTime.value) / 1000);
  const durationString = `${Math.floor(duration / 60)}m ${duration % 60}s`;

  const results: InferenceResults = {
    totalProcessed: processedCount.value + failedCount.value,
    successful: processedCount.value,
    failed: failedCount.value,
    duration: durationString,
    metrics: validationMetrics.value || undefined,
  };

  inferenceResults.value = results;
}

// Reset processing state
function reset() {
  inferenceResults.value = null;
  processedCount.value = 0;
  failedCount.value = 0;
  validationMetrics.value = null;
  individualMetrics.value = [];
  processingStartTime.value = Date.now();
  rawResponses.value = [];
  parsedResults.value = [];
  // Clear console logs for this category
  consoleStore.clearLogsByCategory('Result Processing');
}

// Expose methods to parent component
defineExpose({
  handleRawResponse,
  finalizeResults,
  reset,
});
</script>
