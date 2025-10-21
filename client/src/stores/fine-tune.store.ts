import type { FineTuneRequest } from 'src/local/api-schemas/fine-tune.api-schema';
import type { FineTuneRecord } from 'src/local/models/fine-tune.model';
import fineTuneApi from 'src/local/sdk/fine-tune.api';
import { useErrorStore } from '@/stores/error.store';
import { defineStore } from 'pinia';
import { useQuasar } from 'quasar';
import { computed, ref } from 'vue';

export const useFineTuneStore = defineStore('fineTune', () => {
  const $q = useQuasar();
  const errorStore = useErrorStore();

  // State
  const fineTuneList = ref<FineTuneRecord[]>([]);
  const selectedFineTune = ref<FineTuneRecord | null>(null);

  // Loading states
  const loading = ref(false);
  const createLoading = ref(false);
  const deleteLoading = ref(false);

  // Computed
  const hasFineTunes = computed(() => fineTuneList.value.length > 0);
  const sortedFineTunes = computed(() => {
    return [...fineTuneList.value].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  });
  const completedFineTunes = computed(() => {
    return fineTuneList.value.filter((ft) => ft.status === 'completed');
  });

  // Actions
  function setSelectedFineTune(fineTune: FineTuneRecord | null) {
    selectedFineTune.value = fineTune;
  }

  async function loadFineTunes() {
    loading.value = true;
    try {
      const response = await fineTuneApi.listFineTunes();
      fineTuneList.value = response;
      return response;
    } catch (error) {
      errorStore.addError(
        `Failed to load fine-tunes: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createFineTune(request: FineTuneRequest) {
    createLoading.value = true;
    try {
      const response = await fineTuneApi.createFineTune(request);
      // Add the new fine-tune to the list (it will be in training status)
      const newFineTune: FineTuneRecord = {
        fine_tune_name: response.fine_tune_name,
        output_path: '', // Will be filled when training completes
        data_size: response.data_size,
        training_config: request.training_config,
        status: 'training',
        created_at: response.created_at,
        updated_at: response.created_at,
        meta: response.meta,
        resumed_from: request.training_config.resume_from_finetune || null,
      };
      fineTuneList.value.unshift(newFineTune);

      $q.notify({
        type: 'positive',
        message: `Fine-tuning started: ${response.fine_tune_name}`,
        position: 'top',
      });
      return response;
    } catch (error) {
      errorStore.addError(
        `Failed to create fine-tune: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      createLoading.value = false;
    }
  }

  async function deleteFineTune(fineTuneName: string) {
    deleteLoading.value = true;
    try {
      await fineTuneApi.deleteFineTune(fineTuneName);
      fineTuneList.value = fineTuneList.value.filter((ft) => ft.fine_tune_name !== fineTuneName);

      // Clear selection if deleted fine-tune was selected
      if (selectedFineTune.value?.fine_tune_name === fineTuneName) {
        selectedFineTune.value = null;
      }

      $q.notify({
        type: 'positive',
        message: `Fine-tune deleted: ${fineTuneName}`,
        position: 'top',
      });
    } catch (error) {
      errorStore.addError(
        `Failed to delete fine-tune: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      deleteLoading.value = false;
    }
  }

  async function refreshFineTune(fineTuneName: string) {
    try {
      const response = await fineTuneApi.getFineTune(fineTuneName);
      const index = fineTuneList.value.findIndex((ft) => ft.fine_tune_name === fineTuneName);
      if (index !== -1) {
        fineTuneList.value[index] = response;
      }
      // Update selected fine-tune if it's the one being refreshed
      if (selectedFineTune.value?.fine_tune_name === fineTuneName) {
        selectedFineTune.value = response;
      }
      return response;
    } catch (error) {
      errorStore.addError(
        `Failed to refresh fine-tune: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  return {
    // State
    fineTuneList,
    selectedFineTune,
    loading,
    createLoading,
    deleteLoading,

    // Computed
    hasFineTunes,
    sortedFineTunes,
    completedFineTunes,

    // Actions
    setSelectedFineTune,
    loadFineTunes,
    createFineTune,
    deleteFineTune,
    refreshFineTune,
  };
});
