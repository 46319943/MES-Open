<template>
  <q-page :style-fn="pageStyleFn" class="column no-wrap tw:pb-[56px]">
    <!-- Page Header -->
    <q-card flat class="bg-primary text-white">
      <q-card-section>
        <div class="text-h6">Model Inference</div>
        <div class="text-caption">Select a fine-tuned model and perform inference</div>
      </q-card-section>
    </q-card>

    <!-- Main Content -->
    <q-splitter
      v-model="splitterModel"
      :limits="[30, 70]"
      separator-class="bg-grey-3"
      separator-style="width: 1px"
      class="col"
    >
      <!-- Left Section: Fine-Tuned Model Management -->
      <template v-slot:before>
        <FineTuneManagement />
      </template>

      <!-- Right Section: VLLM Server & Inference -->
      <template v-slot:after>
        <div class="column no-wrap">
          <div
            v-if="!fineTuneStore.selectedFineTune"
            class="text-center q-py-xl full-height flex items-center justify-center"
          >
            <div>
              <q-icon name="psychology" size="4em" color="grey-4" />
              <div class="text-h6 q-mt-md q-mb-sm text-grey-6">Select a Fine-Tuned Model</div>
              <p class="text-grey-5">Choose a completed fine-tuned model to start inference</p>
            </div>
          </div>

          <div v-else class="column full-height">
            <!-- VLLM Server Control Section -->
            <q-card flat class="q-ma-md">
              <q-card-section class="bg-grey-1">
                <div class="text-subtitle2">VLLM Server Control</div>
              </q-card-section>
              <q-card-section>
                <VLLMServerControl
                  :inference-fine-tune="inferenceFineTune"
                  @server-status-changed="(isRunning) => vllmServerRunning = isRunning"
                  @server-start-initiated="(fineTune) => inferenceFineTune = fineTune"
                  @server-stopped="inferenceFineTune= null"
                />
              </q-card-section>
            </q-card>

            <!-- Inference Settings Section -->
            <q-card v-if="vllmServerRunning" flat class="q-ma-md">
              <q-card-section class="bg-grey-1">
                <div class="text-subtitle2">Inference Settings</div>
              </q-card-section>
              <q-card-section>
                <InferenceSetting
                  @settings-changed="(settings) => inferenceSettings = settings"
                  @start-inference="handleStartInference"
                />
              </q-card-section>
            </q-card>

            <!-- Progress & Results Section -->
            <q-card v-if="hasStartedInference" flat class="col q-ma-md">
              <q-card-section class="bg-grey-1">
                <div class="text-subtitle2">Progress & Results</div>
              </q-card-section>
            </q-card>
            <q-card-section class="col tw:overflow-y-auto">
              <InferenceExecution
              v-if="inferenceFineTune && inferenceSettings"
                ref="inferenceExecutionRef"
                :selected-fine-tune="inferenceFineTune"
                :inference-settings="inferenceSettings"
                @raw-response="handleRawResponse"
                @inference-completed="handleInferenceCompleted"
              />
              <InferenceResultProcessor
                v-if="inferenceFineTune && inferenceSettings"
                ref="resultProcessorRef"
                :selected-fine-tune="inferenceFineTune"
                :inference-settings="inferenceSettings"
              />
            </q-card-section>
          </div>
        </div>
      </template>
    </q-splitter>

    <!-- Console Logger - Sticky at bottom -->
    <div class="console-container">
      <ConsoleLogger :height="250" :default-expanded="false" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import ConsoleLogger from '@/components/common/ConsoleLogger.vue';
import FineTuneManagement from '@/components/fine-tune/FineTuneManagement.vue';
import type { InferenceSettings } from '@/components/inference/inference.types';
import InferenceExecution from '@/components/inference/InferenceExecution.vue';
import InferenceResultProcessor from '@/components/inference/InferenceResultProcessor.vue';
import InferenceSetting from '@/components/inference/InferenceSettings.vue';
import VLLMServerControl from '@/components/inference/VLLMServerControl.vue';
import type { Data } from '@/shared/models/data.model';
import type { FineTuneRecord } from 'src/local/models/fine-tune.model';
import { useFineTuneStore } from '@/stores/fine-tune.store';
import { pageStyleFn } from '@/utils/page-height';
import { onMounted, ref, watch } from 'vue';

defineOptions({
  name: 'ModelInferPage',
});

// Store
const fineTuneStore = useFineTuneStore();

// Local storage cache key
const INFERENCE_FINETUNE_CACHE_KEY = 'model-infer-page-inference-finetune';

// Component state
const splitterModel = ref(40);
const vllmServerRunning = ref(false);
const inferenceSettings = ref<InferenceSettings | null>(null);
const hasStartedInference = ref(false);

// Template refs for components
const inferenceExecutionRef = ref<{ startInference: () => Promise<void> } | null>(null);
const resultProcessorRef = ref<{
  handleRawResponse: (dataPoint: Data, response: string, index: number) => void;
  finalizeResults: () => void;
  reset: () => void;
} | null>(null);

// Fixed fine-tune object for inference operations
// This gets set when VLLM server starts and remains fixed until server stops
const inferenceFineTune = ref<FineTuneRecord | null>(null);

// Cache utility functions
function saveInferenceFineTuneToCache(fineTune: FineTuneRecord | null) {
  try {
    if (fineTune) {
      // Convert dates to ISO strings for JSON serialization
      const serializedFineTune = {
        ...fineTune,
        created_at: fineTune.created_at.toISOString(),
        updated_at: fineTune.updated_at.toISOString(),
      };
      localStorage.setItem(INFERENCE_FINETUNE_CACHE_KEY, JSON.stringify(serializedFineTune));
    } else {
      localStorage.removeItem(INFERENCE_FINETUNE_CACHE_KEY);
    }
  } catch (error) {
    console.warn('Failed to save inference fine-tune to cache:', error);
  }
}

function loadInferenceFineTuneFromCache(): FineTuneRecord | null {
  try {
    const cached = localStorage.getItem(INFERENCE_FINETUNE_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Convert ISO strings back to Date objects
      return {
        ...parsed,
        created_at: new Date(parsed.created_at),
        updated_at: new Date(parsed.updated_at),
      };
    }
  } catch (error) {
    console.warn('Failed to load inference fine-tune from cache:', error);
    // Clear corrupted cache
    localStorage.removeItem(INFERENCE_FINETUNE_CACHE_KEY);
  }
  return null;
}


async function handleStartInference() {
  hasStartedInference.value = true;

  // Reset the result processor
  if (resultProcessorRef.value) {
    resultProcessorRef.value.reset();
  }

  // Call the startInference method on the child component
  if (inferenceExecutionRef.value) {
    await inferenceExecutionRef.value.startInference();
  }
}

function handleInferenceCompleted() {
  // Finalize results in the processor
  if (resultProcessorRef.value) {
    resultProcessorRef.value.finalizeResults();
  }
}

function handleRawResponse(dataPoint: Data, response: string, index: number) {
  // Pass raw response to the result processor
  if (resultProcessorRef.value) {
    resultProcessorRef.value.handleRawResponse(dataPoint, response, index);
  }
}

// Load cached inference fine-tune on component mount
onMounted(() => {
  const cachedFineTune = loadInferenceFineTuneFromCache();
  if (cachedFineTune) {
    inferenceFineTune.value = cachedFineTune;
  }
});

// Watch for changes to inferenceFineTune and save to cache
watch(
  inferenceFineTune,
  (newValue) => {
    saveInferenceFineTuneToCache(newValue);
  },
  { deep: true }
);
</script>

<style scoped>
.console-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}
</style>
