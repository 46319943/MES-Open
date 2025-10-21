import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useErrorStore = defineStore('error', () => {
  // State
  const errors = ref<string[]>([]);

  // Actions
  function addError(errorMessage: string) {
    errors.value.push(errorMessage);
  }

  function clearErrors() {
    errors.value = [];
  }

  function removeError(index: number) {
    if (index >= 0 && index < errors.value.length) {
      errors.value.splice(index, 1);
    }
  }

  return {
    errors,
    addError,
    clearErrors,
    removeError,
  };
});
