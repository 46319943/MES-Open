<template>
  <q-page :style-fn="pageStyleFn">
    <div class="row no-wrap full-height">
      <!-- Left Section - Output Format Management -->
      <OutputFormatManager class="col-4 tw:border-r tw:border-gray-300 full-height" />

      <!-- Middle Section - Data Preview -->
      <div class="col-4 tw:border-r tw:border-gray-300 full-height column">
        <q-card-section class="bg-secondary text-white">
          <div class="text-h6">Data Preview</div>
        </q-card-section>

        <DataList
          class="q-pa-none col tw:shrink tw:min-h-0"
          @select-data="handleDataSelection"
          @create-data="() => {}"
          @import-data="() => {}"
        />
      </div>

      <!-- Right Section - Output Preview -->
      <OutputFormatPreview class="col-4 full-height" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useDataStore } from '@/stores/data.store';
import { useDatasetStore } from '@/stores/dataset.store';
import OutputFormatManager from '@/components/output-format/OutputFormatManager.vue';
import OutputFormatPreview from '@/components/output-format/OutputFormatPreview.vue';
import DataList from '@/components/data/DataList.vue';
import { pageStyleFn } from '@/utils/page-height';
import type { Data } from '@/shared/models/data.model';

defineOptions({
  name: 'OutputFormatManagementPage',
});

const dataStore = useDataStore();
const datasetStore = useDatasetStore();

// Event handlers
function handleDataSelection(data: Data) {
  dataStore.selectData(data);
}

// Lifecycle
onMounted(async () => {
  // Load datasets for the data preview section
  await datasetStore.loadDatasets();

  // If there's a current dataset, load its data
  if (dataStore.currentDataset) {
    await dataStore.loadData(1);
  }
});
</script>
