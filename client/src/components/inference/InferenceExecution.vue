<template>
  <div class="q-gutter-md">
    <!-- Execution Controls -->
    <div v-if="inferenceInProgress" class="row q-gutter-sm">
      <q-btn color="negative" icon="stop" label="Stop Inference" size="md" @click="stopInference" outline />
    </div>

    <!-- Progress Section -->
    <div v-if="inferenceInProgress">
      <div class="text-subtitle2 q-mb-sm">Progress</div>

      <div class="q-gutter-sm">
        <q-linear-progress :value="executionProgress" color="primary" size="20px" class="q-mb-sm">
          <div class="absolute-full flex flex-center">
            <q-badge color="white" text-color="primary" :label="`${Math.round(executionProgress * 100)}%`" />
          </div>
        </q-linear-progress>

        <div class="text-body2">
          <div><strong>Status:</strong> {{ executionStatus }}</div>
          <div>
            <strong>Progress:</strong> {{ currentDataIndex }} / {{ totalDataCount }} data points
          </div>
          <div v-if="currentDataText" class="q-mt-sm">
            <strong>Current Input:</strong>
            <div class="tw:bg-gray-100 tw:p-2 tw:rounded tw:mt-1 text-caption">
              {{ currentDataText.substring(0, 200) }}{{ currentDataText.length > 200 ? '...' : '' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Inference Mode Conflict Resolution Dialog -->
    <q-dialog v-model="showConflictDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-icon name="warning" color="warning" size="2em" class="q-mr-md" />
          <div>
            <div class="text-h6">Existing Annotations Found</div>
            <div class="text-body2 q-mt-sm">
              The data item already contains segment annotations. How would you like to proceed?
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn label="Overwrite" color="primary" @click="resolveConflict('overwrite')" />
          <q-btn label="Skip" color="grey" @click="resolveConflict('skip')" flat />
          <q-btn label="Terminate" color="negative" @click="resolveConflict('terminate')" flat />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </div>
</template>

<script setup lang="ts">
import { VLLM_KEY, VLLM_MODEL, VLLM_URL } from '@/config';
import type { Data } from '@/shared/models/data.model';
import type { FineTuneRecord } from 'src/local/models/fine-tune.model';
import type { OutputFormat } from '@/shared/models/output-format.model';
import type { Prompt } from '@/shared/models/prompt.model';
import dataApi from '@/shared/sdk/data.api';
import { useConsoleStore } from '@/stores/console.store';
import { getOutputFormatFromFineTune, getPromptFromFineTune } from '@/utils/finetune-meta';
import { processPromptTemplate } from '@/utils/prompt-processor';
import { processQwenInput } from '@/utils/qwen-processor';
import OpenAI from 'openai';
import { ref } from 'vue';
import type { InferenceSettings } from './inference.types';

defineOptions({
  name: 'InferenceExecution',
});

// Props
const props = defineProps<{
  selectedFineTune: FineTuneRecord;
  inferenceSettings: InferenceSettings;
}>();

// Emits
const emit = defineEmits<{
  'raw-response': [dataPoint: Data, response: string, index: number];
  'inference-completed': [];
}>();

// Store
const consoleStore = useConsoleStore();

// Component state
const inferenceInProgress = ref(false);
const executionStatus = ref('');
const executionProgress = ref(0);
const currentDataIndex = ref(0);
const totalDataCount = ref(0);
const currentDataText = ref('');

// Conflict resolution
const showConflictDialog = ref(false);
const conflictResolution = ref<'overwrite' | 'skip' | 'terminate' | null>(null);
const rememberConflictChoice = ref(false);

// Execution data
const currentPrompt = ref<Prompt | null>(null);
const currentOutputFormat = ref<OutputFormat | null>(null);

// OpenAI client for VLLM communication
let openaiClient: OpenAI | null = null;

// Methods
function addLog(type: 'info' | 'success' | 'warning' | 'error', message: string) {
  consoleStore.addLog(type, message, 'Inference Execution');
}

function initializeOpenAIClient() {
  if (!VLLM_URL) {
    throw new Error('VLLM_URL is not configured');
  }

  openaiClient = new OpenAI({
    baseURL: VLLM_URL,
    apiKey: VLLM_KEY || 'dummy-key', // VLLM may not require a real API key
    dangerouslyAllowBrowser: true, // Allow running in browser
  });
}

async function startInference() {
  // Set inference in progress
  inferenceInProgress.value = true;

  // Reset state
  executionStatus.value = 'Initializing...';
  executionProgress.value = 0;
  currentDataIndex.value = 0;
  // Clear console logs for this category
  consoleStore.clearLogsByCategory('Inference Execution');
  conflictResolution.value = null;
  rememberConflictChoice.value = false;

  const startTime = Date.now();

  try {
    // Initialize OpenAI client
    initializeOpenAIClient();

    addLog('info', `Starting ${props.inferenceSettings.mode} inference`);
    addLog('info', `Model: ${props.selectedFineTune.fine_tune_name}`);
    addLog('info', `Dataset: ${props.inferenceSettings.dataset.name}`);
    addLog('info', `Pool size: ${props.inferenceSettings.poolSize}`);

    // Initialize inference configuration and get dataset info
    executionStatus.value = 'Initializing inference configuration...';
    await initializeInferenceData();

    // Process data points with on-demand loading
    await processAllDataPointsWithPagination();

    // Inference completed successfully
    const duration = Math.round((Date.now() - startTime) / 1000);
    const durationString = `${Math.floor(duration / 60)}m ${duration % 60}s`;

    addLog('success', `Inference completed successfully in ${durationString}`);

    emit('inference-completed');
  } finally {
    // Always reset inference progress when done (success or failure)
    inferenceInProgress.value = false;
  }
}

async function initializeInferenceData(): Promise<void> {
  if (!props.inferenceSettings) return;

  // Get total count of data in dataset
  const firstPageResponse = await dataApi.listData(props.inferenceSettings.dataset.id, { page: 1, limit: 1 });
  const totalDatasetCount = firstPageResponse.pagination.total;

  // Load configuration
  currentPrompt.value = await getPromptFromFineTune(props.selectedFineTune);
  currentOutputFormat.value = await getOutputFormatFromFineTune(props.selectedFineTune);

  addLog('info', `Dataset contains ${totalDatasetCount} total data points`);
  addLog('info', `Loaded prompt: ${currentPrompt.value.name}`);
  addLog('info', `Loaded output format: ${currentOutputFormat.value.name}`);

  // Initialize total count - will be updated as we process and count actual filtered data
  // This is more memory efficient than pre-filtering all data
  totalDataCount.value = totalDatasetCount;
}

async function loadDataPage(page: number, limit: number): Promise<Data[]> {
  if (!props.inferenceSettings) return [];

  const response = await dataApi.listData(props.inferenceSettings.dataset.id,
    { page, limit, sortBy: 'updatedAt', sortOrder: 'asc', [props.inferenceSettings.mode === 'validation' ? 'filterByPopulatedSegments' : 'filterByEmptySegments']: true });

  return response.data || [];
}

async function processAllDataPointsWithPagination() {
  // TODO: Fix the current page loading and con-current pool mechanism.

  const poolSize = props.inferenceSettings?.poolSize || 10;
  const pageSize = 1; // Process data in pages

  // Shared state for coordination between workers
  let currentPage = 1;
  let totalProcessedCount = 0;
  let totalFilteredCount = 0; // Track actual count of filtered data
  let hasMoreData = true;

  // Mutex-like mechanism for thread-safe operations
  let isFetchingPage = false;

  // Helper function to safely get next page of data
  async function getNextPageData(): Promise<Data[]> {
    // Ensure only one worker fetches a page at a time
    while (isFetchingPage) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    if (!hasMoreData || !inferenceInProgress.value) {
      return [];
    }

    isFetchingPage = true;
    try {
      const pageData = await loadDataPage(currentPage, pageSize);

      if (pageData.length === 0) {
        hasMoreData = false;
        return [];
      }

      // Update total count with actual filtered data count
      totalFilteredCount += pageData.length;
      totalDataCount.value = totalFilteredCount;

      currentPage++;
      return pageData;
    } finally {
      isFetchingPage = false;
    }
  }

  // Helper function to process data points with concurrent pool
  async function processNextInPool(): Promise<void> {
    while (inferenceInProgress.value && hasMoreData) {
      try {
        // Get next page of data
        const pageData = await getNextPageData();

        if (pageData.length === 0) {
          // No more data to process
          break;
        }

        // Process each data point in the current page sequentially within this worker
        for (const dataPoint of pageData) {
          if (!inferenceInProgress.value) break;

          // Atomically increment processed count
          const currentIndex = totalProcessedCount++;

          currentDataIndex.value = currentIndex + 1;
          currentDataText.value = dataPoint.text;
          executionStatus.value = `Processing data point ${currentIndex + 1}...`;
          executionProgress.value = (currentIndex + 1) / totalDataCount.value;

          addLog(
            'info',
            `Processing data point ${currentIndex + 1}: ${dataPoint.text.substring(0, 100)}...`,
          );

          try {
            await processDataPoint(dataPoint, currentIndex);
            addLog('success', `Successfully processed data point ${currentIndex + 1}`);
          } catch (error) {
            addLog(
              'error',
              `Failed to process data point ${currentIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }

      } catch (error) {
        addLog(
          'error',
          `Failed to load page ${currentPage}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        break;
      }
    }
  }

  // Start concurrent workers
  const activeRequests = new Set<Promise<void>>();
  const numWorkers = Math.min(poolSize, 10); // Limit workers to avoid overwhelming the API

  for (let i = 0; i < numWorkers; i++) {
    activeRequests.add(processNextInPool());
  }

  // Wait for all workers to complete
  await Promise.all(Array.from(activeRequests));

  addLog('info', `Completed processing ${totalProcessedCount} data points`);
}

async function processDataPoint(dataPoint: Data, index: number) {
  if (!currentPrompt.value || !openaiClient) {
    throw new Error('Missing prompt or OpenAI client');
  }

  // Generate prompt
  const prompt = processPromptTemplate(currentPrompt.value, dataPoint.text);

  // Process the prompt using Qwen input processor
  const processedPrompt = processQwenInput(prompt);

  // Call VLLM via OpenAI client using general completion API
  const response = await openaiClient.completions.create({
    model: VLLM_MODEL,
    prompt: processedPrompt,
    temperature: 0.1,
    max_tokens: 1000,
  });

  const llmResponse = response.choices[0]?.text;
  if (!llmResponse) {
    throw new Error('Empty response from VLLM server');
  }

  // Log the full response result string to the execution log console
  addLog('info', `Full response for data point ${index + 1}: ${llmResponse}`);

  // Emit raw response for processing by parent component
  emit('raw-response', dataPoint, llmResponse, index);
}



function resolveConflict(choice: 'overwrite' | 'skip' | 'terminate') {
  conflictResolution.value = choice;
  showConflictDialog.value = false;

  // Remember the choice for subsequent conflicts
  if (choice !== 'terminate') {
    rememberConflictChoice.value = true;
  }
}


function stopInference() {
  addLog('warning', 'Inference stopped by user');
  inferenceInProgress.value = false;
}

// Expose methods to parent component
defineExpose({
  startInference,
});
</script>
