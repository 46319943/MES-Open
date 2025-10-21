<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card class="q-pa-md" style="min-width: 500px">
      <q-card-section>
        <div class="text-h6">{{ isEditing ? 'Edit Dataset' : 'Create New Dataset' }}</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="form.name"
            label="Dataset Name *"
            :rules="nameRules"
            outlined
            dense
            :loading="loading"
            hint="Only letters, numbers, and hyphens allowed (no spaces)"
          />

          <q-input
            v-model="form.description"
            label="Description"
            type="textarea"
            outlined
            dense
            rows="3"
            :loading="loading"
            hint="Optional description for this dataset"
          />

          <div class="row justify-end q-gutter-sm q-mt-md">
            <q-btn label="Cancel" color="grey" flat @click="onCancel" :disable="loading" />
            <q-btn
              :label="isEditing ? 'Update' : 'Create'"
              color="primary"
              type="submit"
              :loading="loading"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { DatasetResponse } from '@/shared/api-schemas/dataset.api-schema';
import { CreateDatasetBodySchema } from '@/shared/api-schemas/dataset.api-schema';
import { zodToQuasarRules } from '@/utils/form-helper';

interface Props {
  modelValue: boolean;
  dataset?: DatasetResponse | null;
  loading?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit', data: { name: string; description?: string }): void;
  (e: 'cancel'): void;
}

const props = withDefaults(defineProps<Props>(), {
  dataset: null,
  loading: false,
});

const emit = defineEmits<Emits>();

// Form state
const form = ref({
  name: '',
  description: '',
});

// Computed properties
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isEditing = computed(() => !!props.dataset);

// Form validation rules
const nameRules = [zodToQuasarRules(CreateDatasetBodySchema, ['name'])];

// Watch for dataset changes to populate form
watch(
  () => props.dataset,
  (newDataset) => {
    if (newDataset) {
      form.value = {
        name: newDataset.name,
        description: newDataset.description || '',
      };
    } else {
      form.value = {
        name: '',
        description: '',
      };
    }
  },
  { immediate: true },
);

// Watch for dialog opening to reset form if creating new
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen && !props.dataset) {
      form.value = {
        name: '',
        description: '',
      };
    }
  },
);

// Methods
const onSubmit = () => {
  const submitData = {
    name: form.value.name.trim(),
    description: form.value.description.trim() || undefined,
  };

  emit('submit', submitData);
};

const onCancel = () => {
  emit('cancel');
  isOpen.value = false;
};
</script>
