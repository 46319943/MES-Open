<template>
  <q-card flat class="column">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">Output Format Management</div>
    </q-card-section>

    <q-card-section class="col tw:overflow-y-auto tw:shrink tw:min-h-0">
      <!-- Output Format Selection and Actions -->
      <div class="q-mb-md">
        <div class="row q-gutter-sm q-mb-md">
          <q-select
            v-model="outputFormatStore.selectedOutputFormat"
            :options="outputFormatStore.sortedOutputFormats"
            option-label="name"
            option-value="id"
            outlined
            dense
            label="Select Output Format"
            class="col"
            :loading="outputFormatStore.loading"
            @update:model-value="handleOutputFormatChange"
            clearable
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> No output formats available </q-item-section>
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
            @click="handleCreateFormat"
            :loading="outputFormatStore.saveLoading"
          />
          <q-btn
            color="negative"
            icon="delete"
            label="Delete"
            size="sm"
            @click="handleDeleteFormat"
            :disable="!outputFormatStore.selectedOutputFormat"
            :loading="outputFormatStore.deleteLoading"
          />
        </div>
      </div>

      <!-- Output Format Editing Form -->
      <div v-if="outputFormatStore.selectedOutputFormat">
        <q-form @submit="handleSaveFormat" class="q-gutter-md">
          <!-- Name Field -->
          <q-input
            v-model="formData.name"
            label="Name"
            outlined
            dense
            :rules="[(val) => !!val || 'Name is required']"
          />

          <!-- Key Names Section -->
          <q-separator />
          <div class="text-subtitle2 q-mb-sm">Key Names</div>
          <div class="q-gutter-sm">
            <q-input v-model="formData.senseName" label="Sense Key Name" outlined dense />
            <q-input v-model="formData.stimulusName" label="Stimulus Key Name" outlined dense />
            <q-input v-model="formData.perceptionName" label="Perception Key Name" outlined dense />
            <q-input v-model="formData.sentimentName" label="Sentiment Key Name" outlined dense />
          </div>

          <!-- Sense Names Section -->
          <q-separator />
          <div class="text-subtitle2 q-mb-sm">Sense Names</div>
          <div class="q-gutter-sm">
            <q-input v-model="formData.visionName" label="Vision Name" outlined dense />
            <q-input v-model="formData.hearingName" label="Hearing Name" outlined dense />
            <q-input v-model="formData.tasteName" label="Taste Name" outlined dense />
            <q-input v-model="formData.smellName" label="Smell Name" outlined dense />
            <q-input v-model="formData.touchName" label="Touch Name" outlined dense />
          </div>

          <!-- Sentiment Names Section -->
          <q-separator />
          <div class="text-subtitle2 q-mb-sm">Sentiment Names</div>
          <div class="q-gutter-sm">
            <q-input v-model="formData.positiveName" label="Positive Name" outlined dense />
            <q-input v-model="formData.negativeName" label="Negative Name" outlined dense />
            <q-input v-model="formData.neutralName" label="Neutral Name" outlined dense />
          </div>

          <!-- CoT Templates Section -->
          <q-separator />
          <div class="text-subtitle2 q-mb-sm">CoT Templates</div>
          <div class="q-gutter-sm">
            <q-input
              v-model="formData.CoTStartTemplate"
              label="CoT Start Template"
              type="textarea"
              outlined
              rows="3"
            />

            <div>
              <q-input
                v-model="formData.CoTSentenceExistTemplate"
                label="CoT Sentence Exist Template"
                type="textarea"
                outlined
                rows="3"
              />
              <div class="q-mt-xs">
                <q-btn
                  size="sm"
                  color="primary"
                  outline
                  icon="add"
                  label="Insert sentence placeholder"
                  @click="insertSentencePlaceholder('CoTSentenceExistTemplate')"
                  class="q-mb-xs"
                />
                <div class="text-caption text-grey-6">
                  Click to insert &#123;&#123; SENTENCE &#125;&#125; at the end, then manually
                  adjust its position as needed.
                </div>
              </div>
            </div>

            <div>
              <q-input
                v-model="formData.CoTSentenceNotExistTemplate"
                label="CoT Sentence Not Exist Template"
                type="textarea"
                outlined
                rows="3"
              />
              <div class="q-mt-xs">
                <q-btn
                  size="sm"
                  color="primary"
                  outline
                  icon="add"
                  label="Insert sentence placeholder"
                  @click="insertSentencePlaceholder('CoTSentenceNotExistTemplate')"
                  class="q-mb-xs"
                />
                <div class="text-caption text-grey-6">
                  Click to insert &#123;&#123; SENTENCE &#125;&#125; at the end, then manually
                  adjust its position as needed.
                </div>
              </div>
            </div>

            <div>
              <q-input
                v-model="formData.CoTSentenceAnnotationTemplate"
                label="CoT Sentence Annotation Template"
                type="textarea"
                outlined
                rows="3"
              />
              <div class="q-mt-xs">
                <div class="row q-gutter-sm q-mb-xs">
                  <q-btn
                    size="sm"
                    color="secondary"
                    outline
                    icon="add"
                    label="Insert annotation placeholder"
                    @click="insertAnnotationPlaceholder"
                  />
                  <q-btn
                    size="sm"
                    color="info"
                    outline
                    icon="add"
                    label="Insert CoT placeholder"
                    @click="insertCoTPlaceholder"
                  />
                </div>
                <div class="text-caption text-grey-6">
                  Click to insert &#123;&#123; ANNOTATION &#125;&#125; or &#123;&#123; COT
                  &#125;&#125; at the end, then manually adjust their positions as needed.
                </div>
              </div>
            </div>
          </div>

          <!-- Save Button -->
          <q-btn
            type="submit"
            color="primary"
            label="Save Changes"
            :loading="outputFormatStore.saveLoading"
            class="full-width"
          />
        </q-form>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center q-py-xl">
        <q-icon name="format_list_bulleted" size="3em" color="grey-4" />
        <div class="text-h6 q-mt-md q-mb-sm text-grey-6">No Format Selected</div>
        <p class="text-grey-5">Select an output format to edit or create a new one</p>
      </div>
    </q-card-section>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-icon name="warning" color="negative" size="2em" class="q-mr-md" />
          <div>
            <div class="text-h6">Delete Output Format</div>
            <div class="text-body2 q-mt-sm">
              Are you sure you want to delete "{{ outputFormatStore.selectedOutputFormat?.name }}"?
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
            :disable="outputFormatStore.deleteLoading"
          />
          <q-btn
            label="Delete"
            color="negative"
            @click="confirmDelete"
            :loading="outputFormatStore.deleteLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Create Format Dialog -->
    <q-dialog v-model="showCreateDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Create New Output Format</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newFormatName"
            label="Format Name"
            outlined
            autofocus
            :rules="[(val) => !!val || 'Name is required']"
            @keyup.enter="confirmCreate"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            label="Cancel"
            color="grey"
            flat
            @click="showCreateDialog = false"
            :disable="outputFormatStore.saveLoading"
          />
          <q-btn
            label="Create"
            color="primary"
            @click="confirmCreate"
            :loading="outputFormatStore.saveLoading"
            :disable="!newFormatName"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, reactive } from 'vue';
import { useOutputFormatStore } from '@/stores/output-format.store';
import type { OutputFormat } from '@/shared/models/output-format.model';
const outputFormatStore = useOutputFormatStore();

// Dialog states
const showDeleteDialog = ref(false);
const showCreateDialog = ref(false);
const newFormatName = ref('');

// Form data for editing
const formData = reactive({
  name: '',
  senseName: '',
  stimulusName: '',
  perceptionName: '',
  sentimentName: '',
  visionName: '',
  hearingName: '',
  tasteName: '',
  smellName: '',
  touchName: '',
  positiveName: '',
  negativeName: '',
  neutralName: '',
  CoTStartTemplate: '',
  CoTSentenceExistTemplate: '',
  CoTSentenceNotExistTemplate: '',
  CoTSentenceAnnotationTemplate: '',
});

// Initialize form data with selected output format
function initializeFormData(outputFormat: OutputFormat | null) {
  if (outputFormat) {
    formData.name = outputFormat.name;
    formData.senseName = outputFormat.senseName;
    formData.stimulusName = outputFormat.stimulusName;
    formData.perceptionName = outputFormat.perceptionName;
    formData.sentimentName = outputFormat.sentimentName;
    formData.visionName = outputFormat.visionName;
    formData.hearingName = outputFormat.hearingName;
    formData.tasteName = outputFormat.tasteName;
    formData.smellName = outputFormat.smellName;
    formData.touchName = outputFormat.touchName;
    formData.positiveName = outputFormat.positiveName;
    formData.negativeName = outputFormat.negativeName;
    formData.neutralName = outputFormat.neutralName;
    formData.CoTStartTemplate = outputFormat.CoTStartTemplate;
    formData.CoTSentenceExistTemplate = outputFormat.CoTSentenceExistTemplate;
    formData.CoTSentenceNotExistTemplate = outputFormat.CoTSentenceNotExistTemplate;
    formData.CoTSentenceAnnotationTemplate = outputFormat.CoTSentenceAnnotationTemplate;
  } else {
    // Reset form data
    Object.keys(formData).forEach((key) => {
      formData[key as keyof typeof formData] = '';
    });
  }
}

// Event handlers
function handleOutputFormatChange(outputFormat: OutputFormat | null) {
  outputFormatStore.selectOutputFormat(outputFormat);
  initializeFormData(outputFormat);
}

function handleCreateFormat() {
  newFormatName.value = '';
  showCreateDialog.value = true;
}

function handleDeleteFormat() {
  if (outputFormatStore.selectedOutputFormat) {
    showDeleteDialog.value = true;
  }
}

async function handleSaveFormat() {
  if (!outputFormatStore.selectedOutputFormat) return;

  try {
    await outputFormatStore.updateOutputFormat(outputFormatStore.selectedOutputFormat.id, formData);
  } catch {
    // Error is handled in the store
  }
}

async function confirmCreate() {
  if (!newFormatName.value.trim()) return;

  try {
    const newFormat = await outputFormatStore.createOutputFormat({
      name: newFormatName.value.trim(),
      senseName: '',
      stimulusName: '',
      perceptionName: '',
      sentimentName: '',
      visionName: '',
      hearingName: '',
      tasteName: '',
      smellName: '',
      touchName: '',
      positiveName: '',
      negativeName: '',
      neutralName: '',
      CoTStartTemplate: '',
      CoTSentenceExistTemplate: '',
      CoTSentenceNotExistTemplate: '',
      CoTSentenceAnnotationTemplate: '',
    });

    showCreateDialog.value = false;
    initializeFormData(newFormat);
  } catch {
    // Error is handled in the store
  }
}

async function confirmDelete() {
  if (!outputFormatStore.selectedOutputFormat) return;

  try {
    await outputFormatStore.deleteOutputFormat(outputFormatStore.selectedOutputFormat.id);
    showDeleteDialog.value = false;
  } catch {
    // Error is handled in the store
  }
}

// Placeholder insertion functions
function insertSentencePlaceholder(
  fieldName: 'CoTSentenceExistTemplate' | 'CoTSentenceNotExistTemplate',
) {
  const currentValue = formData[fieldName];
  const placeholder = '{{ SENTENCE }}';

  // Add placeholder at the end with a space if there's existing content
  if (currentValue.trim()) {
    formData[fieldName] = currentValue + ' ' + placeholder;
  } else {
    formData[fieldName] = placeholder;
  }
}

function insertAnnotationPlaceholder() {
  const currentValue = formData.CoTSentenceAnnotationTemplate;
  const placeholder = '{{ ANNOTATION }}';

  // Add placeholder at the end with a space if there's existing content
  if (currentValue.trim()) {
    formData.CoTSentenceAnnotationTemplate = currentValue + ' ' + placeholder;
  } else {
    formData.CoTSentenceAnnotationTemplate = placeholder;
  }
}

function insertCoTPlaceholder() {
  const currentValue = formData.CoTSentenceAnnotationTemplate;
  const placeholder = '{{ COT }}';

  // Add placeholder at the end with a space if there's existing content
  if (currentValue.trim()) {
    formData.CoTSentenceAnnotationTemplate = currentValue + ' ' + placeholder;
  } else {
    formData.CoTSentenceAnnotationTemplate = placeholder;
  }
}

// Watch for changes to selected output format
watch(
  () => outputFormatStore.selectedOutputFormat,
  (newFormat) => {
    initializeFormData(newFormat);
  },
  { deep: true },
);

// Lifecycle
onMounted(async () => {
  // Load output formats
  await outputFormatStore.loadOutputFormats();
});
</script>
