<template>
  <q-page :style-fn="pageStyleFn">
    <div class="row no-wrap full-height">
      <!-- Left Section - Data Boost Management -->
      <DataBoostManager class="col-6 tw:border-r tw:border-gray-300 full-height" />

      <!-- Right Section - Data Boost Execution and Failed Data Processing -->
      <div class="col-6 column full-height">
        <!-- Data Boost Execution -->
        <DataBoostExecution class="col tw:border-b tw:border-gray-300" />

        <!-- Failed Data Processing -->
        <DataBoostFailedDataProcessor
          v-if="dataBoostStore.hasFailedDataItems"
          class="col tw:shrink-0"
          style="max-height: 50vh"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import DataBoostExecution from '@/components/data-boost/DataBoostExecution.vue';
import DataBoostFailedDataProcessor from '@/components/data-boost/DataBoostFailedDataProcessor.vue';
import DataBoostManager from '@/components/data-boost/DataBoostManager.vue';
import { useDataBoostStore } from '@/stores/data-boost.store';
import { useDatasetStore } from '@/stores/dataset.store';
import { useOutputFormatStore } from '@/stores/output-format.store';
import { usePromptStore } from '@/stores/prompt.store';
import { pageStyleFn } from '@/utils/page-height';
import { onMounted } from 'vue';

defineOptions({
  name: 'DataBoostPage',
});

const dataBoostStore = useDataBoostStore();
const datasetStore = useDatasetStore();
const promptStore = usePromptStore();
const outputFormatStore = useOutputFormatStore();

// Lifecycle
onMounted(async () => {
  // Load all required data for the page
  await Promise.all([
    dataBoostStore.loadDataBoosts(),
    datasetStore.loadDatasets(),
    promptStore.loadPrompts(),
    outputFormatStore.loadOutputFormats(),
  ]);
});
</script>
