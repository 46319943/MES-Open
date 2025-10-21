<template>
  <q-btn flat color="secondary" icon="download" label="Export Data" :loading="isExporting" :disable="isExporting"
    class="full-width">
    <q-popup-proxy v-model="showExportOptions" :offset="[0, 5]" transition-show="scale" transition-hide="scale">
      <q-list style="min-width: 200px">
        <q-item clickable @click="handleExport('json')">
          <q-item-section avatar>
            <q-icon name="code" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Export as JSON</q-item-label>
            <q-item-label caption>All data in one file</q-item-label>
          </q-item-section>
        </q-item>
        <q-separator />
        <q-item clickable @click="handleExport('jsonl')">
          <q-item-section avatar>
            <q-icon name="article" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Export as JSONL</q-item-label>
            <q-item-label caption>Streaming export (memory efficient)</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-popup-proxy>
  </q-btn>
</template>

<script setup lang="ts">
import type { Data } from '@/shared/models/data.model';
import dataApi from '@/shared/sdk/data.api';
import { useQuasar } from 'quasar';
import { ref } from 'vue';

interface Props {
  datasetId: string;
}

defineOptions({
  name: 'DataExport',
});

const props = defineProps<Props>();
const $q = useQuasar();

const isExporting = ref(false);
const showExportOptions = ref(false);
const PAGE_LIMIT = 5000;

async function fetchAllData(datasetId: string): Promise<Data[]> {
  const allData: Data[] = [];
  let currentPage = 1;
  let hasNext = true;

  while (hasNext) {
    try {
      const response = await dataApi.listData(datasetId, {
        page: currentPage,
        limit: PAGE_LIMIT,
      });

      allData.push(...response.data);
      hasNext = response.pagination.hasNext;
      currentPage++;

      // Show progress to user
      $q.loading.show({
        message: `Fetching data... Page ${currentPage - 1} (${allData.length} items loaded)`,
      });
    } catch (error) {
      $q.loading.hide();
      throw error;
    }
  }

  return allData;
}

function downloadJsonFile(data: Data[], filename: string) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

async function downloadJsonlFileStream(datasetId: string, filename: string) {
  let currentPage = 1;
  let hasNext = true;
  let totalExported = 0;
  const chunks: string[] = [];

  // Create a writable stream using File System Access API or fallback to blob
  const supportsFileSystemAccess = 'showSaveFilePicker' in window;

  if (supportsFileSystemAccess) {
    try {
      // Use File System Access API for true streaming
      const fileHandle = await (window as unknown as { showSaveFilePicker: (options: { suggestedName: string; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<{ createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }> }> }).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'JSONL files',
          accept: { 'application/x-jsonlines': ['.jsonl'] }
        }]
      });

      const writable = await fileHandle.createWritable();

      while (hasNext) {
        try {
          const response = await dataApi.listData(datasetId, {
            page: currentPage,
            limit: PAGE_LIMIT,
          });

          // Process each data item and write to stream
          for (const dataItem of response.data) {
            const jsonlLine = JSON.stringify(dataItem) + '\n';
            await writable.write(jsonlLine);
            totalExported++;
          }

          hasNext = response.pagination.hasNext;
          currentPage++;

          // Update progress
          $q.loading.show({
            message: `Exporting JSONL... Page ${currentPage - 1} (${totalExported} items exported)`,
          });
        } catch (error) {
          await writable.close();
          throw error;
        }
      }

      await writable.close();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        // User cancelled the save dialog
        return { success: false, cancelled: true };
      }
      throw error;
    }
  } else {
    // Fallback: collect in chunks and download as blob
    while (hasNext) {
      const response = await dataApi.listData(datasetId, {
        page: currentPage,
        limit: PAGE_LIMIT,
      });

      // Process each data item and add to chunks
      for (const dataItem of response.data) {
        const jsonlLine = JSON.stringify(dataItem) + '\n';
        chunks.push(jsonlLine);
        totalExported++;
      }

      hasNext = response.pagination.hasNext;
      currentPage++;

      // Update progress
      $q.loading.show({
        message: `Exporting JSONL... Page ${currentPage - 1} (${totalExported} items exported)`,
      });
    }

    // Download as blob
    const blob = new Blob(chunks, { type: 'application/x-jsonlines' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  }

  return { success: true, totalExported };
}

async function handleExport(fileType: 'json' | 'jsonl') {
  if (!props.datasetId) {
    $q.notify({
      type: 'negative',
      message: 'Dataset ID is required for export',
      position: 'top',
    });
    return;
  }

  // Close the popup
  showExportOptions.value = false;
  isExporting.value = true;

  try {
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const extension = fileType === 'json' ? 'json' : 'jsonl';
    const filename = `dataset-${props.datasetId}-${timestamp}.${extension}`;

    if (fileType === 'json') {
      // JSON export - load all data into memory
      $q.loading.show({
        message: 'Starting JSON export...',
      });

      const allData = await fetchAllData(props.datasetId);

      if (allData.length === 0) {
        $q.notify({
          type: 'warning',
          message: 'No data found in this dataset to export',
          position: 'top',
        });
        return;
      }

      downloadJsonFile(allData, filename);

      $q.notify({
        type: 'positive',
        message: `Successfully exported ${allData.length} items as JSON`,
        position: 'top',
      });
    } else {
      // JSONL export - streaming
      $q.loading.show({
        message: 'Starting JSONL export...',
      });

      const result = await downloadJsonlFileStream(props.datasetId, filename);

      if (result.cancelled) {
        $q.notify({
          type: 'info',
          message: 'Export cancelled by user',
          position: 'top',
        });
        return;
      }

      $q.notify({
        type: 'positive',
        message: `Successfully exported ${result.totalExported} items as JSONL`,
        position: 'top',
      });
    }
  } catch (error) {
    console.error('Export failed:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to export data. Please try again.',
      position: 'top',
    });
  } finally {
    $q.loading.hide();
    isExporting.value = false;
  }
}
</script>

<style scoped></style>
