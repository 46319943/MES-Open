<template>
  <q-card flat class="full-height">
    <q-card-section class="bg-primary text-white">
      <div class="row items-center justify-between">
        <div>
          <div class="text-h6">Prompt Management</div>
          <div class="text-caption">Manage your prompt templates</div>
        </div>
        <div class="q-gutter-sm">
          <q-btn
            color="white"
            text-color="primary"
            icon="add"
            label="Create Prompt"
            @click="handleCreatePrompt"
            :loading="promptStore.loading"
          />
        </div>
      </div>
    </q-card-section>

    <q-card-section class="q-pa-none">
      <!-- Loading state -->
      <div v-if="promptStore.loading && !promptStore.hasPrompts" class="text-center q-py-xl">
        <q-spinner-dots size="50px" color="primary" />
        <div class="text-grey-6 q-mt-md">Loading prompts...</div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!promptStore.hasPrompts" class="text-center q-py-xl q-px-lg">
        <q-icon name="description" size="4em" color="grey-4" />
        <div class="text-h6 q-mt-md q-mb-sm">No prompts found</div>
        <p class="text-grey-6 q-mb-lg">Create your first prompt template to get started</p>
        <q-btn color="primary" icon="add" label="Create First Prompt" @click="handleCreatePrompt" />
      </div>

      <!-- Prompt list -->
      <q-list v-else class="tw:max-h-[calc(100vh-200px)] tw:overflow-y-auto" separator>
        <q-item
          v-for="prompt in promptStore.promptList"
          :key="prompt.id"
          clickable
          @click="handleSelectPrompt(prompt)"
          :class="{
            'bg-blue-1 hover:tw:bg-blue-50': promptStore.selectedPrompt?.id === prompt.id,
            'hover:tw:bg-gray-50': promptStore.selectedPrompt?.id !== prompt.id,
          }"
          class="tw:min-h-[100px] tw:transition-colors tw:duration-200 tw:ease-in-out"
        >
          <q-item-section>
            <q-item-label class="text-subtitle1 q-mb-xs text-weight-medium">
              {{ prompt.name }}
            </q-item-label>

            <q-item-label caption class="q-mb-sm text-grey-7">
              {{ truncateText(prompt.content, 120) }}
            </q-item-label>

            <q-item-label caption class="text-grey-5">
              <div class="row q-gutter-md">
                <span>
                  <q-icon name="schedule" size="12px" class="q-mr-xs" />
                  Created {{ formatDateDistance(prompt.createdAt) }}
                </span>
                <span>
                  <q-icon name="update" size="12px" class="q-mr-xs" />
                  Updated {{ formatDateDistance(prompt.updatedAt) }}
                </span>
              </div>
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-btn-dropdown
              flat
              dense
              round
              icon="more_vert"
              class="text-grey-6"
              dropdown-icon=""
              @click.stop
            >
              <q-list>
                <q-item clickable v-close-popup @click="handleSelectPrompt(prompt)">
                  <q-item-section avatar>
                    <q-icon name="edit" />
                  </q-item-section>
                  <q-item-section>Edit</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="handleConfirmDelete(prompt)">
                  <q-item-section avatar>
                    <q-icon name="delete" color="negative" />
                  </q-item-section>
                  <q-item-section class="text-negative">Delete</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-icon name="warning" color="negative" size="2em" class="q-mr-md" />
          <div>
            <div class="text-h6">Delete Prompt</div>
            <div class="text-body2 q-mt-sm">
              Are you sure you want to delete "{{ promptToDelete?.name }}"?
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
            :disable="promptStore.deleteLoading"
          />
          <q-btn
            label="Delete"
            color="negative"
            @click="handleDelete"
            :loading="promptStore.deleteLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Prompt } from '@/shared/models/prompt.model';
import { formatDateDistance } from '@/utils/date-formatter';
import { usePromptStore } from '@/stores/prompt.store';

interface Emits {
  (e: 'select-prompt', prompt: Prompt): void;
  (e: 'create-prompt'): void;
}

const emit = defineEmits<Emits>();
const promptStore = usePromptStore();

// Dialog states
const showDeleteDialog = ref(false);
const promptToDelete = ref<Prompt | null>(null);

// Methods
function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function handleSelectPrompt(prompt: Prompt) {
  promptStore.selectPrompt(prompt);
  emit('select-prompt', prompt);
}

function handleCreatePrompt() {
  promptStore.clearSelection();
  emit('create-prompt');
}

function handleConfirmDelete(prompt: Prompt) {
  promptToDelete.value = prompt;
  showDeleteDialog.value = true;
}

async function handleDelete() {
  if (!promptToDelete.value) return;

  try {
    await promptStore.deletePrompt(promptToDelete.value.id);
    showDeleteDialog.value = false;
    promptToDelete.value = null;
  } catch {
    // Error is already handled in the store
  }
}
</script>
