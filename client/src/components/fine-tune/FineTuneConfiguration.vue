<template>
  <q-card flat class="column full-height">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">Fine-Tuning Configuration</div>
      <div class="text-caption">Configure and start model fine-tuning</div>
    </q-card-section>

    <q-card-section class="col tw:overflow-y-auto tw:shrink tw:min-h-0">
      <q-form @submit="handleSubmit" class="q-gutter-md">
        <!-- Dataset Selection -->
        <div>
          <div class="text-subtitle2 q-mb-sm">Dataset Selection</div>
          <q-select
            v-model="selectedDatasets"
            :options="datasetStore.sortedDatasets"
            option-label="name"
            option-value="id"
            multiple
            outlined
            dense
            label="Select Datasets for Training"
            :loading="datasetStore.loading"
            :rules="[(val) => (val && val.length > 0) || 'Please select at least one dataset']"
            emit-value
            map-options
          >
            <template v-slot:selected-item="scope">
              <q-chip
                removable
                dense
                @remove="scope.removeAtIndex(scope.index)"
                :tabindex="scope.tabindex"
                color="primary"
                text-color="white"
              >
                {{ getDatasetDisplayNameFromObject(scope.opt) }}
              </q-chip>
            </template>

            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.name }}</q-item-label>
                  <q-item-label caption
                    >{{ getDatasetLengthDisplay(scope.opt.id) }} items</q-item-label
                  >
                </q-item-section>
              </q-item>
            </template>

            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> No datasets available </q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>

        <!-- Prompt Selection -->
        <div>
          <div class="text-subtitle2 q-mb-sm">Prompt Template</div>
          <q-select
            v-model="selectedPrompt"
            :options="promptStore.promptList"
            option-label="name"
            option-value="id"
            outlined
            dense
            label="Select Prompt Template"
            :loading="promptStore.loading"
            :rules="[(val) => !!val || 'Please select a prompt template']"
            emit-value
            map-options
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> No prompt templates available </q-item-section>
              </q-item>
            </template>
          </q-select>
          <div class="text-caption text-grey-6 q-mt-xs">
            The prompt will be used as a template. &#123;&#123; INPUT &#125;&#125; will be replaced
            with the data text, and &#123;&#123; EXAMPLES &#125;&#125; will be removed.
          </div>
        </div>

        <!-- Output Format Selection -->
        <div>
          <div class="text-subtitle2 q-mb-sm">Output Format</div>
          <q-select
            v-model="selectedOutputFormat"
            :options="outputFormatStore.sortedOutputFormats"
            option-label="name"
            option-value="id"
            outlined
            dense
            label="Select Output Format"
            :loading="outputFormatStore.loading"
            :rules="[(val) => !!val || 'Please select an output format']"
            emit-value
            map-options
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> No output formats available </q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-select
            v-model="outputFormatType"
            :options="outputFormatTypeOptions"
            emit-value
            map-options
            outlined
            dense
            label="Output Format Type"
            class="q-mt-sm"
            :rules="[(val) => !!val || 'Please select an output format type']"
          />
          <div class="text-caption text-grey-6 q-mt-xs">
            The selected output format type will be used to generate training data in the corresponding format
          </div>
        </div>

        <!-- Training Settings -->
        <div>
          <div class="text-subtitle2 q-mb-sm">Training Settings</div>

          <q-input
            v-model="trainingConfig.model_name"
            outlined
            dense
            label="Base Model Name"
            :rules="[(val) => !!val || 'Please enter a base model name']"
            hint="e.g., unsloth/Qwen3-14B-unsloth-bnb-4bit"
          />

          <!-- Resume from Fine-tune -->
          <div class="q-mt-sm">
            <q-select
              v-model="trainingConfig.resume_from_finetune"
              :options="completedFineTuneOptions"
              option-label="label"
              option-value="value"
              outlined
              dense
              clearable
              label="Resume from Fine-tune (Optional)"
              :loading="fineTuneStore.loading"
              emit-value
              map-options
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">
                    {{ fineTuneStore.loading ? 'Loading...' : 'No completed fine-tunes available' }}
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <div class="text-caption text-grey-6 q-mt-xs">
              Select a completed fine-tune to resume training from. Only completed fine-tunes can be used as starting points.
            </div>
          </div>

          <div class="row q-gutter-sm q-mt-sm">
            <q-input
              v-model.number="trainingConfig.num_epochs"
              type="number"
              outlined
              dense
              label="Epochs"
              class="col"
              :rules="[(val) => (val >= 1 && val <= 100) || 'Must be between 1 and 100']"
            />
            <q-input
              v-model.number="trainingConfig.batch_size"
              type="number"
              outlined
              dense
              label="Batch Size"
              class="col"
              :rules="[(val) => (val >= 1 && val <= 32) || 'Must be between 1 and 32']"
            />
          </div>

          <div class="row q-gutter-sm q-mt-sm">
            <q-input
              v-model.number="trainingConfig.accumulated_batch_size"
              type="number"
              outlined
              dense
              label="Accumulated Batch Size"
              class="col"
              :rules="[(val) => (val >= 1 && val <= 128) || 'Must be between 1 and 128']"
            />
            <q-input
              v-model.number="trainingConfig.max_seq_length"
              type="number"
              outlined
              dense
              label="Max Sequence Length"
              class="col"
              :rules="[(val) => (val >= 128 && val <= 8192) || 'Must be between 128 and 8192']"
            />
          </div>

          <q-input
            v-model.number="trainingConfig.learning_rate"
            type="number"
            step="0.0001"
            outlined
            dense
            label="Learning Rate"
            class="q-mt-sm"
            :rules="[(val) => (val > 0 && val <= 0.01) || 'Must be between 0 and 0.01']"
          />
        </div>

        <!-- Submit Button -->
        <div class="q-mt-lg">
          <q-btn
            type="submit"
            color="positive"
            icon="play_arrow"
            label="Start Fine-Tuning"
            class="full-width"
            :loading="fineTuneStore.createLoading"
            :disable="!canSubmit"
          />
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import type { TrainingConfig } from 'src/local/models/fine-tune.model';
import type { OutputFormatType } from '@/shared/models/output-format.model';
import { useDataStore } from '@/stores/data.store';
import { useDatasetStore } from '@/stores/dataset.store';
import { useFineTuneStore } from '@/stores/fine-tune.store';
import { useOutputFormatStore } from '@/stores/output-format.store';
import { usePromptStore } from '@/stores/prompt.store';
import { generateCoTString } from '@/utils/cot-generator';
import { generateOrderPreservingJson, generateSensePrioritizedJson } from '@/utils/json-generator.util';
import { processPromptTemplate } from '@/utils/prompt-processor';
import { useQuasar } from 'quasar';
import { computed, onMounted, ref } from 'vue';

defineOptions({
  name: 'FineTuneConfiguration',
});

const $q = useQuasar();
const datasetStore = useDatasetStore();
const outputFormatStore = useOutputFormatStore();
const dataStore = useDataStore();
const fineTuneStore = useFineTuneStore();
const promptStore = usePromptStore();

// Form data
const selectedDatasets = ref<string[]>([]);
const selectedOutputFormat = ref<string>('');
const selectedPrompt = ref<string>('');
const outputFormatType = ref<OutputFormatType>('cot');

const trainingConfig = ref<TrainingConfig>({
  model_name: 'unsloth/Qwen3-14B-unsloth-bnb-4bit',
  num_epochs: 3,
  batch_size: 2,
  accumulated_batch_size: 4,
  max_seq_length: 2048,
  learning_rate: 0.0002,
  resume_from_finetune: undefined,
});

// Output format type options
const outputFormatTypeOptions = [
  { label: 'Sense Prioritized', value: 'sense-prioritized' },
  { label: 'Order Preserving', value: 'order-preserving' },
  { label: 'Chain-of-Thought (CoT)', value: 'cot' },
];

// Dataset length cache
const datasetLengthCache = ref<Record<string, number>>({});

// Computed
const canSubmit = computed(() => {
  return (
    selectedDatasets.value.length > 0 &&
    selectedOutputFormat.value &&
    selectedPrompt.value &&
    outputFormatType.value &&
    trainingConfig.value.model_name.trim() !== ''
  );
});

const completedFineTuneOptions = computed(() => {
  return fineTuneStore.fineTuneList
    .filter((ft) => ft.status === 'completed')
    .map((ft) => ({
      label: `${ft.fine_tune_name} (${ft.data_size} samples)`,
      value: ft.fine_tune_name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

// Methods

function getDatasetDisplayName(datasetId: string): string {
  const dataset = datasetStore.datasetList.find((d) => d.id === datasetId);
  return dataset ? dataset.name : datasetId;
}

function getDatasetDisplayNameFromObject(dataset: string | { name: string; id: string }): string {
  // Handle both object and string cases for robustness
  if (typeof dataset === 'string') {
    return getDatasetDisplayName(dataset);
  }
  return dataset?.name || 'Unknown Dataset';
}

function getDatasetLengthDisplay(datasetId: string): string {
  const cached = datasetLengthCache.value[datasetId];
  if (cached !== undefined) {
    return cached.toString();
  }
  return 'Loading...';
}

// Remove unused function - replaced by getDatasetLengthDisplay

async function loadDatasetLength(datasetId: string) {
  try {
    // Set current dataset temporarily to load its data
    const originalDataset = dataStore.currentDataset;
    const dataset = datasetStore.datasetList.find((d) => d.id === datasetId);
    if (dataset) {
      dataStore.setCurrentDataset(dataset);
      await dataStore.loadData(1);
      datasetLengthCache.value[datasetId] = dataStore.pagination.total;
      // Restore original dataset
      dataStore.setCurrentDataset(originalDataset);
    }
  } catch (error) {
    console.error('Failed to load dataset length:', error);
    datasetLengthCache.value[datasetId] = 0;
  }
}

async function handleSubmit() {
  if (!canSubmit.value) return;

  try {
    // Get the selected output format object
    const outputFormat = outputFormatStore.outputFormats.find(
      (of) => of.id === selectedOutputFormat.value,
    );
    if (!outputFormat) {
      $q.notify({
        type: 'negative',
        message: 'Selected output format not found',
        position: 'top',
      });
      return;
    }

    // Get the selected prompt object
    const prompt = promptStore.promptList.find((p) => p.id === selectedPrompt.value);
    if (!prompt) {
      $q.notify({
        type: 'negative',
        message: 'Selected prompt template not found',
        position: 'top',
      });
      return;
    }

    // Collect training data from selected datasets
    const trainingData: { input: string; output: string }[] = [];
    const datasetNames: string[] = [];

    for (const datasetId of selectedDatasets.value) {
      const dataset = datasetStore.datasetList.find((d) => d.id === datasetId);
      if (!dataset) continue;

      datasetNames.push(dataset.name);

      // Load all data from this dataset
      dataStore.setCurrentDataset(dataset);
      let currentPage = 1;
      let hasMoreData = true;

      while (hasMoreData) {
        await dataStore.loadData(currentPage);

        // Process each data item
        for (const data of dataStore.dataList) {
          // Skip data with empty segments array
          if (!data.segments || data.segments.length === 0) {
            continue;
          }

          // Use prompt template with data text as input
          const input = processPromptTemplate(prompt, data.text);

          // Generate output based on selected format type
          let output: string;
          if (outputFormatType.value === 'sense-prioritized') {
            output = generateSensePrioritizedJson(data, outputFormat);
          } else if (outputFormatType.value === 'order-preserving') {
            output = generateOrderPreservingJson(data, outputFormat);
          } else if (outputFormatType.value === 'cot') {
            // Default to CoT format
            output = generateCoTString(data, outputFormat);
          } else {
            throw new Error('Invalid output format type');
          }

          trainingData.push({ input, output });
        }

        hasMoreData = dataStore.pagination.hasNext;
        currentPage++;
      }
    }

    if (trainingData.length === 0) {
      $q.notify({
        type: 'negative',
        message: 'No training data found in selected datasets',
        position: 'top',
      });
      return;
    }

    // Create metadata with dataset names and IDs
    const meta = {
      datasets: datasetNames,
      output_format: outputFormat.name,
      output_format_type: outputFormatType.value,
      prompt_template: prompt.name,
      promptId: prompt.id,
      outputFormatId: outputFormat.id,
    };

    // Submit fine-tuning request
    await fineTuneStore.createFineTune({
      data: trainingData,
      training_config: trainingConfig.value,
      meta,
    });

    // Reset form
    selectedDatasets.value = [];
    selectedOutputFormat.value = '';
    selectedPrompt.value = '';
    outputFormatType.value = 'cot';
    trainingConfig.value.resume_from_finetune = undefined;
  } catch (error) {
    console.error('Fine-tuning submission failed:', error);
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    datasetStore.loadDatasets(),
    outputFormatStore.loadOutputFormats(),
    promptStore.loadPrompts(),
    fineTuneStore.loadFineTunes(),
  ]);

  // Pre-load dataset lengths to avoid reactive issues
  for (const dataset of datasetStore.datasetList) {
    void loadDatasetLength(dataset.id);
  }
});
</script>
