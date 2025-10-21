<template>
  <q-card flat bordered class="tw:border-l-4 tw:border-primary">
    <q-card-section class="q-pa-sm">
      <div class="row items-center justify-between">
        <div class="text-subtitle2">Annotation Editor</div>
        <div class="row q-gutter-xs items-center">
          <!-- Movement Controls -->
          <!-- Position within segment -->
          <q-btn
            size="sm"
            flat
            icon="keyboard_arrow_up"
            color="primary"
            @click="handleMoveUp"
            :disable="!canMoveUp"
            title="Move up in segment"
          />
          <q-btn
            size="sm"
            flat
            icon="keyboard_arrow_down"
            color="primary"
            @click="handleMoveDown"
            :disable="!canMoveDown"
            title="Move down in segment"
          />
          <!-- Segment movement -->
          <q-btn
            size="sm"
            flat
            icon="keyboard_arrow_left"
            color="secondary"
            @click="handleMoveToPreviousSegment"
            :disable="!canMoveToPreviousSegment"
            title="Move to previous segment"
          />
          <q-btn
            size="sm"
            flat
            icon="keyboard_arrow_right"
            color="secondary"
            @click="handleMoveToNextSegment"
            :disable="!canMoveToNextSegment"
            title="Move to next segment"
          />
          <q-btn
            size="sm"
            flat
            round
            icon="delete"
            color="negative"
            @click="handleDelete"
            :title="'Delete annotation'"
          />
        </div>
      </div>

      <!-- Main Fields Row -->
      <div class="row q-col-gutter-sm">
        <!-- Sense Selection -->
        <div class="col-12 col-sm-3">
          <label class="text-caption text-grey-7 tw:block">Sense *</label>
          <q-select
            :model-value="annotation.sense"
            @update:model-value="updateField('sense', $event)"
            :options="senseOptions"
            outlined
            dense
            emit-value
            map-options
            :rules="[(val) => !!val || 'Sense is required']"
            hide-bottom-space
          />
        </div>

        <!-- Stimulus Input -->
        <div class="col-12 col-sm-3">
          <label class="text-caption text-grey-7 tw:block">Stimulus *</label>
          <q-input
            :model-value="annotation.stimulus"
            @update:model-value="updateField('stimulus', String($event || ''))"
            outlined
            dense
            placeholder="Enter stimulus..."
            :rules="[(val) => !!val?.trim() || 'Stimulus is required']"
            hide-bottom-space
          />
        </div>

        <!-- Perception Input -->
        <div class="col-12 col-sm-3">
          <label class="text-caption text-grey-7 tw:block">Perception *</label>
          <q-input
            :model-value="annotation.perception"
            @update:model-value="updateField('perception', String($event || ''))"
            outlined
            dense
            placeholder="Enter perception..."
            :rules="[(val) => !!val?.trim() || 'Perception is required']"
            hide-bottom-space
          />
        </div>

        <!-- Sentiment Selection -->
        <div class="col-12 col-sm-3">
          <label class="text-caption text-grey-7 tw:block">Sentiment *</label>
          <q-select
            :model-value="annotation.sentiment"
            @update:model-value="updateField('sentiment', $event)"
            :options="sentimentOptions"
            outlined
            dense
            emit-value
            map-options
            :rules="[(val) => !!val || 'Sentiment is required']"
            hide-bottom-space
          />
        </div>
      </div>

      <!-- Chain of Thought (Optional) -->
      <div class="q-mb-sm">
        <label class="text-caption text-grey-7 tw:block">Chain of Thought (CoT)</label>
        <q-input
          :model-value="annotation.CoT || ''"
          @update:model-value="updateField('CoT', $event ? String($event) : undefined)"
          type="textarea"
          outlined
          dense
          rows="3"
          placeholder="Enter chain of thought (optional)..."
          hide-bottom-space
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import type { Annotation } from '@/shared/models/annotation.model';

interface Props {
  annotation: Annotation;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canMoveToPreviousSegment: boolean;
  canMoveToNextSegment: boolean;
}

interface Emits {
  (e: 'update', annotation: Annotation): void;
  (e: 'delete'): void;
  (e: 'move-up'): void;
  (e: 'move-down'): void;
  (e: 'move-to-previous-segment'): void;
  (e: 'move-to-next-segment'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Options for select fields
const senseOptions = [
  { label: 'Vision', value: 'Vision' },
  { label: 'Hearing', value: 'Hearing' },
  { label: 'Taste', value: 'Taste' },
  { label: 'Smell', value: 'Smell' },
  { label: 'Touch', value: 'Touch' },
];

const sentimentOptions = [
  { label: 'Positive', value: 'Positive' },
  { label: 'Negative', value: 'Negative' },
  { label: 'Neutral', value: 'Neutral' },
];

// Methods
const updateField = <K extends keyof Annotation>(field: K, value: Annotation[K]) => {
  const updatedAnnotation = { ...props.annotation };
  if (field === 'CoT' && value === '') {
    // Handle optional CoT field - set to undefined if empty
    updatedAnnotation[field] = undefined as Annotation[K];
  } else {
    updatedAnnotation[field] = value;
  }
  emit('update', updatedAnnotation);
};

const handleDelete = () => {
  emit('delete');
};

const handleMoveUp = () => {
  emit('move-up');
};

const handleMoveDown = () => {
  emit('move-down');
};

const handleMoveToPreviousSegment = () => {
  emit('move-to-previous-segment');
};

const handleMoveToNextSegment = () => {
  emit('move-to-next-segment');
};
</script>

<style scoped>
/* All styles converted to Quasar/Tailwind utility classes */
</style>
