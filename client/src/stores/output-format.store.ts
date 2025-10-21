import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import type { OutputFormat } from '@/shared/models/output-format.model';
import type {
  CreateOutputFormatBody,
  UpdateOutputFormatBody,
} from '@/shared/api-schemas/output-format.api-schema';
import { useErrorStore } from '@/stores/error.store';
import outputFormatApi from '@/shared/sdk/output-format.api';

export const useOutputFormatStore = defineStore('outputFormat', () => {
  const $q = useQuasar();
  const errorStore = useErrorStore();

  // State
  const outputFormats = ref<OutputFormat[]>([]);
  const selectedOutputFormat = ref<OutputFormat | null>(null);

  // Loading states
  const loading = ref(false);
  const saveLoading = ref(false);
  const deleteLoading = ref(false);

  // Computed
  const hasOutputFormats = computed(() => outputFormats.value.length > 0);
  const sortedOutputFormats = computed(() =>
    [...outputFormats.value].sort((a, b) => a.name.localeCompare(b.name)),
  );

  // Actions
  function selectOutputFormat(outputFormat: OutputFormat | null) {
    selectedOutputFormat.value = outputFormat;
  }

  function clearSelection() {
    selectedOutputFormat.value = null;
  }

  async function loadOutputFormats() {
    loading.value = true;
    try {
      const response = await outputFormatApi.listOutputFormats();
      outputFormats.value = response;
    } catch (error) {
      errorStore.addError(
        `Failed to load output formats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      loading.value = false;
    }
  }

  async function createOutputFormat(data: CreateOutputFormatBody) {
    saveLoading.value = true;
    try {
      const response = await outputFormatApi.createOutputFormat(data);
      outputFormats.value.push(response);
      selectedOutputFormat.value = response;

      $q.notify({
        type: 'positive',
        message: 'Output format created successfully',
        position: 'top',
      });

      return response;
    } catch (error) {
      errorStore.addError(
        `Failed to create output format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      saveLoading.value = false;
    }
  }

  async function updateOutputFormat(id: string, data: UpdateOutputFormatBody) {
    saveLoading.value = true;
    try {
      const response = await outputFormatApi.updateOutputFormat(id, data);

      // Update the output format in the list
      const index = outputFormats.value.findIndex((item) => item.id === id);
      if (index !== -1) {
        outputFormats.value[index] = response;
      }
      selectedOutputFormat.value = response;

      $q.notify({
        type: 'positive',
        message: 'Output format updated successfully',
        position: 'top',
      });

      return response;
    } catch (error) {
      errorStore.addError(
        `Failed to update output format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      saveLoading.value = false;
    }
  }

  async function deleteOutputFormat(id: string) {
    deleteLoading.value = true;
    try {
      await outputFormatApi.deleteOutputFormat(id);

      // Remove from list
      outputFormats.value = outputFormats.value.filter((item) => item.id !== id);

      // Clear selection if deleted item was selected
      if (selectedOutputFormat.value?.id === id) {
        selectedOutputFormat.value = null;
      }

      $q.notify({
        type: 'positive',
        message: 'Output format deleted successfully',
        position: 'top',
      });
    } catch (error) {
      errorStore.addError(
        `Failed to delete output format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      deleteLoading.value = false;
    }
  }

  return {
    // State
    outputFormats,
    selectedOutputFormat,
    loading,
    saveLoading,
    deleteLoading,

    // Computed
    hasOutputFormats,
    sortedOutputFormats,

    // Actions
    selectOutputFormat,
    clearSelection,
    loadOutputFormats,
    createOutputFormat,
    updateOutputFormat,
    deleteOutputFormat,
  };
});
