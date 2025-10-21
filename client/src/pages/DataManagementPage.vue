<template>
  <q-page :style-fn="pageStyleFn">
    <div class="row no-wrap full-height">
      <!-- Left Section - Data List View -->
      <DataList
        class="col-6 tw:border-r tw:border-gray-300 full-height"
        @select-data="showEditSection = true"
        @create-data="showEditSection = true"
        @import-data="showImportDialog = true"
      />

      <!-- Right Section - Create/Edit -->
      <div class="col-6 tw:bg-gray-50">
        <div
          v-if="!showEditSection"
          class="text-center q-py-xl full-height flex items-center justify-center"
        >
          <div>
            <q-icon name="touch_app" size="4em" color="grey-4" />
            <div class="text-h6 q-mt-md q-mb-sm text-grey-6">Select or Create Data</div>
            <p class="text-grey-5">Click on a data entry to edit it, or create a new one</p>
            <q-btn
              color="primary"
              icon="add"
              label="Create New Data"
              @click="showEditSection = true"
              class="q-mt-md"
            />
          </div>
        </div>

        <DataCreateEdit
          v-else
          :data="dataStore.selectedData"
          :loading="dataStore.saveLoading"
          @close="showEditSection = false"
        />
      </div>
    </div>

    <!-- Import Data Dialog -->
    <q-dialog v-model="showImportDialog" persistent>
      <DataImport @import-completed="handleImportCompleted" @close="showImportDialog = false" />
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useDataStore } from '@/stores/data.store';
import DataCreateEdit from '@/components/data/DataCreateEdit.vue';
import DataList from '@/components/data/DataList.vue';
import DataImport from '@/components/data/DataImport.vue';
import { pageStyleFn } from '@/utils/page-height';

defineOptions({
  name: 'DataManagementPage',
});

const dataStore = useDataStore();

// Dialog states
const showEditSection = ref(false);
const showImportDialog = ref(false);

// Event handlers
function handleImportCompleted() {
  showImportDialog.value = false;
}
</script>
