import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import type { Prompt } from '@/shared/models/prompt.model';
import promptApi from '@/shared/sdk/prompt.api';
import { useErrorStore } from '@/stores/error.store';

export const usePromptStore = defineStore('prompt', () => {
  const $q = useQuasar();
  const errorStore = useErrorStore();

  // State
  const promptList = ref<Prompt[]>([]);
  const selectedPrompt = ref<Prompt | null>(null);

  // Loading states
  const loading = ref(false);
  const saveLoading = ref(false);
  const deleteLoading = ref(false);

  // Computed
  const hasPrompts = computed(() => promptList.value.length > 0);
  const isEditing = computed(() => !!selectedPrompt.value?.id);

  // Actions
  function selectPrompt(prompt: Prompt) {
    selectedPrompt.value = prompt;
  }

  function clearSelection() {
    selectedPrompt.value = null;
  }

  async function loadPrompts() {
    loading.value = true;
    try {
      const response = await promptApi.listPrompts();
      promptList.value = response;
    } catch (error) {
      errorStore.addError(
        `Failed to load prompts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      loading.value = false;
    }
  }

  async function createPrompt(prompt: { name: string; content: string }) {
    saveLoading.value = true;
    try {
      const newPrompt = await promptApi.createPrompt(prompt);
      promptList.value.unshift(newPrompt);
      selectedPrompt.value = newPrompt;
      $q.notify({
        type: 'positive',
        message: 'Prompt created successfully',
        position: 'top',
      });
      return newPrompt;
    } catch (error) {
      errorStore.addError(
        `Failed to create prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      saveLoading.value = false;
    }
  }

  async function updatePrompt(id: string, prompt: Partial<{ name: string; content: string }>) {
    saveLoading.value = true;
    try {
      const updatedPrompt = await promptApi.updatePrompt(id, prompt);
      const index = promptList.value.findIndex((p) => p.id === id);
      if (index !== -1) {
        promptList.value[index] = updatedPrompt;
      }
      selectedPrompt.value = updatedPrompt;
      $q.notify({
        type: 'positive',
        message: 'Prompt updated successfully',
        position: 'top',
      });
      return updatedPrompt;
    } catch (error) {
      errorStore.addError(
        `Failed to update prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      saveLoading.value = false;
    }
  }

  async function deletePrompt(id: string) {
    deleteLoading.value = true;
    try {
      await promptApi.deletePrompt(id);
      const index = promptList.value.findIndex((p) => p.id === id);
      if (index !== -1) {
        promptList.value.splice(index, 1);
      }
      if (selectedPrompt.value?.id === id) {
        selectedPrompt.value = null;
      }
      $q.notify({
        type: 'positive',
        message: 'Prompt deleted successfully',
        position: 'top',
      });
    } catch (error) {
      errorStore.addError(
        `Failed to delete prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    } finally {
      deleteLoading.value = false;
    }
  }

  async function savePrompt(prompt: Partial<Prompt>) {
    if (selectedPrompt.value?.id) {
      // Update existing prompt
      await updatePrompt(selectedPrompt.value.id, prompt);
    } else {
      // Create new prompt
      if (prompt.name && prompt.content !== undefined) {
        await createPrompt({ name: prompt.name, content: prompt.content });
      }
    }
  }

  return {
    // State
    promptList,
    selectedPrompt,
    loading,
    saveLoading,
    deleteLoading,

    // Computed
    hasPrompts,
    isEditing,

    // Actions
    selectPrompt,
    clearSelection,
    loadPrompts,
    createPrompt,
    updatePrompt,
    deletePrompt,
    savePrompt,
  };
});
