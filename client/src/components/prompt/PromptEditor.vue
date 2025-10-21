<template>
  <q-card flat class="full-height column no-wrap">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">
        {{ isEditing ? 'Edit Prompt' : 'Create New Prompt' }}
      </div>
      <div class="text-caption">
        {{ isEditing ? `ID: ${editablePrompt.id}` : 'Fill in the details below' }}
      </div>
    </q-card-section>

    <q-card-section class="q-pa-lg tw:max-h-[calc(100vh-200px)] tw:overflow-y-auto">
      <!-- Name Input -->
      <div class="q-mb-lg">
        <label class="text-subtitle2 q-mb-sm tw:block">Name *</label>
        <q-input
          v-model="editablePrompt.name"
          outlined
          placeholder="Enter prompt name..."
          :rules="[(val) => !!val?.trim() || 'Name is required']"
          hide-bottom-space
        />
      </div>

      <!-- Content Input -->
      <div class="q-mb-lg">
        <div class="row items-center justify-between q-mb-sm">
          <label class="text-subtitle2">Content *</label>
          <div class="row q-gutter-xs">
            <q-btn
              size="sm"
              color="primary"
              icon="add"
              label="Insert {{ INPUT }}"
              @mousedown="captureCurrentCursorPosition"
              @click="insertPlaceholder"
              flat
              :disable="!contentInputRef"
            />
            <q-btn
              size="sm"
              color="secondary"
              icon="add"
              label="Insert {{ EXAMPLES }}"
              @mousedown="captureCurrentCursorPosition"
              @click="insertExamplesPlaceholder"
              flat
              :disable="!contentInputRef"
            />
          </div>
        </div>

        <textarea
          ref="contentInputRef"
          v-model="editablePrompt.content"
          rows="12"
          placeholder="Enter the prompt content..."
          class="q-field__native q-placeholder tw:w-full tw:p-3 tw:border tw:border-gray-300 tw:rounded tw:resize-none tw:outline-none focus:tw:border-blue-500 tw:transition-colors q-mb-sm"
          @click="updateCursorPosition"
          @keyup="updateCursorPosition"
          @select="updateCursorPosition"
        ></textarea>
        <div class="text-caption text-grey-6">
          Characters: {{ (editablePrompt.content || '').length }}
        </div>
        <div class="text-caption text-grey-6 q-mt-xs">
          Use &#123;&#123; INPUT &#125;&#125; for user input and &#123;&#123; EXAMPLES &#125;&#125;
          for examples
        </div>
      </div>

      <!-- Timestamps (for editing only) -->
      <div v-if="isEditing" class="q-mb-lg">
        <label class="text-subtitle2 q-mb-sm tw:block">Timestamps</label>
        <div class="row q-gutter-md">
          <div class="col">
            <div class="text-caption text-grey-6">Created At</div>
            <div class="text-body2">{{ formatDate(editablePrompt.createdAt || new Date()) }}</div>
          </div>
          <div class="col">
            <div class="text-caption text-grey-6">Updated At</div>
            <div class="text-body2">{{ formatDate(editablePrompt.updatedAt || new Date()) }}</div>
          </div>
        </div>
      </div>
    </q-card-section>

    <q-card-actions class="q-pa-lg q-pt-none">
      <div class="row q-gutter-sm full-width">
        <q-btn
          color="grey"
          label="Cancel"
          outline
          class="col"
          @click="handleCancel"
          :disable="promptStore.saveLoading"
        />
        <q-btn
          color="primary"
          :label="isEditing ? 'Update' : 'Create'"
          class="col"
          @click="handleSave"
          :loading="promptStore.saveLoading"
        />
      </div>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue';
import type { Prompt } from '@/shared/models/prompt.model';
import { useQuasar } from 'quasar';
import { cloneDeep } from 'lodash-es';
import { usePromptStore } from '@/stores/prompt.store';

interface Emits {
  (e: 'close'): void;
}

const emit = defineEmits<Emits>();
const $q = useQuasar();
const promptStore = usePromptStore();

// Refs
const contentInputRef = ref<HTMLTextAreaElement | null>(null);

// Track cursor position for placeholder insertion
const lastCursorPosition = ref(0);

// Create a deep copy of the prompt for editing
const editablePrompt = reactive<Partial<Prompt>>({
  id: '',
  name: '',
  content: '',
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Computed
const isEditing = computed(() => !!promptStore.selectedPrompt?.id);

// Watch for store changes to update local state
watch(
  () => promptStore.selectedPrompt,
  (newPrompt, oldPrompt) => {
    // Only reset if we're switching to a different prompt or initializing
    if (newPrompt?.id !== oldPrompt?.id) {
      if (newPrompt) {
        // Create deep copy for editing
        Object.assign(editablePrompt, cloneDeep(newPrompt));
        // Set cursor to end of content when loading a prompt
        lastCursorPosition.value = newPrompt.content?.length || 0;
      } else {
        // Reset for new creation
        Object.assign(editablePrompt, {
          id: '',
          name: '',
          content: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        // Reset cursor position
        lastCursorPosition.value = 0;
      }
    }
  },
  { immediate: true },
);

// Methods
function formatDate(date: Date) {
  return new Date(date).toLocaleString();
}

function updateCursorPosition() {
  // Use nextTick to ensure DOM has updated
  setTimeout(() => {
    if (!contentInputRef.value) return;

    const textarea = contentInputRef.value;

    // Only update if the textarea is focused to avoid overriding during programmatic changes
    if (document.activeElement === textarea) {
      const newPos = textarea.selectionStart;
      console.log('Updating cursor position to:', newPos);
      lastCursorPosition.value = newPos;
    }
  }, 0);
}

function captureCurrentCursorPosition() {
  // Capture cursor position immediately when button is pressed, before focus is lost
  if (!contentInputRef.value) return;

  const textarea = contentInputRef.value;

  // Get current cursor position right now
  const currentPos = textarea.selectionStart;
  console.log('Captured cursor position on mousedown:', currentPos);
  lastCursorPosition.value = currentPos;
}

function insertPlaceholder() {
  const placeholder = '{{ INPUT }}';
  const currentContent = editablePrompt.content || '';
  const insertPos = lastCursorPosition.value;

  console.log(
    'Inserting placeholder at position:',
    insertPos,
    'Content length:',
    currentContent.length,
  );

  // Insert placeholder at the last known cursor position
  const newContent =
    currentContent.substring(0, insertPos) + placeholder + currentContent.substring(insertPos);

  editablePrompt.content = newContent;

  // Update the cursor position to after the inserted placeholder
  const newCursorPos = insertPos + placeholder.length;
  lastCursorPosition.value = newCursorPos;

  // Focus the textarea and set cursor position
  setTimeout(() => {
    if (!contentInputRef.value) return;
    const textarea = contentInputRef.value;

    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
}

function insertExamplesPlaceholder() {
  const placeholder = '{{ EXAMPLES }}';
  const currentContent = editablePrompt.content || '';
  const insertPos = lastCursorPosition.value;

  console.log(
    'Inserting examples placeholder at position:',
    insertPos,
    'Content length:',
    currentContent.length,
  );

  // Insert placeholder at the last known cursor position
  const newContent =
    currentContent.substring(0, insertPos) + placeholder + currentContent.substring(insertPos);

  editablePrompt.content = newContent;

  // Update the cursor position to after the inserted placeholder
  const newCursorPos = insertPos + placeholder.length;
  lastCursorPosition.value = newCursorPos;

  // Focus the textarea and set cursor position
  setTimeout(() => {
    if (!contentInputRef.value) return;
    const textarea = contentInputRef.value;

    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
}

async function handleSave() {
  // Validate required fields
  if (!editablePrompt.name?.trim()) {
    $q.notify({
      type: 'negative',
      message: 'Name is required',
      position: 'top',
    });
    return;
  }

  if (editablePrompt.content === undefined || editablePrompt.content === null) {
    $q.notify({
      type: 'negative',
      message: 'Content is required',
      position: 'top',
    });
    return;
  }

  const promptToSave: Partial<Prompt> = {
    name: editablePrompt.name.trim(),
    content: editablePrompt.content,
  };

  if (isEditing.value) {
    promptToSave.id = editablePrompt.id;
  }

  try {
    await promptStore.savePrompt(promptToSave);
    emit('close');
  } catch {
    // Error is already handled in the store
  }
}

function handleCancel() {
  promptStore.clearSelection();
  emit('close');
}
</script>
