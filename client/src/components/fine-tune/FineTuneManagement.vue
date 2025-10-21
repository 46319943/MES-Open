<template>
  <q-card flat class="column full-height">
    <q-card-section class="bg-secondary text-white">
      <div class="text-h6">Model Management</div>
      <div class="text-caption">Manage and monitor fine-tuned models</div>
    </q-card-section>

    <q-card-section class="col tw:overflow-hidden tw:shrink tw:min-h-0 q-pa-none">
      <q-splitter
        v-model="splitterModel"
        :limits="[30, 70]"
        separator-class="bg-grey-3"
        separator-style="width: 1px"
        class="full-height"
      >
        <!-- Top Section: Model List -->
        <template v-slot:before>
          <div class="column full-height">
            <!-- Header with actions -->
            <div class="q-pa-md bg-grey-1 tw:border-b tw:border-gray-300">
              <div class="row items-center justify-between">
                <div class="text-subtitle2">Fine-Tuned Models</div>
                <div class="row q-gutter-xs">
                  <q-btn
                    icon="refresh"
                    size="sm"
                    flat
                    round
                    @click="handleRefresh"
                    :loading="fineTuneStore.loading"
                  >
                    <q-tooltip>Refresh list</q-tooltip>
                  </q-btn>
                  <q-btn
                    icon="delete"
                    size="sm"
                    flat
                    round
                    color="negative"
                    @click="handleDelete"
                    :disable="!fineTuneStore.selectedFineTune"
                    :loading="fineTuneStore.deleteLoading"
                  >
                    <q-tooltip>Delete selected model</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </div>

            <!-- Model List -->
            <div class="col tw:overflow-y-auto">
              <q-list v-if="fineTuneStore.hasFineTunes" separator>
                <q-item
                  v-for="fineTune in fineTuneStore.sortedFineTunes"
                  :key="fineTune.fine_tune_name"
                  clickable
                  v-ripple
                  :active="
                    fineTuneStore.selectedFineTune?.fine_tune_name === fineTune.fine_tune_name
                  "
                  @click="handleSelectFineTune(fineTune)"
                  class="q-pa-md"
                >
                  <q-item-section>
                    <q-item-label class="text-weight-medium">
                        <span>{{ fineTune.fine_tune_name }}</span>
                    </q-item-label>
                    <q-item-label caption class="q-mt-xs">
                      <div class="row items-center q-gutter-sm">
                        <q-chip
                          :color="getStatusColor(fineTune.status)"
                          text-color="white"
                          size="sm"
                          dense
                        >
                          {{ fineTune.status }}
                        </q-chip>
                        <span>{{ fineTune.data_size }} samples</span>
                        <span>{{ formatDate(fineTune.created_at) }}</span>
                        <span v-if="fineTune.resumed_from" class="text-info text-caption">
                          (resumed)
                        </span>
                      </div>
                    </q-item-label>
                  </q-item-section>

                  <q-item-section side v-if="fineTune.status === 'training'">
                    <q-spinner color="primary" size="sm" />
                  </q-item-section>
                </q-item>
              </q-list>

              <div v-else-if="fineTuneStore.loading" class="text-center q-py-xl">
                <q-spinner size="2em" color="primary" />
                <div class="q-mt-md text-grey-6">Loading fine-tuned models...</div>
              </div>

              <div v-else class="text-center q-py-xl">
                <q-icon name="model_training" size="4em" color="grey-4" />
                <div class="text-h6 q-mt-md q-mb-sm text-grey-6">No Fine-Tuned Models</div>
                <p class="text-grey-5">Start fine-tuning a model to see it here</p>
              </div>
            </div>
          </div>
        </template>

        <!-- Bottom Section: Model Details -->
        <template v-slot:after>
          <div class="column full-height">
            <div
              v-if="!fineTuneStore.selectedFineTune"
              class="text-center q-py-xl full-height flex items-center justify-center"
            >
              <div>
                <q-icon name="info" size="4em" color="grey-4" />
                <div class="text-h6 q-mt-md q-mb-sm text-grey-6">Select a Model</div>
                <p class="text-grey-5">Click on a fine-tuned model to view its details</p>
              </div>
            </div>

            <div v-else class="column full-height">
              <!-- Header -->
              <div class="q-pa-md bg-grey-1 tw:border-b tw:border-gray-300">
                <div class="text-subtitle2">Model Details</div>
              </div>

              <!-- Details Content -->
              <div class="col tw:overflow-y-auto q-pa-md">
                <div class="q-gutter-md">
                  <!-- Basic Info -->
                  <q-card flat bordered>
                    <q-card-section>
                      <div class="text-subtitle2 q-mb-md">Basic Information</div>
                      <div class="q-gutter-sm">
                        <div class="row">
                          <div class="col-4 text-weight-medium">Name:</div>
                          <div class="col-8 tw:break-all tw:wrap-anywhere">
                            {{ fineTuneStore.selectedFineTune.fine_tune_name }}
                          </div>
                        </div>
                        <div class="row">
                          <div class="col-4 text-weight-medium">Status:</div>
                          <div class="col-8">
                            <q-chip
                              :color="getStatusColor(fineTuneStore.selectedFineTune.status)"
                              text-color="white"
                              size="sm"
                            >
                              {{ fineTuneStore.selectedFineTune.status }}
                            </q-chip>
                          </div>
                        </div>
                        <div class="row">
                          <div class="col-4 text-weight-medium">Data Size:</div>
                          <div class="col-8 tw:break-all tw:wrap-anywhere">
                            {{ fineTuneStore.selectedFineTune.data_size }} samples
                          </div>
                        </div>
                        <div class="row">
                          <div class="col-4 text-weight-medium">Created:</div>
                          <div class="col-8 tw:break-all tw:wrap-anywhere">
                            {{ formatDateFull(fineTuneStore.selectedFineTune.created_at) }}
                          </div>
                        </div>
                        <div class="row">
                          <div class="col-4 text-weight-medium">Updated:</div>
                          <div class="col-8 tw:break-all tw:wrap-anywhere">
                            {{ formatDateFull(fineTuneStore.selectedFineTune.updated_at) }}
                          </div>
                        </div>
                        <div v-if="fineTuneStore.selectedFineTune.output_path" class="row">
                          <div class="col-4 text-weight-medium">Output Path:</div>
                          <div class="col-8 text-mono text-caption tw:break-all tw:wrap-anywhere">
                            {{ fineTuneStore.selectedFineTune.output_path }}
                          </div>
                        </div>
                        <div v-if="fineTuneStore.selectedFineTune.resumed_from" class="row">
                          <div class="col-4 text-weight-medium">Resumed From:</div>
                          <div class="col-8 tw:break-all tw:wrap-anywhere">
                              {{ fineTuneStore.selectedFineTune.resumed_from }}
                          </div>
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>

                  <!-- Training Configuration -->
                  <q-card flat bordered>
                    <q-card-section>
                      <div class="text-subtitle2 q-mb-md">Training Configuration</div>
                      <div class="q-gutter-sm">
                        <div class="row">
                          <div class="col-4 text-weight-medium">Base Model:</div>
                          <div class="col-8 tw:break-all tw:wrap-anywhere">
                            {{ fineTuneStore.selectedFineTune.training_config.model_name }}
                          </div>
                        </div>
                        <div class="row">
                          <div class="col-4 text-weight-medium">Epochs:</div>
                          <div class="col-8 tw:break-all tw:wrap-anywhere">
                            {{ fineTuneStore.selectedFineTune.training_config.num_epochs }}
                          </div>
                        </div>
                        <div class="row">
                          <div class="col-4 text-weight-medium">Batch Size:</div>
                          <div class="col-8 tw:break-all tw:wrap-anywhere">
                            {{ fineTuneStore.selectedFineTune.training_config.batch_size }}
                          </div>
                        </div>
                        <div class="row">
                          <div class="col-4 text-weight-medium">Accumulated Batch:</div>
                          <div class="col-8 tw:break-all tw:wrap-anywhere">
                            {{
                              fineTuneStore.selectedFineTune.training_config.accumulated_batch_size
                            }}
                          </div>
                        </div>
                        <div class="row">
                          <div class="col-4 text-weight-medium">Max Seq Length:</div>
                          <div class="col-8 tw:break-all tw:wrap-anywhere">
                            {{ fineTuneStore.selectedFineTune.training_config.max_seq_length }}
                          </div>
                        </div>
                        <div class="row">
                          <div class="col-4 text-weight-medium">Learning Rate:</div>
                          <div class="col-8 tw:break-all tw:wrap-anywhere">
                            {{ fineTuneStore.selectedFineTune.training_config.learning_rate }}
                          </div>
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>

                  <!-- Metadata -->
                  <q-card v-if="fineTuneStore.selectedFineTune.meta" flat bordered>
                    <q-card-section>
                      <div class="text-subtitle2 q-mb-md">Metadata</div>
                      <div class="q-gutter-sm">
                        <div
                          v-for="(value, key) in fineTuneStore.selectedFineTune.meta"
                          :key="key"
                          class="row"
                        >
                          <div class="col-4 text-weight-medium">{{ formatMetaKey(key) }}:</div>
                          <div class="col-8 tw:break-all tw:wrap-anywhere">
                            <span v-if="Array.isArray(value)">{{ value.join(', ') }}</span>
                            <span v-else>{{ value }}</span>
                          </div>
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>

                  <!-- Error Message -->
                  <q-card
                    v-if="fineTuneStore.selectedFineTune.error"
                    flat
                    bordered
                    class="bg-negative-1"
                  >
                    <q-card-section>
                      <div class="text-subtitle2 q-mb-md text-negative">Error</div>
                      <div class="text-caption text-negative tw:break-all tw:wrap-anywhere">
                        {{ fineTuneStore.selectedFineTune.error }}
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </div>
          </div>
        </template>
      </q-splitter>
    </q-card-section>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-icon name="warning" color="negative" size="2em" class="q-mr-md" />
          <div>
            <div class="text-h6">Delete Fine-Tuned Model</div>
            <div class="text-body2 q-mt-sm">
              Are you sure you want to delete "<strong>{{
                fineTuneToDelete?.fine_tune_name
              }}</strong
              >"?
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
            :disable="fineTuneStore.deleteLoading"
          />
          <q-btn
            label="Delete"
            color="negative"
            @click="confirmDelete"
            :loading="fineTuneStore.deleteLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup lang="ts">
import type { FineTuneRecord } from 'src/local/models/fine-tune.model';
import { useFineTuneStore } from '@/stores/fine-tune.store';
import { formatDateDistance } from '@/utils/date-formatter';
import { onMounted, onUnmounted, ref } from 'vue';

defineOptions({
  name: 'FineTuneManagement',
});

// No longer emit model-selected events as the store is used directly

const fineTuneStore = useFineTuneStore();

// Component state
const splitterModel = ref(50);
const showDeleteDialog = ref(false);
const fineTuneToDelete = ref<FineTuneRecord | null>(null);

// Auto-refresh interval
let refreshInterval: NodeJS.Timeout | null = null;

// Methods
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'positive';
    case 'training':
      return 'primary';
    case 'failed':
      return 'negative';
    default:
      return 'grey';
  }
}

function formatDate(date: Date): string {
  return formatDateDistance(date);
}

function formatDateFull(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMetaKey(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

function handleSelectFineTune(fineTune: FineTuneRecord) {
  fineTuneStore.setSelectedFineTune(fineTune);
  // No longer emit events as the store is used directly by parent components
}

async function handleRefresh() {
  await fineTuneStore.loadFineTunes();
}

function handleDelete() {
  if (fineTuneStore.selectedFineTune) {
    fineTuneToDelete.value = fineTuneStore.selectedFineTune;
    showDeleteDialog.value = true;
  }
}

async function confirmDelete() {
  if (fineTuneToDelete.value) {
    try {
      await fineTuneStore.deleteFineTune(fineTuneToDelete.value.fine_tune_name);
      showDeleteDialog.value = false;
      fineTuneToDelete.value = null;
    } catch {
      // Error is handled in the store
    }
  }
}

// Auto-refresh logic
function startAutoRefresh() {
  refreshInterval = setInterval(() => {
    // Only refresh if there are training models
    const hasTrainingModels = fineTuneStore.fineTuneList.some((ft) => ft.status === 'training');

    if (hasTrainingModels) {
      void fineTuneStore.loadFineTunes();
    }
  }, 5000); // Refresh every 5 seconds
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// Lifecycle
onMounted(async () => {
  await fineTuneStore.loadFineTunes();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style scoped>
.text-mono {
  font-family: 'Courier New', monospace;
}
</style>
