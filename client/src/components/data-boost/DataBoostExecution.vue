<template>
  <q-card flat class="column">
    <q-card-section class="bg-secondary text-white">
      <div class="text-h6">Data Boost Execution</div>
    </q-card-section>

    <q-card-section class="col tw:overflow-y-auto tw:shrink tw:min-h-0">
      <!-- Execution Configuration -->
      <div class="q-gutter-md">
        <!-- Model Selection Section -->
        <div class="text-subtitle2 q-mb-sm">Model Configuration</div>
        <div class="q-gutter-sm">
          <q-select
            v-model="selectedModel"
            :options="allModelOptions"
            option-label="label"
            option-value="value"
            outlined
            dense
            label="Model"
            :rules="[(val) => !!val || 'Model is required']"
          />
        </div>

        <!-- Execution Controls -->
        <q-separator />
        <div class="row q-gutter-sm q-mt-md">
          <q-btn
            color="primary"
            icon="play_arrow"
            label="Start Execution"
            size="md"
            @click="startExecution"
            :loading="executionLoading"
            :disable="!canStartExecution"
            class="col"
          />
          <q-btn
            color="negative"
            icon="stop"
            label="Stop"
            size="md"
            @click="stopExecution"
            :disable="!executionLoading"
            outline
          />
        </div>

        <!-- Execution Status -->
        <div v-if="executionStatus || executionLoading" class="q-mt-md">
          <q-separator />
          <div class="text-subtitle2 q-mt-md q-mb-sm">Execution Status</div>

          <div v-if="executionLoading" class="q-gutter-sm">
            <q-linear-progress
              :value="executionProgress"
              color="primary"
              size="20px"
              class="q-mb-sm"
            >
              <div class="absolute-full flex flex-center">
                <q-badge
                  color="white"
                  text-color="primary"
                  :label="`${Math.round(executionProgress * 100)}%`"
                />
              </div>
            </q-linear-progress>

            <div class="text-body2">
              <div><strong>Status:</strong> {{ executionStatus }}</div>
              <div>
                <strong>Progress:</strong> {{ currentDataIndex }} / {{ inputDataCount }} data points
              </div>
              <div v-if="currentDataText" class="q-mt-sm">
                <strong>Current Input:</strong>
                <div class="tw:bg-gray-100 tw:p-2 tw:rounded tw:mt-1 text-caption">
                  {{ currentDataText.substring(0, 200)
                  }}{{ currentDataText.length > 200 ? '...' : '' }}
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="executionComplete" class="text-body2">
            <q-icon name="check_circle" color="positive" size="1.5em" class="q-mr-sm" />
            <span class="text-positive"><strong>Execution completed successfully!</strong></span>
            <div class="q-mt-sm">
              <div><strong>Total Data Points Processed:</strong> {{ currentDataIndex }}</div>
              <div><strong>Total Time:</strong> {{ executionDuration }}</div>
              <div><strong>Success Rate:</strong> {{ successRate }}%</div>
            </div>
          </div>

          <div v-else-if="executionError" class="text-body2">
            <q-icon name="error" color="negative" size="1.5em" class="q-mr-sm" />
            <span class="text-negative"><strong>Execution failed:</strong></span>
            <div class="q-mt-sm text-negative">{{ executionError }}</div>
          </div>
        </div>


        <!-- Execution History/Logs (placeholder for future implementation) -->
        <div v-if="executionLogs.length > 0" class="q-mt-md">
          <q-separator />
          <div class="text-subtitle2 q-mt-md q-mb-sm">Execution Logs</div>
          <q-scroll-area style="height: 200px" class="tw:border tw:border-gray-300 tw:rounded">
            <div class="q-pa-sm">
              <div
                v-for="(log, index) in executionLogs"
                :key="index"
                class="text-caption q-mb-xs"
                :class="{
                  'text-positive': log.type === 'success',
                  'text-negative': log.type === 'error',
                  'text-warning': log.type === 'warning',
                  'text-grey-7': log.type === 'info',
                }"
              >
                [{{ log.timestamp }}] {{ log.message }}
              </div>
            </div>
          </q-scroll-area>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!dataBoostStore.selectedDataBoost" class="text-center q-py-xl">
        <q-icon name="settings" size="3em" color="grey-4" />
        <div class="text-h6 q-mt-md q-mb-sm text-grey-6">No Data Boost Selected</div>
        <p class="text-grey-5">Select a data boost from the management section to execute</p>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import type { Data } from '@/shared/models/data.model';
import { LLMBackendAndModelMapping, type LLMModel } from '@/shared/models/llm.model';
import type { OutputFormat } from '@/shared/models/output-format.model';
import type { Prompt } from '@/shared/models/prompt.model';
import dataApi from '@/shared/sdk/data.api';
import llmApi from '@/shared/sdk/llm.api';
import outputFormatApi from '@/shared/sdk/output-format.api';
import promptApi from '@/shared/sdk/prompt.api';
import { useDataBoostStore } from '@/stores/data-boost.store';
import { generateCoTString } from '@/utils/cot-generator';
import { parseCoTToSegments } from '@/utils/cot-parser';
import { computed, onMounted, ref } from 'vue';

const dataBoostStore = useDataBoostStore();

// Create all model options from all backends
const allModelOptions = computed(() => {
  const options: Array<{ label: string; value: LLMModel }> = [];

  Object.entries(LLMBackendAndModelMapping).forEach(([backend, models]) => {
    models.forEach((model) => {
      options.push({
        label: `${backend.charAt(0).toUpperCase() + backend.slice(1)}: ${model
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')}`,
        value: model,
      });
    });
  });

  return options;
});

// Execution parameters
const selectedModel = ref<LLMModel | null>(null);

// Execution state
const executionLoading = ref(false);
const executionStatus = ref('');
const executionProgress = ref(0);
const currentDataIndex = ref(0);
const inputDataCount = ref(0);
const currentDataText = ref('');
const executionComplete = ref(false);
const executionError = ref('');
const executionDuration = ref('');
const successRate = ref(0);


// Data storage
const inputData = ref<Data[]>([]);
const exampleData = ref<Data[]>([]);
const currentPrompt = ref<Prompt | null>(null);
const currentOutputFormat = ref<OutputFormat | null>(null);
const processedCount = ref(0);
const failedCount = ref(0);

// Execution logs
interface ExecutionLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

const executionLogs = ref<ExecutionLog[]>([]);

// Computed
const canStartExecution = computed(() => {
  return (
    !executionLoading.value &&
    dataBoostStore.selectedDataBoost &&
    selectedModel.value &&
    (dataBoostStore.selectedDataBoost?.exampleCount || 0) > 0
  );
});

// Methods
function addLog(type: ExecutionLog['type'], message: string) {
  const timestamp = new Date().toLocaleTimeString();
  executionLogs.value.push({ timestamp, type, message });

  // Keep only last 100 logs
  if (executionLogs.value.length > 100) {
    executionLogs.value = executionLogs.value.slice(-100);
  }
}

async function startExecution() {
  if (!canStartExecution.value) return;

  // Reset execution state
  executionLoading.value = true;
  executionStatus.value = 'Initializing...';
  executionProgress.value = 0;
  currentDataIndex.value = 0;
  processedCount.value = 0;
  failedCount.value = 0;
  executionComplete.value = false;
  executionError.value = '';
  executionLogs.value = [];

  const startTime = Date.now();

  try {
    const dataBoost = dataBoostStore.selectedDataBoost!;

    addLog('info', `Starting data boost execution for "${dataBoost.name}"`);
    addLog('info', `Model: ${selectedModel.value}, Examples: ${dataBoost.exampleCount}`);

    // Load required data
    executionStatus.value = 'Loading data and configuration...';
    await loadExecutionData();

    // Start processing data points
    await processAllDataPoints();

    // Execution completed successfully
    executionComplete.value = true;
    executionStatus.value = 'Completed';
    const duration = Math.round((Date.now() - startTime) / 1000);
    executionDuration.value = `${Math.floor(duration / 60)}m ${duration % 60}s`;
    successRate.value = Math.round((processedCount.value / inputDataCount.value) * 100);

    addLog('success', `Execution completed successfully in ${executionDuration.value}`);
    addLog(
      'success',
      `Processed ${processedCount.value}/${inputDataCount.value} data points with ${successRate.value}% success rate`,
    );
  } catch (error) {
    executionError.value = error instanceof Error ? error.message : 'Unknown error occurred';
    addLog('error', `Execution failed: ${executionError.value}`);
  } finally {
    executionLoading.value = false;
    executionStatus.value = executionComplete.value ? 'Completed' : 'Failed';
  }
}

async function loadExecutionData() {
  const dataBoost = dataBoostStore.selectedDataBoost!;

  // Load input data
  // TODO: Limit 100 is temporary, we need to load all data points
  const inputResponse = await dataApi.listData(dataBoost.inputDatasetId, { page: 1, limit: 100 });
  inputData.value = inputResponse.data;
  inputDataCount.value = inputData.value.length;

  // Load example data
  const exampleResponse = await dataApi.listData(dataBoost.exampleDatasetId, {
    page: 1,
    // TODO: Limit 100 is temporary, we need to load all data points
    limit: 100,
  });
  exampleData.value = exampleResponse.data;

  // Load prompt
  currentPrompt.value = await promptApi.getPrompt(dataBoost.promptId);

  // Load output format
  currentOutputFormat.value = await outputFormatApi.getOutputFormat(dataBoost.outputFormatId);

  addLog(
    'info',
    `Loaded ${inputDataCount.value} input data points and ${exampleData.value.length} example data points`,
  );
}

async function processAllDataPoints() {
  for (let i = 0; i < inputData.value.length; i++) {
    if (!executionLoading.value) break; // Check if stopped

    currentDataIndex.value = i + 1;
    const dataPoint = inputData.value[i];
    if (!dataPoint) continue; // Skip if dataPoint is undefined

    currentDataText.value = dataPoint.text;
    executionStatus.value = `Processing data point ${currentDataIndex.value}/${inputDataCount.value}...`;
    executionProgress.value = i / inputDataCount.value;

    addLog(
      'info',
      `Processing data point ${currentDataIndex.value}: ${dataPoint.text.substring(0, 100)}...`,
    );

    try {
      await processDataPoint(dataPoint);
      processedCount.value++;
      addLog('success', `Successfully processed data point ${currentDataIndex.value}`);
    } catch (error) {
      failedCount.value++;
      addLog(
        'error',
        `Failed to process data point ${currentDataIndex.value}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

async function processDataPoint(dataPoint: Data) {
  // Generate prompt with placeholders replaced
  const prompt = generatePromptForDataPoint(dataPoint);

  // Call LLM
  const llmResponse = await callLLM(prompt);

  // Try to parse the response
  try {
    // Enable error throwing to get detailed parsing failure information
    const segments = parseCoTToSegments(
      llmResponse,
      currentOutputFormat.value!,
      dataPoint.text,
      true,
    );

    // Update the data point with parsed segments in the input dataset
    await dataApi.updateData(dataBoostStore.selectedDataBoost!.inputDatasetId, dataPoint.id, {
      segments,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';

    // Add to failed data items in store instead of blocking execution
    dataBoostStore.addFailedDataItem(
      dataPoint,
      llmResponse,
      errorMessage,
      dataBoostStore.selectedDataBoost!.id
    );

    addLog('warning', `Added data point to failed items queue: ${dataPoint.text.substring(0, 50)}...`);
    throw new Error('Parsing failed - added to failed items queue');
  }
}

function generatePromptForDataPoint(dataPoint: Data): string {
  let prompt = currentPrompt.value!.content;

  // Replace {{ EXAMPLES }} placeholder
  const examples = generateExamplesString();
  prompt = prompt.replace(/\{\{\s*EXAMPLES\s*\}\}/g, examples);

  // Replace {{ INPUT }} placeholder
  prompt = prompt.replace(/\{\{\s*INPUT\s*\}\}/g, dataPoint.text);

  return prompt;
}

function generateExamplesString(): string {
  // Randomly select examples
  const dataBoost = dataBoostStore.selectedDataBoost!;
  const selectedExamples = getRandomExamples(dataBoost.exampleCount);

  return selectedExamples
    .map((example) => {
      let exampleString = dataBoost.exampleTemplate;

      // Replace {{ INPUT }} with example text
      exampleString = exampleString.replace(/\{\{\s*INPUT\s*\}\}/g, example.text);

      // Replace {{ OUTPUT }} with CoT string
      const cotString = generateCoTString(example, currentOutputFormat.value!);
      exampleString = exampleString.replace(/\{\{\s*OUTPUT\s*\}\}/g, cotString);

      return exampleString;
    })
    .join('\n\n');
}

function getRandomExamples(count: number): Data[] {
  const shuffled = [...exampleData.value].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function callLLM(prompt: string): Promise<string> {
  const response = await llmApi.callLLM({
    messages: [{ role: 'user', content: prompt }],
    model: selectedModel.value!,
  });

  return response.response;
}



function stopExecution() {
  if (!executionLoading.value) return;

  executionLoading.value = false;
  executionStatus.value = 'Stopped by user';
  addLog('warning', 'Execution stopped by user');
}

// Lifecycle
onMounted(() => {
  // Set default model
  if (allModelOptions.value.length > 0) {
    selectedModel.value = allModelOptions.value[0]?.value || null;
  }
});
</script>
