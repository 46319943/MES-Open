<template>
  <q-page class="q-pa-lg">
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h4 class="text-h4 q-my-none">Dataset Management</h4>
        <p class="text-grey-6 q-mb-none">
          Manage your datasets - create, edit, and organize your data collections
        </p>
      </div>
      <q-btn
        color="primary"
        icon="add"
        label="Create Dataset"
        @click="openCreateDialog"
        :loading="datasetStore.loading"
      />
    </div>

    <!-- Loading state -->
    <div v-if="datasetStore.loading && !datasetStore.hasDatasets" class="text-center q-py-xl">
      <q-spinner-dots size="50px" color="primary" />
      <div class="text-grey-6 q-mt-md">Loading datasets...</div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!datasetStore.hasDatasets" class="text-center q-py-xl">
      <q-icon name="folder_open" size="4em" color="grey-4" />
      <div class="text-h6 q-mt-md q-mb-sm">No datasets found</div>
      <p class="text-grey-6 q-mb-lg">Create your first dataset to start organizing your data</p>
      <q-btn
        color="primary"
        icon="add"
        label="Create Your First Dataset"
        @click="openCreateDialog"
      />
    </div>

    <!-- Dataset list -->
    <div v-else class="row q-col-gutter-md">
      <div
        v-for="dataset in datasetStore.sortedDatasets"
        :key="dataset.id"
        class="col-12 col-md-6 col-lg-4"
      >
        <q-card class="dataset-card" bordered>
          <q-card-section>
            <div class="row items-start justify-between">
              <div class="col">
                <div class="text-h6 text-primary q-mb-xs">{{ dataset.name }}</div>
                <div v-if="dataset.description" class="text-body2 text-grey-6 q-mb-sm">
                  {{ dataset.description }}
                </div>
                <div class="text-caption text-grey-5">
                  <q-icon name="storage" size="14px" class="q-mr-xs" />
                  {{ dataset.length }} items
                </div>
              </div>
              <q-btn-dropdown
                flat
                dense
                round
                icon="more_vert"
                class="text-grey-6"
                dropdown-icon=""
              >
                <q-list>
                  <q-item clickable v-close-popup @click="openEditDialog(dataset)">
                    <q-item-section avatar>
                      <q-icon name="edit" />
                    </q-item-section>
                    <q-item-section>Edit</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="confirmDelete(dataset)">
                    <q-item-section avatar>
                      <q-icon name="delete" color="negative" />
                    </q-item-section>
                    <q-item-section class="text-negative">Delete</q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div class="text-caption text-grey-5">
              <div class="row items-center q-gutter-md">
                <div>
                  <q-icon name="schedule" size="14px" class="q-mr-xs" />
                  Created {{ formatDateDistance(dataset.createdAt) }}
                </div>
                <div>
                  <q-icon name="update" size="14px" class="q-mr-xs" />
                  Updated {{ formatDateDistance(dataset.updatedAt) }}
                </div>
              </div>
            </div>
          </q-card-section>

          <q-card-actions class="q-pa-md q-pt-none">
            <div class="row q-gutter-sm full-width">
              <q-btn
                flat
                color="primary"
                icon="visibility"
                label="View Details"
                @click="viewDataset(dataset)"
                class="col"
              />
              <DataExport
                :dataset-id="dataset.id"
                class="col"
              />
            </div>
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- Dataset Form Dialog -->
    <DatasetFormDialog
      v-model="showFormDialog"
      :dataset="selectedDataset"
      :loading="datasetStore.loading"
      @submit="handleFormSubmit"
      @cancel="handleFormCancel"
    />

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-icon name="warning" color="negative" size="2em" class="q-mr-md" />
          <div>
            <div class="text-h6">Delete Dataset</div>
            <div class="text-body2 q-mt-sm">
              Are you sure you want to delete "<strong>{{ datasetToDelete?.name }}</strong
              >"?
              <br />
              This action cannot be undone and will permanently remove all data in this dataset.
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            label="Cancel"
            color="grey"
            flat
            @click="showDeleteDialog = false"
            :disable="datasetStore.loading"
          />
          <q-btn
            label="Delete"
            color="negative"
            @click="handleDelete"
            :loading="datasetStore.loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import type { DatasetResponse } from '@/shared/api-schemas/dataset.api-schema';
import { useDataStore } from '@/stores/data.store';
import { useDatasetStore } from '@/stores/dataset.store';
import { formatDateDistance } from '@/utils/date-formatter';
import DataExport from 'src/components/data/DataExport.vue';
import DatasetFormDialog from 'src/components/dataset/DatasetFormDialog.vue';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

defineOptions({
  name: 'DatasetManagementPage',
});

const router = useRouter();
const datasetStore = useDatasetStore();
const dataStore = useDataStore();

// Dialog states
const showFormDialog = ref(false);
const showDeleteDialog = ref(false);
const selectedDataset = ref<DatasetResponse | null>(null);
const datasetToDelete = ref<DatasetResponse | null>(null);

// Lifecycle
onMounted(async () => {
  await datasetStore.loadDatasets();
});

// Methods
const openCreateDialog = () => {
  selectedDataset.value = null;
  showFormDialog.value = true;
};

const openEditDialog = (dataset: DatasetResponse) => {
  selectedDataset.value = dataset;
  showFormDialog.value = true;
};

const handleFormSubmit = async (data: { name: string; description?: string }) => {
  try {
    if (selectedDataset.value) {
      // Edit existing dataset
      await datasetStore.updateDataset(selectedDataset.value.id, data);
    } else {
      // Create new dataset
      await datasetStore.createDataset(data);
    }
    showFormDialog.value = false;
    selectedDataset.value = null;
  } catch {
    // Error is already handled in the store
  }
};

const handleFormCancel = () => {
  showFormDialog.value = false;
  selectedDataset.value = null;
};

const confirmDelete = (dataset: DatasetResponse) => {
  datasetToDelete.value = dataset;
  showDeleteDialog.value = true;
};

const handleDelete = async () => {
  if (!datasetToDelete.value) return;

  try {
    await datasetStore.deleteDataset(datasetToDelete.value.id);
    showDeleteDialog.value = false;
    datasetToDelete.value = null;
  } catch {
    // Error is already handled in the store
  }
};

const viewDataset = (dataset: DatasetResponse) => {
  // Set the dataset in both stores
  datasetStore.setCurrentDataset(dataset);
  dataStore.setCurrentDataset(dataset);
  void router.push('/data');
};
</script>

<style scoped></style>
