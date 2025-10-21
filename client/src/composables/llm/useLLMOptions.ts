import { ref, computed, watch } from 'vue';
import {
  LLMBackendAndModelMapping,
  type LLMBackend,
  type LLMModel,
} from 'src/shared/models/llm.model';

export function useLLMOptions() {
  // Create backend options as a plain object (non-reactive)
  const backendOptions = Object.keys(LLMBackendAndModelMapping).map((backend) => ({
    label: backend.charAt(0).toUpperCase() + backend.slice(1), // Capitalize first letter
    value: backend,
  }));

  // Create refs for selected backend and model
  const selectedBackend = ref<LLMBackend | null | undefined>(undefined);
  const selectedModel = ref<LLMModel | null | undefined>(undefined);

  // Create a computed property for model options that updates based on the selected backend
  const modelOptions = computed(() => {
    if (!selectedBackend.value) return [];

    const models = LLMBackendAndModelMapping[selectedBackend.value];
    return models.map((model) => ({
      label: model
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '), // Convert 'model-name' to 'Model Name'
      value: model,
    }));
  });

  // Watch for backend changes and set default model
  watch(selectedBackend, (newBackend) => {
    if (!newBackend) {
      selectedModel.value = null;
      return;
    }

    const models = LLMBackendAndModelMapping[newBackend];
    if (models && models.length > 0) {
      selectedModel.value = models[0];
    } else {
      selectedModel.value = null;
      console.warn(`No models available for backend: ${newBackend}`);
    }
  });

  // Helper function to validate if a model is valid for a given backend
  const isModelValidForBackend = (backend: LLMBackend, model: LLMModel): boolean => {
    return (LLMBackendAndModelMapping[backend] as readonly LLMModel[]).includes(model);
  };

  return {
    backendOptions,
    modelOptions,
    selectedBackend,
    selectedModel,
    isModelValidForBackend,
  };
}
