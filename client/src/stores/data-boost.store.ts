import type { DataBoost } from '@/shared/models/data-boost.model';
import type { Data } from '@/shared/models/data.model';
import dataBoostApi from '@/shared/sdk/data-boost.api';
import { useErrorStore } from '@/stores/error.store';
import { defineStore } from 'pinia';
import { useQuasar } from 'quasar';
import { computed, ref } from 'vue';

export const useDataBoostStore = defineStore('dataBoost', () => {
  const $q = useQuasar();
  const errorStore = useErrorStore();

  // State
  const dataBoostList = ref<DataBoost[]>([]);
  const selectedDataBoost = ref<DataBoost | null>(null);

  // Failed data processing state
  interface FailedDataItem {
    data: Data;
    llmResponse: string;
    error: string;
    dataBoostId: string;
    timestamp: Date;
  }
  const failedDataItems = ref<FailedDataItem[]>([]);

  // Loading states
  const loading = ref(false);
  const saveLoading = ref(false);
  const deleteLoading = ref(false);

  // Computed
  const hasDataBoosts = computed(() => dataBoostList.value.length > 0);
  const sortedDataBoosts = computed(() => {
    return [...dataBoostList.value].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  });
  const isEditing = computed(() => !!selectedDataBoost.value?.id);
  const hasFailedDataItems = computed(() => failedDataItems.value.length > 0);
  const failedDataItemsForCurrentDataBoost = computed(() => {
    if (!selectedDataBoost.value) return [];
    return failedDataItems.value.filter(item => item.dataBoostId === selectedDataBoost.value!.id);
  });

  // Actions
  function selectDataBoost(dataBoost: DataBoost | null) {
    selectedDataBoost.value = dataBoost;
  }

  function clearSelection() {
    selectedDataBoost.value = null;
  }

  // Failed data management actions
  function addFailedDataItem(data: Data, llmResponse: string, error: string, dataBoostId: string) {
    failedDataItems.value.push({
      data,
      llmResponse,
      error,
      dataBoostId,
      timestamp: new Date(),
    });
  }

  function removeFailedDataItem(index: number) {
    if (index >= 0 && index < failedDataItems.value.length) {
      failedDataItems.value.splice(index, 1);
    }
  }

  function clearFailedDataItems(dataBoostId?: string) {
    if (dataBoostId) {
      failedDataItems.value = failedDataItems.value.filter(item => item.dataBoostId !== dataBoostId);
    } else {
      failedDataItems.value = [];
    }
  }

  async function loadDataBoosts() {
    loading.value = true;
    try {
      const response = await dataBoostApi.listDataBoosts();
      dataBoostList.value = response;
      return response;
    } catch (error) {
      errorStore.addError(
        `Failed to load data boosts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createDataBoost(dataBoost: Omit<DataBoost, 'id' | 'createdAt' | 'updatedAt'>) {
    saveLoading.value = true;
    try {
      const newDataBoost = await dataBoostApi.createDataBoost(dataBoost);
      dataBoostList.value.unshift(newDataBoost);
      selectedDataBoost.value = newDataBoost;
      $q.notify({
        type: 'positive',
        message: 'Data boost created successfully',
        position: 'top',
      });
      return newDataBoost;
    } catch (error) {
      errorStore.addError(
        `Failed to create data boost: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      saveLoading.value = false;
    }
  }

  async function updateDataBoost(
    id: string,
    dataBoost: Partial<Omit<DataBoost, 'id' | 'createdAt' | 'updatedAt'>>,
  ) {
    saveLoading.value = true;
    try {
      const updatedDataBoost = await dataBoostApi.updateDataBoost(id, dataBoost);
      const index = dataBoostList.value.findIndex((db) => db.id === id);
      if (index !== -1) {
        dataBoostList.value[index] = updatedDataBoost;
      }
      selectedDataBoost.value = updatedDataBoost;
      $q.notify({
        type: 'positive',
        message: 'Data boost updated successfully',
        position: 'top',
      });
      return updatedDataBoost;
    } catch (error) {
      errorStore.addError(
        `Failed to update data boost: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      saveLoading.value = false;
    }
  }

  async function deleteDataBoost(id: string) {
    deleteLoading.value = true;
    try {
      await dataBoostApi.deleteDataBoost(id);
      const index = dataBoostList.value.findIndex((db) => db.id === id);
      if (index !== -1) {
        dataBoostList.value.splice(index, 1);
      }
      if (selectedDataBoost.value?.id === id) {
        selectedDataBoost.value = null;
      }
      $q.notify({
        type: 'positive',
        message: 'Data boost deleted successfully',
        position: 'top',
      });
    } catch (error) {
      errorStore.addError(
        `Failed to delete data boost: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      deleteLoading.value = false;
    }
  }

  return {
    // State
    dataBoostList,
    selectedDataBoost,
    failedDataItems,
    loading,
    saveLoading,
    deleteLoading,

    // Computed
    hasDataBoosts,
    sortedDataBoosts,
    isEditing,
    hasFailedDataItems,
    failedDataItemsForCurrentDataBoost,

    // Actions
    selectDataBoost,
    clearSelection,
    addFailedDataItem,
    removeFailedDataItem,
    clearFailedDataItems,
    loadDataBoosts,
    createDataBoost,
    updateDataBoost,
    deleteDataBoost,
  };
});
