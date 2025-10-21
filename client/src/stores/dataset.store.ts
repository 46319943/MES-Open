import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import type { DatasetResponse } from '@/shared/api-schemas/dataset.api-schema';
import { useErrorStore } from '@/stores/error.store';
import datasetApi from '@/shared/sdk/dataset.api';

export const useDatasetStore = defineStore('dataset', () => {
  const $q = useQuasar();
  const errorStore = useErrorStore();

  // State
  const datasetList = ref<DatasetResponse[]>([]);
  const currentDataset = ref<DatasetResponse | null>(null);

  // Loading states
  const loading = ref(false);

  // Computed
  const hasDatasets = computed(() => datasetList.value.length > 0);
  const sortedDatasets = computed(() => {
    return [...datasetList.value].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  });

  // Actions
  function setCurrentDataset(dataset: DatasetResponse | null) {
    currentDataset.value = dataset;
  }

  async function loadDatasets() {
    loading.value = true;
    try {
      const response = await datasetApi.listDatasets();
      datasetList.value = response.datasets;
      return response.datasets;
    } catch (error) {
      errorStore.addError(
        `Failed to load datasets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createDataset(data: { name: string; description?: string }) {
    loading.value = true;
    try {
      const response = await datasetApi.createDataset(data);
      datasetList.value.push(response);
      $q.notify({
        type: 'positive',
        message: 'Dataset created successfully',
        position: 'top',
      });
      return response;
    } catch (error) {
      errorStore.addError(
        `Failed to create dataset: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updateDataset(id: string, data: { name?: string; description?: string }) {
    loading.value = true;
    try {
      const response = await datasetApi.updateDataset(id, data);
      const index = datasetList.value.findIndex((dataset) => dataset.id === id);
      if (index !== -1) {
        datasetList.value[index] = response;
      }
      // Update current dataset if it's the one being updated
      if (currentDataset.value?.id === id) {
        currentDataset.value = response;
      }
      $q.notify({
        type: 'positive',
        message: 'Dataset updated successfully',
        position: 'top',
      });
      return response;
    } catch (error) {
      errorStore.addError(
        `Failed to update dataset: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function deleteDataset(id: string) {
    loading.value = true;
    try {
      await datasetApi.deleteDataset(id);
      datasetList.value = datasetList.value.filter((dataset) => dataset.id !== id);
      // Clear current dataset if it's the one being deleted
      if (currentDataset.value?.id === id) {
        currentDataset.value = null;
      }
      $q.notify({
        type: 'positive',
        message: 'Dataset deleted successfully',
        position: 'top',
      });
    } catch (error) {
      errorStore.addError(
        `Failed to delete dataset: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function getDatasetById(id: string): Promise<DatasetResponse | null> {
    try {
      const response = await datasetApi.getDataset(id);
      return response;
    } catch (error) {
      errorStore.addError(
        `Failed to load dataset: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  return {
    // State
    datasetList,
    currentDataset,
    loading,

    // Computed
    hasDatasets,
    sortedDatasets,

    // Actions
    setCurrentDataset,
    loadDatasets,
    createDataset,
    updateDataset,
    deleteDataset,
    getDatasetById,
  };
});
