import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import type { Data } from '@/shared/models/data.model';
import type { DatasetResponse } from '@/shared/api-schemas/dataset.api-schema';
import { useErrorStore } from '@/stores/error.store';
import dataApi from '@/shared/sdk/data.api';

interface DataPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const useDataStore = defineStore('data', () => {
  const $q = useQuasar();
  const errorStore = useErrorStore();

  // State
  const dataList = ref<Data[]>([]);
  const selectedData = ref<Data | null>(null);
  const currentDataset = ref<DatasetResponse | null>(null);

  // Loading states
  const loading = ref(false);
  const saveLoading = ref(false);
  const deleteLoading = ref(false);

  // Pagination
  const currentPage = ref(1);
  const pageLimit = ref(20);
  const pagination = ref<DataPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  // Sorting
  const sortBy = ref<'createdAt' | 'updatedAt'>('createdAt');
  const sortOrder = ref<'asc' | 'desc'>('desc');

  // Computed
  const hasData = computed(() => dataList.value.length > 0);
  const isEditing = computed(() => !!selectedData.value?.id);

  // Actions
  function setCurrentDataset(dataset: DatasetResponse | null) {
    currentDataset.value = dataset;
    // Reset state when switching datasets
    dataList.value = [];
    selectedData.value = null;
    currentPage.value = 1;
    // Reset sorting to default
    sortBy.value = 'createdAt';
    sortOrder.value = 'desc';
  }

  function selectData(data: Data) {
    selectedData.value = data;
  }

  function clearSelection() {
    selectedData.value = null;
  }

  async function setSorting(newSortBy: 'createdAt' | 'updatedAt', newSortOrder: 'asc' | 'desc') {
    sortBy.value = newSortBy;
    sortOrder.value = newSortOrder;
    // Reload data with new sorting
    await loadData(1);
  }

  async function loadData(page = currentPage.value) {
    if (!currentDataset.value?.id) {
      errorStore.addError('No dataset selected');
      return;
    }

    loading.value = true;
    try {
      const response = await dataApi.listData(currentDataset.value.id, {
        page,
        limit: pageLimit.value,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
      });
      dataList.value = response.data;
      pagination.value = response.pagination;
      currentPage.value = page;
    } catch (error) {
      errorStore.addError(
        `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      loading.value = false;
    }
  }

  async function createData(data: Partial<Data>) {
    if (!currentDataset.value?.id) {
      errorStore.addError('No dataset selected');
      throw new Error('No dataset selected');
    }

    saveLoading.value = true;
    try {
      // Ensure required fields are present for creation
      const dataToCreate = {
        text: data.text || '',
        segments: data.segments || [],
        metaData: data.metaData || {},
      };

      const response = await dataApi.createData(currentDataset.value.id, {
        data: [dataToCreate],
      });

      if (response.data.length > 0) {
        const newData = response.data[0];
        if (newData) {
          dataList.value.unshift(newData);
          selectedData.value = newData;
        }

        $q.notify({
          type: 'positive',
          message: 'Data created successfully',
          position: 'top',
        });
      }
    } catch (error) {
      errorStore.addError(
        `Failed to create data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      saveLoading.value = false;
    }
  }

  async function updateData(id: string, data: Partial<Data>) {
    if (!currentDataset.value?.id) {
      errorStore.addError('No dataset selected');
      throw new Error('No dataset selected');
    }

    saveLoading.value = true;
    try {
      const response = await dataApi.updateData(currentDataset.value.id, id, data);

      // Update the data in the list
      const index = dataList.value.findIndex((item) => item.id === id);
      if (index !== -1) {
        dataList.value[index] = response;
      }
      selectedData.value = response;

      $q.notify({
        type: 'positive',
        message: 'Data updated successfully',
        position: 'top',
      });
    } catch (error) {
      errorStore.addError(
        `Failed to update data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      saveLoading.value = false;
    }
  }

  async function deleteData(id: string) {
    if (!currentDataset.value?.id) {
      errorStore.addError('No dataset selected');
      throw new Error('No dataset selected');
    }

    deleteLoading.value = true;
    try {
      await dataApi.deleteData(currentDataset.value.id, { ids: [id] });

      // Remove from list
      dataList.value = dataList.value.filter((item) => item.id !== id);

      // Clear selection if deleted item was selected
      if (selectedData.value?.id === id) {
        selectedData.value = null;
      }

      $q.notify({
        type: 'positive',
        message: 'Data deleted successfully',
        position: 'top',
      });
    } catch (error) {
      errorStore.addError(
        `Failed to delete data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      deleteLoading.value = false;
    }
  }

  async function saveData(data: Partial<Data>) {
    if (selectedData.value?.id) {
      // Update existing data
      await updateData(selectedData.value.id, data);
    } else {
      // Create new data
      await createData(data);
    }
  }

  return {
    // State
    dataList,
    selectedData,
    currentDataset,
    loading,
    saveLoading,
    deleteLoading,
    currentPage,
    pageLimit,
    pagination,
    sortBy,
    sortOrder,

    // Computed
    hasData,
    isEditing,

    // Actions
    setCurrentDataset,
    selectData,
    clearSelection,
    setSorting,
    loadData,
    createData,
    updateData,
    deleteData,
    saveData,
  };
});
