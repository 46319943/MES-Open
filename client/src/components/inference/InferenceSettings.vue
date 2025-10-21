<template>
  <div class="q-gutter-md">
    <!-- Dataset Selection -->
    <div class="q-gutter-sm">
      <div class="text-subtitle2 q-mb-sm">Input Dataset</div>
      <q-select v-model="selectedDataset" :options="datasetOptions" option-label="name" option-value="id" outlined dense
        label="Select Dataset" :loading="datasetsLoading" :rules="[(val) => !!val || 'Dataset is required']"
        @update:model-value="handleDatasetChange">
        <template v-slot:option="scope">
          <q-item v-bind="scope.itemProps">
            <q-item-section>
              <q-item-label>{{ scope.opt.name }}</q-item-label>
              <q-item-label caption>{{ scope.opt.length }} items</q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-select>
    </div>

    <!-- Mode Selection -->
    <div class="q-gutter-sm">
      <div class="text-subtitle2 q-mb-sm">Inference Mode</div>
      <q-option-group v-model="selectedMode" :options="modeOptions" color="primary" inline
        @update:model-value="handleModeChange" />
      <div class="text-caption text-grey-6">
        <div v-if="selectedMode === 'validation'">
          <strong>Validation Mode:</strong> Compare predictions with existing annotations to
          calculate metrics
        </div>
        <div v-else-if="selectedMode === 'inference'">
          <strong>Inference Mode:</strong> Generate new annotations and update the dataset
        </div>
      </div>
    </div>

    <!-- Pool Settings -->
    <div class="q-gutter-sm">
      <div class="text-subtitle2 q-mb-sm">Concurrency Settings</div>
      <q-input v-model.number="poolSize" type="number" outlined dense label="Pool Size" :min="1" :max="100"
        :rules="[(val) => (val > 0 && val <= 100) || 'Pool size must be between 1 and 100']"
        @update:model-value="handlePoolSizeChange" />
      <div class="text-caption text-grey-6">
        Number of concurrent inference requests to process simultaneously
      </div>
    </div>

    <!-- Dataset Information -->
    <q-card v-if="selectedDataset" flat bordered>
      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">Dataset Information</div>
        <div class="q-gutter-sm">
          <div class="row">
            <div class="col-4 text-weight-medium">Name:</div>
            <div class="col-8">{{ selectedDataset.name }}</div>
          </div>
          <div class="row">
            <div class="col-4 text-weight-medium">Description:</div>
            <div class="col-8">{{ selectedDataset.description || 'No description' }}</div>
          </div>
          <div class="row">
            <div class="col-4 text-weight-medium">Total Items:</div>
            <div class="col-8">{{ selectedDataset.length }}</div>
          </div>
          <div v-if="datasetStats && selectedMode === 'validation'" class="row">
            <div class="col-4 text-weight-medium">Items with Annotations:</div>
            <div class="col-8">{{ datasetStats.withAnnotations }}</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Start Inference Button -->
    <div class="row">
      <q-btn color="primary" icon="psychology" label="Start Inference" size="md" @click="handleStartInference"
        :disable="!canStartInference" class="col" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { VLLM_POOL_SIZE } from '@/config';
import type { DatasetResponse } from '@/shared/api-schemas/dataset.api-schema';
import dataApi from '@/shared/sdk/data.api';
import datasetApi from '@/shared/sdk/dataset.api';
import { useQuasar } from 'quasar';
import { computed, onMounted, ref } from 'vue';
import type { DatasetStats, InferenceSettings } from './inference.types';

defineOptions({
  name: 'InferenceSettings',
});

// Emits
const emit = defineEmits<{
  'settings-changed': [settings: InferenceSettings];
  'start-inference': [];
}>();

const $q = useQuasar();

// Component state
const selectedDataset = ref<DatasetResponse | null>(null);
const selectedMode = ref<'validation' | 'inference'>('validation');
const poolSize = ref(VLLM_POOL_SIZE);
const datasetOptions = ref<DatasetResponse[]>([]);
const datasetsLoading = ref(false);
const datasetStats = ref<DatasetStats | null>(null);

// Mode options
const modeOptions = [
  { label: 'Validation Mode', value: 'validation' },
  { label: 'Inference Mode', value: 'inference' },
];

// Computed
const canStartInference = computed(() => {
  return selectedDataset.value && selectedMode.value && poolSize.value > 0;
});

const currentSettings = computed<InferenceSettings | null>(() => {
  if (!selectedDataset.value) return null;

  return {
    dataset: selectedDataset.value,
    mode: selectedMode.value,
    poolSize: poolSize.value,
  };
});

// Methods
async function loadDatasets() {
  datasetsLoading.value = true;
  try {
    const response = await datasetApi.listDatasets();
    datasetOptions.value = response.datasets;
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to load datasets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      position: 'top',
    });
  } finally {
    datasetsLoading.value = false;
  }
}

async function loadDatasetStats(dataset: DatasetResponse) {
  try {
    // Load first page to get total count
    const response = await dataApi.listData(dataset.id, { page: 1, limit: 1 });
    const total = response.pagination.total || 0;

    // For validation mode, we need to count items with annotations
    let withAnnotations = 0;
    if (selectedMode.value === 'validation' && total > 0) {
      // Load all items to count those with annotations
      // TODO: This is not efficient for large datasets. Consider adding a server-side endpoint for this.
      withAnnotations = (await dataApi.listData(dataset.id, { page: 1, limit: 1, filterByPopulatedSegments: true })).pagination.total;
    }

    datasetStats.value = { total, withAnnotations };
  } catch (error) {
    console.error('Failed to load dataset stats:', error);
    datasetStats.value = null;
  }
}

async function handleDatasetChange() {
  if (selectedDataset.value) {
    await loadDatasetStats(selectedDataset.value);
  } else {
    datasetStats.value = null;
  }
  emitSettingsChange();
}

function handleModeChange() {
  // Reload dataset stats when mode changes (affects withAnnotations count)
  if (selectedDataset.value) {
    void loadDatasetStats(selectedDataset.value);
  }
  emitSettingsChange();
}

function handlePoolSizeChange() {
  emitSettingsChange();
}

function emitSettingsChange() {
  if (currentSettings.value) {
    emit('settings-changed', currentSettings.value);
  }
}

function handleStartInference() {
  if (!canStartInference.value) {
    $q.notify({
      type: 'negative',
      message: 'Please configure all settings before starting inference',
      position: 'top',
    });
    return;
  }

  if (selectedMode.value === 'validation' && datasetStats.value?.withAnnotations === 0) {
    $q.notify({
      type: 'negative',
      message: 'Validation mode requires data items with existing annotations',
      position: 'top',
    });
    return;
  }

  emit('start-inference');
}

// Lifecycle
onMounted(async () => {
  await loadDatasets();
});
</script>
