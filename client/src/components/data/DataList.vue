<template>
  <q-card flat class="column no-wrap">
    <q-card-section class="bg-primary text-white">
      <!-- Title, Dataset Selection and Action Buttons -->
      <div class="row items-center justify-between">
        <!-- Left Side: Title and Dataset Selection -->
        <div class="row items-center col-auto q-gutter-lg">
          <div class="text-h6">Data Management</div>
          <div class="row items-center">
            <div class="text-body2 q-mr-md">Dataset:</div>
            <q-select
              v-model="dataStore.currentDataset"
              :options="datasetStore.sortedDatasets"
              option-label="name"
              option-value="id"
              dense
              outlined
              bg-color="white"
              color="primary"
              style="min-width: 250px"
              :loading="datasetStore.loading"
              @update:model-value="handleDatasetChange"
              placeholder="Select a dataset"
            >
              <template v-slot:option="{ itemProps, opt }">
                <q-item v-bind="itemProps">
                  <q-item-section>
                    <q-item-label>{{ opt.name }}</q-item-label>
                    <q-item-label caption>{{ opt.length }} items</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
              <template v-slot:selected>
                <div v-if="dataStore.currentDataset">
                  {{ dataStore.currentDataset.name }} ({{ dataStore.currentDataset.length }} items)
                </div>
              </template>
            </q-select>
          </div>
        </div>

        <!-- Right Side: Action Buttons -->
        <div class="q-gutter-sm">
          <q-btn
            color="white"
            text-color="primary"
            :icon="getSortButtonIcon()"
            :label="getSortButtonLabel()"
            @click="cycleSortOption"
            :disable="!dataStore.hasData"
          >
            <q-tooltip>{{ getSortButtonLabel() }}</q-tooltip>
          </q-btn>
          <q-btn
            color="white"
            text-color="primary"
            icon="file_upload"
            round
            @click="handleImportData"
            :loading="dataStore.loading"
            :disable="!dataStore.currentDataset"
          >
            <q-tooltip>Import Data</q-tooltip>
          </q-btn>
          <q-btn
            color="white"
            text-color="primary"
            icon="add"
            round
            @click="handleCreateData"
            :loading="dataStore.loading"
            :disable="!dataStore.currentDataset"
          >
            <q-tooltip>Create Data</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-card-section>

    <q-card-section class="q-pa-none col">
      <!-- Loading state -->
      <div v-if="dataStore.loading && !dataStore.hasData" class="text-center q-py-xl">
        <q-spinner-dots size="50px" color="primary" />
        <div class="text-grey-6 q-mt-md">Loading data...</div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!dataStore.hasData && dataStore.currentDataset"
        class="text-center q-py-xl q-px-lg"
      >
        <q-icon name="description" size="4em" color="grey-4" />
        <div class="text-h6 q-mt-md q-mb-sm">No data found</div>
        <p class="text-grey-6 q-mb-lg">Create your first data entry to get started</p>
        <q-btn
          color="primary"
          icon="add"
          label="Create First Data Entry"
          @click="handleCreateData"
        />
      </div>

      <!-- No dataset selected -->
      <div v-else-if="!dataStore.currentDataset" class="text-center q-py-xl q-px-lg">
        <q-icon name="folder_open" size="4em" color="grey-4" />
        <div class="text-h6 q-mt-md q-mb-sm">No dataset selected</div>
        <p class="text-grey-6 q-mb-lg">
          Please select a dataset from the dropdown above to view its data
        </p>
      </div>

      <!-- Data list -->
      <q-list v-else class="tw:overflow-y-auto full-height" separator>
        <q-item
          v-for="data in dataStore.dataList"
          :key="data.id"
          clickable
          @click="handleSelectData(data)"
          :class="{
            'bg-blue-1 hover:tw:bg-blue-50': dataStore.selectedData?.id === data.id,
            'hover:tw:bg-gray-50': dataStore.selectedData?.id !== data.id,
          }"
          class="tw:min-h-[80px] tw:transition-colors tw:duration-200 tw:ease-in-out"
        >
          <q-item-section>
            <q-item-label class="text-subtitle2 q-mb-xs">
              {{ truncateText(data.text, 100) }}
            </q-item-label>

            <q-item-label caption class="row q-gutter-md q-mb-xs">
              <span>
                <q-icon name="text_fields" size="14px" class="q-mr-xs" />
                {{ data.segments.length }} segments
              </span>
              <span>
                <q-icon name="label" size="14px" class="q-mr-xs" />
                {{ getTotalAnnotations(data) }} annotations
              </span>
            </q-item-label>

            <q-item-label caption class="text-grey-5">
              <div class="row q-gutter-md">
                <span>
                  <q-icon name="schedule" size="12px" class="q-mr-xs" />
                  Created {{ formatDateDistance(data.createdAt) }}
                </span>
                <span>
                  <q-icon name="update" size="12px" class="q-mr-xs" />
                  Updated {{ formatDateDistance(data.updatedAt) }}
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
                <q-item clickable v-close-popup @click="handleSelectData(data)">
                  <q-item-section avatar>
                    <q-icon name="edit" />
                  </q-item-section>
                  <q-item-section>Edit</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="handleConfirmDelete(data)">
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
    <!-- Pagination -->
    <div v-if="dataStore.pagination.totalPages > 1" class="q-pa-md">
      <q-pagination
        v-model="dataStore.currentPage"
        :max="dataStore.pagination.totalPages"
        :max-pages="5"
        direction-links
        boundary-links
        @update:model-value="handlePageChange"
      />
    </div>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-icon name="warning" color="negative" size="2em" class="q-mr-md" />
          <div>
            <div class="text-h6">Delete Data Entry</div>
            <div class="text-body2 q-mt-sm">
              Are you sure you want to delete this data entry?
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
            :disable="dataStore.deleteLoading"
          />
          <q-btn
            label="Delete"
            color="negative"
            @click="handleDelete"
            :loading="dataStore.deleteLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import type { Data } from '@/shared/models/data.model';
import type { DatasetResponse } from '@/shared/api-schemas/dataset.api-schema';
import { formatDateDistance } from '@/utils/date-formatter';
import { useDataStore } from '@/stores/data.store';
import { useDatasetStore } from '@/stores/dataset.store';

interface Emits {
  (e: 'select-data', data: Data): void;
  (e: 'create-data'): void;
  (e: 'import-data'): void;
}

const emit = defineEmits<Emits>();
const dataStore = useDataStore();
const datasetStore = useDatasetStore();

// Dialog states
const showDeleteDialog = ref(false);
const dataToDelete = ref<Data | null>(null);

// Sorting state - now managed by the store
type SortOption = 'createdAt-desc' | 'createdAt-asc' | 'updatedAt-desc' | 'updatedAt-asc';

// Computed current sort option based on store state
const currentSort = computed<SortOption>(() => {
  return `${dataStore.sortBy}-${dataStore.sortOrder}` as SortOption;
});

// Methods
function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

async function cycleSortOption() {
  const sortOptions: SortOption[] = ['createdAt-desc', 'createdAt-asc', 'updatedAt-desc', 'updatedAt-asc'];
  const currentIndex = sortOptions.indexOf(currentSort.value);
  const nextIndex = (currentIndex + 1) % sortOptions.length;
  const nextSort = sortOptions[nextIndex]!;

  const [field, order] = nextSort.split('-') as ['createdAt' | 'updatedAt', 'asc' | 'desc'];
  await dataStore.setSorting(field, order);
}

function getSortButtonLabel() {
  switch (currentSort.value) {
    case 'createdAt-desc':
      return 'Created (Newest)';
    case 'createdAt-asc':
      return 'Created (Oldest)';
    case 'updatedAt-desc':
      return 'Updated (Newest)';
    case 'updatedAt-asc':
      return 'Updated (Oldest)';
    default:
      return 'Sort';
  }
}

function getSortButtonIcon() {
  switch (currentSort.value) {
    case 'createdAt-desc':
      return 'schedule';
    case 'createdAt-asc':
      return 'schedule';
    case 'updatedAt-desc':
      return 'update';
    case 'updatedAt-asc':
      return 'update';
    default:
      return 'sort';
  }
}

function getTotalAnnotations(data: Data) {
  return data.segments.reduce((total, segment) => total + segment.annotations.length, 0);
}

function handleSelectData(data: Data) {
  dataStore.selectData(data);
  emit('select-data', data);
}

function handleCreateData() {
  dataStore.clearSelection();
  emit('create-data');
}

function handleImportData() {
  emit('import-data');
}

function handleConfirmDelete(data: Data) {
  dataToDelete.value = data;
  showDeleteDialog.value = true;
}

async function handleDelete() {
  if (!dataToDelete.value) return;

  try {
    await dataStore.deleteData(dataToDelete.value.id);
    showDeleteDialog.value = false;
    dataToDelete.value = null;
  } catch {
    // Error is already handled in the store
  }
}

function handlePageChange(page: number) {
  void dataStore.loadData(page);
}

async function handleDatasetChange(dataset: DatasetResponse | null) {
  dataStore.setCurrentDataset(dataset);
  if (dataset) {
    await dataStore.loadData(1);
  }
}

// Watchers
watch(
  () => dataStore.currentDataset,
  async (newDataset, oldDataset) => {
    // Only load data if the dataset actually changed and we have a new dataset
    if (newDataset && newDataset.id !== oldDataset?.id) {
      await dataStore.loadData(1);
    }
  },
  { immediate: false },
);

// Lifecycle
onMounted(async () => {
  // Load datasets on mount
  await datasetStore.loadDatasets();

  // If there's already a current dataset, load its data
  if (dataStore.currentDataset) {
    await dataStore.loadData(1);
  }
});
</script>
