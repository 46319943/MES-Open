<template>
  <q-card flat class="full-height column no-wrap">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">
        {{ isEditing ? 'Edit Data' : 'Create New Data' }}
      </div>
      <div class="text-caption">
        {{ isEditing ? `ID: ${editableData.id}` : 'Fill in the details below' }}
      </div>
    </q-card-section>

    <q-card-section class="q-pa-none tw:max-h-[calc(100vh-200px)] tw:overflow-hidden">
      <div ref="scrollContainer" class="q-pa-md tw:h-full tw:overflow-y-auto">
      <!-- Text Content -->
      <div class="q-mb-md">
        <div class="row items-center justify-between q-mb-xs">
          <label class="text-subtitle2">Text Content *</label>
          <q-btn
            v-if="!isTextEditing"
            size="sm"
            color="primary"
            icon="edit"
            label="Edit Text"
            @click="startTextEditing"
            flat
          />
        </div>

        <!-- Text Input Mode -->
        <div v-if="isTextEditing">
          <q-input
            v-model="editableData.text"
            type="textarea"
            outlined
            rows="6"
            placeholder="Enter the text content..."
            :rules="[(val) => !!val || 'Text content is required']"
            class="q-mb-xs"
          />
          <div class="row items-center justify-between">
            <div class="text-caption text-grey-6">
              Characters: {{ (editableData.text || '').length }}
            </div>
            <div class="q-gutter-xs">
              <q-btn size="sm" color="grey" label="Cancel" @click="cancelTextEditing" flat />
              <q-btn
                size="sm"
                color="primary"
                label="Done"
                @click="finishTextEditing"
                :disable="!editableData.text?.trim()"
              />
            </div>
          </div>
        </div>

        <!-- Text Display Mode -->
        <div v-else>
          <TextSegment
            v-if="editableData.text && editableData.segments && editableData.segments.length > 0"
            :text="editableData.text"
            :segments="editableData.segments"
            @update:segments="updateSegments"
          />
          <div
            v-else-if="editableData.text"
            class="q-pa-md tw:border tw:border-gray-300 tw:rounded tw:bg-gray-50 tw:min-h-[120px] tw:whitespace-pre-wrap tw:break-words"
          >
            {{ editableData.text }}
          </div>
          <div v-else class="text-grey-6 text-center q-py-md">
            <q-icon name="text_fields" size="1.5em" class="q-mb-xs" />
            <div>No text content</div>
            <div class="text-caption">Click "Edit Text" to add content</div>
          </div>
        </div>
      </div>

      <!-- Segments Section -->
      <div class="q-mb-md">
        <div class="row items-center justify-between q-mb-xs">
          <label class="text-subtitle2">Segments</label>
          <q-btn
            size="sm"
            color="primary"
            icon="add"
            label="Add Segment"
            @click="addSegment"
            flat
          />
        </div>

        <div
          v-if="(editableData.segments || []).length === 0"
          class="text-center q-py-md text-grey-6"
        >
          <q-icon name="text_fields" size="1.5em" class="q-mb-xs" />
          <div>No segments defined</div>
          <div class="text-caption">Add segments to annotate parts of the text</div>
        </div>

        <div v-else class="q-gutter-xs">
          <q-card
            v-for="(segment, index) in editableData.segments || []"
            :key="index"
            flat
            bordered
            class="tw:border-l-4 tw:border-primary"
          >
            <q-card-section class="q-pa-sm">
              <div class="row items-center justify-between q-mb-xs">
                <div class="text-subtitle2">Segment {{ index + 1 }}</div>
                <div class="row items-center q-gutter-xs">
                  <q-input
                    v-model.number="segment.indexStart"
                    label="Start Index"
                    type="number"
                    outlined
                    dense
                    style="width: 100px"
                    :rules="[(val) => val >= 0 || 'Must be >= 0']"
                    hide-bottom-space
                  />
                  <q-input
                    v-model.number="segment.indexEnd"
                    label="End Index (Exclusive)"
                    type="number"
                    outlined
                    dense
                    style="width: 120px"
                    :rules="[(val) => val > segment.indexStart || 'Must be > start index']"
                    hide-bottom-space
                  />
                  <q-btn
                    size="sm"
                    flat
                    round
                    icon="delete"
                    color="negative"
                    @click="removeSegment(index)"
                  />
                </div>
              </div>

              <div class="text-caption text-grey-6 q-mb-xs">
                Text: "{{ getSegmentText(segment) }}"
              </div>

              <div class="row items-center justify-between">
                <div class="text-caption text-grey-7">
                  Annotations: {{ (segment.annotations || []).length }}
                </div>
                <q-btn
                  size="xs"
                  flat
                  color="primary"
                  icon="add"
                  label="Add"
                  @click="addAnnotation(index)"
                />
              </div>

              <!-- Annotations List -->
              <div v-if="(segment.annotations || []).length > 0" class="q-mt-sm">
                <div class="q-gutter-xs">
                  <AnnotationEditor
                    v-for="(annotation, annotationIndex) in segment.annotations"
                    :key="`${index}-${annotationIndex}`"
                    :annotation="annotation"
                    :can-move-up="annotationIndex > 0"
                    :can-move-down="annotationIndex < (segment.annotations?.length || 0) - 1"
                    :can-move-to-previous-segment="index > 0"
                    :can-move-to-next-segment="index < (editableData.segments?.length || 0) - 1"
                    @update="updateAnnotation(index, annotationIndex, $event)"
                    @delete="deleteAnnotation(index, annotationIndex)"
                    @move-up="moveAnnotationUp(index, annotationIndex)"
                    @move-down="moveAnnotationDown(index, annotationIndex)"
                    @move-to-previous-segment="
                      moveAnnotationToPreviousSegment(index, annotationIndex)
                    "
                    @move-to-next-segment="moveAnnotationToNextSegment(index, annotationIndex)"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Metadata Section -->
      <div class="q-mb-md">
        <div class="row items-center justify-between q-mb-xs">
          <label class="text-subtitle2">Metadata</label>
          <q-btn
            size="sm"
            color="primary"
            icon="add"
            label="Add Field"
            @click="addMetadataField"
            flat
          />
        </div>

        <div v-if="metadataEntries.length === 0" class="text-center q-py-md text-grey-6">
          <q-icon name="info" size="1.5em" class="q-mb-xs" />
          <div>No metadata fields</div>
          <div class="text-caption">Add custom metadata fields</div>
        </div>

        <div v-else class="q-gutter-xs">
          <div
            v-for="(entry, index) in metadataEntries"
            :key="index"
            class="row q-gutter-xs items-center"
          >
            <q-input v-model="entry.key" label="Key" outlined dense class="col-4" />
            <q-input v-model="entry.value" label="Value" outlined dense class="col" />
            <q-btn
              flat
              round
              icon="delete"
              color="negative"
              size="sm"
              @click="removeMetadataField(index)"
            />
          </div>
        </div>
      </div>

      <!-- Timestamps (for editing only) -->
      <div v-if="isEditing" class="q-mb-md">
        <label class="text-subtitle2 q-mb-xs tw:block">Timestamps</label>
        <div class="row q-gutter-sm">
          <div class="col">
            <div class="text-caption text-grey-6">Created At</div>
            <div class="text-body2">{{ formatDate(editableData.createdAt || new Date()) }}</div>
          </div>
          <div class="col">
            <div class="text-caption text-grey-6">Updated At</div>
            <div class="text-body2">{{ formatDate(editableData.updatedAt || new Date()) }}</div>
          </div>
        </div>
      </div>
      </div>
    </q-card-section>

    <q-card-actions class="q-pa-md q-pt-none">
      <div class="row q-gutter-xs full-width">
        <q-btn
          color="grey"
          label="Cancel"
          outline
          class="col"
          @click="handleCancel"
          :disable="dataStore.saveLoading"
        />
        <q-btn
          color="primary"
          :label="isEditing ? 'Update' : 'Create'"
          class="col"
          @click="handleSave"
          :loading="dataStore.saveLoading"
        />
      </div>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, nextTick } from 'vue';
import type { Data, DataSegment } from '@/shared/models/data.model';
import type { Annotation } from '@/shared/models/annotation.model';
// Remove unused import
// import { formatDateDistance } from '@/utils/date-formatter';
import { useQuasar } from 'quasar';
import { cloneDeep } from 'lodash-es';
import { useDataStore } from '@/stores/data.store';
import TextSegment from '@/components/common/TextSegment.vue';
import AnnotationEditor from '@/components/annotation/AnnotationEditor.vue';

interface Emits {
  (e: 'close'): void;
}

const emit = defineEmits<Emits>();
const $q = useQuasar();
const dataStore = useDataStore();

// Template refs
const scrollContainer = ref<HTMLElement | null>(null);

// Text editing state
const isTextEditing = ref(false);
const originalText = ref('');

// Create a deep copy of the data for editing
const editableData = reactive<Partial<Data>>({
  id: '',
  text: '',
  segments: [],
  metaData: {},
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Metadata handling
interface MetadataEntry {
  key: string;
  value: string;
}

const metadataEntries = ref<MetadataEntry[]>([]);

// Computed
const isEditing = computed(() => !!dataStore.selectedData?.id);

// Methods
const resetScrollPosition = async () => {
  await nextTick();
  if (scrollContainer.value) {
    console.log('Before reset - scrollTop:', scrollContainer.value.scrollTop);
    console.log('ScrollHeight:', scrollContainer.value.scrollHeight);
    console.log('ClientHeight:', scrollContainer.value.clientHeight);

    // Force scroll to top using multiple methods for reliability
    scrollContainer.value.scrollTop = 0;

    // Use scrollTo as backup
    if (scrollContainer.value.scrollTo) {
      scrollContainer.value.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Wait a bit and check again
    setTimeout(() => {
      console.log('After reset - scrollTop:', scrollContainer.value?.scrollTop);
    }, 100);
  } else {
    console.log('scrollContainer.value is null');
  }
};

// Watch for store changes to update local state
watch(
  () => dataStore.selectedData,
  (newData) => {
    if (newData) {
      // Create deep copy for editing
      Object.assign(editableData, cloneDeep(newData));

      // Convert metadata to entries for editing
      metadataEntries.value = Object.entries(newData.metaData || {}).map(([key, value]) => ({
        key,
        value: String(value),
      }));

      // Set text editing state based on whether we have existing data
      isTextEditing.value = !newData.text;
    } else {
      // Reset for new creation
      Object.assign(editableData, {
        id: '',
        text: '',
        segments: [],
        metaData: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      metadataEntries.value = [];

      // Start in editing mode for new data
      isTextEditing.value = true;
    }

    // Reset scroll position to top when data changes
      void resetScrollPosition();
  },
  { immediate: true },
);

const formatDate = (date: Date) => {
  return new Date(date).toLocaleString();
};

const getSegmentText = (segment: DataSegment) => {
  const text = editableData.text || '';
  return text.slice(segment.indexStart, segment.indexEnd);
};

const addSegment = () => {
  const newSegment: DataSegment = {
    indexStart: 0,
    indexEnd: editableData.text?.length || 0,
    annotations: [],
  };
  editableData.segments?.push(newSegment);
};

const removeSegment = (index: number) => {
  editableData.segments?.splice(index, 1);
};

const addAnnotation = (segmentIndex: number) => {
  if (!editableData.segments?.[segmentIndex]) {
    return;
  }

  const newAnnotation: Annotation = {
    sense: 'Vision',
    stimulus: '',
    perception: '',
    sentiment: 'Neutral',
    CoT: undefined,
  };

  if (!editableData.segments[segmentIndex].annotations) {
    editableData.segments[segmentIndex].annotations = [];
  }

  editableData.segments[segmentIndex].annotations.push(newAnnotation);
};

const updateAnnotation = (
  segmentIndex: number,
  annotationIndex: number,
  updatedAnnotation: Annotation,
) => {
  if (!editableData.segments?.[segmentIndex]?.annotations?.[annotationIndex]) {
    return;
  }

  editableData.segments[segmentIndex].annotations[annotationIndex] = updatedAnnotation;
};

const deleteAnnotation = (segmentIndex: number, annotationIndex: number) => {
  if (!editableData.segments?.[segmentIndex]?.annotations) {
    return;
  }

  editableData.segments[segmentIndex].annotations.splice(annotationIndex, 1);
};

const moveAnnotationUp = (segmentIndex: number, annotationIndex: number) => {
  const annotations = editableData.segments?.[segmentIndex]?.annotations;
  if (!annotations || annotationIndex <= 0 || annotationIndex >= annotations.length) {
    return;
  }

  // Swap with previous annotation
  const current = annotations[annotationIndex];
  const previous = annotations[annotationIndex - 1];

  if (current && previous) {
    annotations[annotationIndex] = previous;
    annotations[annotationIndex - 1] = current;
  }
};

const moveAnnotationDown = (segmentIndex: number, annotationIndex: number) => {
  const annotations = editableData.segments?.[segmentIndex]?.annotations;
  if (!annotations || annotationIndex >= annotations.length - 1 || annotationIndex < 0) {
    return;
  }

  // Swap with next annotation
  const current = annotations[annotationIndex];
  const next = annotations[annotationIndex + 1];

  if (current && next) {
    annotations[annotationIndex] = next;
    annotations[annotationIndex + 1] = current;
  }
};

const moveAnnotationToPreviousSegment = (segmentIndex: number, annotationIndex: number) => {
  const currentAnnotations = editableData.segments?.[segmentIndex]?.annotations;
  const previousSegment = editableData.segments?.[segmentIndex - 1];

  if (
    !currentAnnotations ||
    !previousSegment ||
    segmentIndex <= 0 ||
    annotationIndex < 0 ||
    annotationIndex >= currentAnnotations.length
  ) {
    return;
  }

  // Remove annotation from current segment
  const annotation = currentAnnotations.splice(annotationIndex, 1)[0];

  if (!annotation) {
    return;
  }

  // Add to previous segment
  if (!previousSegment.annotations) {
    previousSegment.annotations = [];
  }
  previousSegment.annotations.push(annotation);
};

const moveAnnotationToNextSegment = (segmentIndex: number, annotationIndex: number) => {
  const currentAnnotations = editableData.segments?.[segmentIndex]?.annotations;
  const nextSegment = editableData.segments?.[segmentIndex + 1];

  if (
    !currentAnnotations ||
    !nextSegment ||
    segmentIndex >= (editableData.segments?.length || 0) - 1 ||
    annotationIndex < 0 ||
    annotationIndex >= currentAnnotations.length
  ) {
    return;
  }

  // Remove annotation from current segment
  const annotation = currentAnnotations.splice(annotationIndex, 1)[0];

  if (!annotation) {
    return;
  }

  // Add to next segment
  if (!nextSegment.annotations) {
    nextSegment.annotations = [];
  }
  nextSegment.annotations.push(annotation);
};

const addMetadataField = () => {
  metadataEntries.value.push({ key: '', value: '' });
};

const removeMetadataField = (index: number) => {
  metadataEntries.value.splice(index, 1);
};

const handleSave = async () => {
  // Validate required fields
  if (!editableData.text?.trim()) {
    $q.notify({
      type: 'negative',
      message: 'Text content is required',
      position: 'top',
    });
    return;
  }

  // Convert metadata entries back to object
  const metaData: Record<string, string> = {};
  metadataEntries.value.forEach((entry) => {
    if (entry.key.trim()) {
      metaData[entry.key.trim()] = entry.value;
    }
  });

  const dataToSave: Partial<Data> = {
    text: editableData.text,
    segments: editableData.segments || [],
    metaData,
  };

  if (isEditing.value) {
    dataToSave.id = editableData.id;
  }

  await dataStore.saveData(dataToSave);
  emit('close');
};

const handleCancel = () => {
  dataStore.clearSelection();
  emit('close');
};

// Text editing methods
const startTextEditing = () => {
  originalText.value = editableData.text || '';
  isTextEditing.value = true;
};

const cancelTextEditing = () => {
  editableData.text = originalText.value;
  isTextEditing.value = false;
};

const finishTextEditing = () => {
  if (editableData.text?.trim()) {
    // Generate default segment if no segments exist or if text changed significantly
    if (
      !editableData.segments ||
      editableData.segments.length === 0 ||
      editableData.text !== originalText.value
    ) {
      generateDefaultSegmentWithConsolidatedAnnotations();
    }
    isTextEditing.value = false;
  }
};

const generateDefaultSegmentWithConsolidatedAnnotations = () => {
  if (editableData.text) {
    // Collect all existing annotations from all segments
    const allAnnotations: Annotation[] = [];
    if (editableData.segments && editableData.segments.length > 0) {
      editableData.segments.forEach(segment => {
        if (segment.annotations && segment.annotations.length > 0) {
          allAnnotations.push(...segment.annotations);
        }
      });
    }

    // Create new default segment with all consolidated annotations
    const defaultSegment: DataSegment = {
      indexStart: 0,
      indexEnd: editableData.text.length,
      annotations: allAnnotations,
    };
    editableData.segments = [defaultSegment];
  }
};

const updateSegments = (newSegments: DataSegment[]) => {
  editableData.segments = newSegments;
};
</script>

<style scoped>
/* All styles have been converted to utility classes */
</style>
