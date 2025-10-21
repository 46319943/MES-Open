<template>
  <q-card flat class="column">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">
        Data Boost Management
        <q-badge v-if="isCreatingNew" color="accent" class="q-ml-sm"> Creating New </q-badge>
      </div>
    </q-card-section>

    <q-card-section class="col tw:overflow-y-auto tw:shrink tw:min-h-0">
      <!-- Data Boost Selection and Actions -->
      <div class="q-mb-md">
        <div class="row q-gutter-sm q-mb-md">
          <q-select
            v-model="selectedDataBoostId"
            :options="dataBoostStore.sortedDataBoosts"
            option-label="name"
            option-value="id"
            emit-value
            map-options
            outlined
            dense
            label="Select Data Boost"
            class="col"
            :loading="dataBoostStore.loading"
            @update:model-value="handleDataBoostChange"
            :disable="isCreatingNew"
            clearable
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> No data boosts available </q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>

        <div class="row q-gutter-sm">
          <q-btn
            color="positive"
            icon="add"
            label="Create"
            size="sm"
            @click="handleCreateDataBoost"
            :loading="dataBoostStore.saveLoading"
            :disable="isCreatingNew"
          />
          <q-btn
            color="negative"
            icon="delete"
            label="Delete"
            size="sm"
            @click="handleDeleteDataBoost"
            :disable="!dataBoostStore.selectedDataBoost"
            :loading="dataBoostStore.deleteLoading"
          />
        </div>
      </div>

      <!-- Data Boost Editing Form -->
      <div v-if="dataBoostStore.selectedDataBoost || isCreatingNew">
        <q-form @submit="handleSaveDataBoost" class="q-gutter-md">
          <!-- Name Field -->
          <q-input
            v-model="formData.name"
            label="Name"
            outlined
            dense
            :rules="[(val) => !!val || 'Name is required']"
          />

          <!-- Dataset Selection Section -->
          <q-separator />
          <div class="text-subtitle2 q-mb-sm">Dataset Configuration</div>
          <div class="q-gutter-sm">
            <q-select
              v-model="formData.inputDatasetId"
              :options="datasetOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              label="Input Dataset"
              :loading="datasetStore.loading"
              :rules="[(val) => !!val || 'Input dataset is required']"
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey"> No datasets available </q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-select
              v-model="formData.exampleDatasetId"
              :options="datasetOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              label="Example Dataset"
              :loading="datasetStore.loading"
              :rules="[(val) => !!val || 'Example dataset is required']"
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey"> No datasets available </q-item-section>
                </q-item>
              </template>
            </q-select>

          </div>

          <!-- Prompt and Format Section -->
          <q-separator />
          <div class="text-subtitle2 q-mb-sm">Prompt and Format Configuration</div>
          <div class="q-gutter-sm">
            <q-select
              v-model="formData.promptId"
              :options="promptOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              label="Prompt"
              :loading="promptStore.loading"
              :rules="[(val) => !!val || 'Prompt is required']"
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey"> No prompts available </q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-select
              v-model="formData.outputFormatId"
              :options="outputFormatOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              label="Output Format"
              :loading="outputFormatStore.loading"
              :rules="[(val) => !!val || 'Output format is required']"
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey"> No output formats available </q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-select
              v-model="formData.outputFormatType"
              :options="outputFormatTypeOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              label="Output Format Type"
              :rules="[(val) => !!val || 'Output format type is required']"
              readonly
            >
              <template v-slot:hint>
                <div class="text-caption text-info">
                  <q-icon name="info" class="q-mr-xs" />
                  Only Chain of Thought (CoT) format is supported as it's the only format that can be parsed into full annotation data.
                </div>
              </template>
            </q-select>
          </div>

          <!-- Template and Examples Section -->
          <q-separator />
          <div class="text-subtitle2 q-mb-sm">Template and Examples</div>
          <div class="q-gutter-sm">
            <div>
              <q-input
                v-model="formData.exampleTemplate"
                label="Example Template"
                type="textarea"
                outlined
                rows="4"
                :rules="[(val) => !!val || 'Example template is required']"
              />
              <div class="q-mt-xs">
                <div class="row q-gutter-sm q-mb-xs">
                  <q-btn
                    size="sm"
                    color="secondary"
                    outline
                    icon="add"
                    label="Insert {{ INPUT }}"
                    @click="insertInputPlaceholder"
                  />
                  <q-btn
                    size="sm"
                    color="info"
                    outline
                    icon="add"
                    label="Insert {{ OUTPUT }}"
                    @click="insertOutputPlaceholder"
                  />
                </div>
                <div class="text-caption text-grey-6">
                  Click to insert &#123;&#123; INPUT &#125;&#125; or &#123;&#123; OUTPUT
                  &#125;&#125; placeholders at the end, then manually adjust their positions as
                  needed.
                </div>
              </div>
            </div>

            <q-input
              v-model.number="formData.exampleCount"
              label="Example Count"
              type="number"
              outlined
              dense
              :rules="[(val) => val > 0 || 'Example count must be greater than 0']"
              min="1"
            />
          </div>

          <!-- Action Buttons -->
          <div class="row q-gutter-sm">
            <q-btn
              type="submit"
              color="primary"
              :label="isCreatingNew ? 'Create Data Boost' : 'Save Changes'"
              :loading="dataBoostStore.saveLoading"
              class="col"
            />
            <q-btn
              v-if="isCreatingNew"
              color="grey"
              label="Cancel"
              outline
              @click="handleCancelCreate"
              :disable="dataBoostStore.saveLoading"
            />
          </div>
        </q-form>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center q-py-xl">
        <q-icon name="rocket_launch" size="3em" color="grey-4" />
        <div class="text-h6 q-mt-md q-mb-sm text-grey-6">No Data Boost Selected</div>
        <p class="text-grey-5">Select a data boost to edit or create a new one</p>
        <q-btn
          color="primary"
          icon="add"
          label="Create New Data Boost"
          @click="handleCreateDataBoost"
          class="q-mt-md"
        />
      </div>
    </q-card-section>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-icon name="warning" color="negative" size="2em" class="q-mr-md" />
          <div>
            <div class="text-h6">Delete Data Boost</div>
            <div class="text-body2 q-mt-sm">
              Are you sure you want to delete "{{ dataBoostStore.selectedDataBoost?.name }}"?
              <br />
              This action cannot be undone.
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            label="Cancel"
            color="grey"
            flat
            @click="showDeleteDialog = false"
            :disable="dataBoostStore.deleteLoading"
          />
          <q-btn
            label="Delete"
            color="negative"
            @click="confirmDelete"
            :loading="dataBoostStore.deleteLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup lang="ts">
import type { DataBoost } from '@/shared/models/data-boost.model';
import type { OutputFormatType } from '@/shared/models/output-format.model';
import { useDataBoostStore } from '@/stores/data-boost.store';
import { useDatasetStore } from '@/stores/dataset.store';
import { useOutputFormatStore } from '@/stores/output-format.store';
import { usePromptStore } from '@/stores/prompt.store';
import { computed, onMounted, reactive, ref, watch } from 'vue';

const dataBoostStore = useDataBoostStore();
const datasetStore = useDatasetStore();
const promptStore = usePromptStore();
const outputFormatStore = useOutputFormatStore();

// Dialog states
const showDeleteDialog = ref(false);

// Local creation state
const isCreatingNew = ref(false);
const localDataBoost = ref<DataBoost | null>(null);

// Local selected data boost ID for the q-select
const selectedDataBoostId = computed({
  get: () => dataBoostStore.selectedDataBoost?.id || null,
  set: () => {
    // This setter will be triggered by the q-select, but we handle it in handleDataBoostChange
  },
});

// Form data for editing
const formData = reactive({
  name: '',
  inputDatasetId: '',
  exampleDatasetId: '',
  promptId: '',
  outputFormatId: '',
  outputFormatType: undefined as OutputFormatType | undefined,
  exampleTemplate: '',
  exampleCount: 1,
});

// Computed options for selects
const datasetOptions = computed(() =>
  datasetStore.sortedDatasets.map((dataset) => ({
    label: `${dataset.name} (${dataset.length} items)`,
    value: dataset.id,
  })),
);

const promptOptions = computed(() =>
  promptStore.promptList.map((prompt) => ({
    label: prompt.name,
    value: prompt.id,
  })),
);

const outputFormatOptions = computed(() =>
  outputFormatStore.sortedOutputFormats.map((format) => ({
    label: format.name,
    value: format.id,
  })),
);

const outputFormatTypeOptions = [
  { label: 'Chain of Thought', value: 'cot' },
];

// Initialize form data with selected data boost
function initializeFormData(dataBoost: DataBoost | null) {
  if (dataBoost) {
    formData.name = dataBoost.name;
    formData.inputDatasetId = dataBoost.inputDatasetId;
    formData.exampleDatasetId = dataBoost.exampleDatasetId;
    formData.promptId = dataBoost.promptId;
    formData.outputFormatId = dataBoost.outputFormatId;
    formData.outputFormatType = dataBoost.outputFormatType;
    formData.exampleTemplate = dataBoost.exampleTemplate;
    formData.exampleCount = dataBoost.exampleCount;
  } else {
    // Reset form data
    formData.name = '';
    formData.inputDatasetId = '';
    formData.exampleDatasetId = '';
    formData.promptId = '';
    formData.outputFormatId = '';
    formData.outputFormatType = undefined;
    formData.exampleTemplate = '';
    formData.exampleCount = 1;
  }
}

// Event handlers
function handleDataBoostChange(dataBoostId: string | null) {
  // Don't allow switching if we're creating a new data boost with unsaved changes
  if (isCreatingNew.value && hasUnsavedChanges()) {
    // Could show a confirmation dialog here if needed
    return;
  }

  // Find the actual DataBoost object from the id
  const dataBoost = dataBoostId
    ? dataBoostStore.sortedDataBoosts.find((db) => db.id === dataBoostId) || null
    : null;

  isCreatingNew.value = false;
  localDataBoost.value = null;
  dataBoostStore.selectDataBoost(dataBoost);
  initializeFormData(dataBoost);
}

function handleCreateDataBoost() {
  // Create a new local data boost object
  isCreatingNew.value = true;
  localDataBoost.value = {
    id: '', // Will be set by server
    name: 'New Data Boost',
    inputDatasetId: '',
    exampleDatasetId: '',
    promptId: '',
    outputFormatId: '',
    outputFormatType: 'cot',
    exampleTemplate: '',
    exampleCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Clear server selection and initialize form with local data
  dataBoostStore.selectDataBoost(null);
  initializeFormData(localDataBoost.value);
}

function handleDeleteDataBoost() {
  if (dataBoostStore.selectedDataBoost) {
    showDeleteDialog.value = true;
  }
}

async function handleSaveDataBoost() {
  if (!formData.outputFormatType) return;

  try {
    const saveData = {
      name: formData.name,
      inputDatasetId: formData.inputDatasetId,
      exampleDatasetId: formData.exampleDatasetId,
      promptId: formData.promptId,
      outputFormatId: formData.outputFormatId,
      outputFormatType: formData.outputFormatType,
      exampleTemplate: formData.exampleTemplate,
      exampleCount: formData.exampleCount,
    };

    if (isCreatingNew.value) {
      // Create new data boost on server
      const newDataBoost = await dataBoostStore.createDataBoost(saveData);

      // Reset local creation state
      isCreatingNew.value = false;
      localDataBoost.value = null;

      // Select the newly created data boost
      dataBoostStore.selectDataBoost(newDataBoost);
      initializeFormData(newDataBoost);
    } else if (dataBoostStore.selectedDataBoost) {
      // Update existing data boost
      await dataBoostStore.updateDataBoost(dataBoostStore.selectedDataBoost.id, saveData);
    }
  } catch {
    // Error is handled in the store
  }
}

function handleCancelCreate() {
  // Cancel creating new data boost
  isCreatingNew.value = false;
  localDataBoost.value = null;

  // Clear form and selection
  dataBoostStore.selectDataBoost(null);
  initializeFormData(null);
}

// Helper function to check if there are unsaved changes
function hasUnsavedChanges(): boolean {
  if (!isCreatingNew.value) return false;

  return (
    formData.name.trim() !== 'New Data Boost' ||
    formData.inputDatasetId !== '' ||
    formData.exampleDatasetId !== '' ||
    formData.promptId !== '' ||
    formData.outputFormatId !== '' ||
    formData.outputFormatType !== 'cot' ||
    formData.exampleTemplate !== '' ||
    formData.exampleCount !== 1
  );
}

async function confirmDelete() {
  if (!dataBoostStore.selectedDataBoost) return;

  try {
    await dataBoostStore.deleteDataBoost(dataBoostStore.selectedDataBoost.id);
    showDeleteDialog.value = false;
  } catch {
    // Error is handled in the store
  }
}

// Placeholder insertion functions
function insertInputPlaceholder() {
  const currentValue = formData.exampleTemplate;
  const placeholder = '{{ INPUT }}';

  // Add placeholder at the end with a space if there's existing content
  if (currentValue.trim()) {
    formData.exampleTemplate = currentValue + ' ' + placeholder;
  } else {
    formData.exampleTemplate = placeholder;
  }
}

function insertOutputPlaceholder() {
  const currentValue = formData.exampleTemplate;
  const placeholder = '{{ OUTPUT }}';

  // Add placeholder at the end with a space if there's existing content
  if (currentValue.trim()) {
    formData.exampleTemplate = currentValue + ' ' + placeholder;
  } else {
    formData.exampleTemplate = placeholder;
  }
}

// Watch for changes to selected data boost
watch(
  () => dataBoostStore.selectedDataBoost,
  (newDataBoost) => {
    // Only update form if we're not creating a new one
    if (!isCreatingNew.value) {
      initializeFormData(newDataBoost);
    }
  },
  { deep: true },
);

// Lifecycle
onMounted(async () => {
  // Load all required data
  await Promise.all([
    dataBoostStore.loadDataBoosts(),
    datasetStore.loadDatasets(),
    promptStore.loadPrompts(),
    outputFormatStore.loadOutputFormats(),
  ]);
});
</script>
