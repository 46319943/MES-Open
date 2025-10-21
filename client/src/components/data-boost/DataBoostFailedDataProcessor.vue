<template>
  <q-card flat class="column">
    <q-card-section class="bg-warning text-white">
      <div class="text-h6">Failed Data Processing</div>
      <div class="text-body2">
        {{ failedDataItems.length }} data item{{ failedDataItems.length !== 1 ? 's' : '' }} require manual processing
      </div>
    </q-card-section>

    <q-card-section v-if="failedDataItems.length === 0" class="text-center q-py-xl">
      <q-icon name="check_circle" size="3em" color="positive" />
      <div class="text-h6 q-mt-md q-mb-sm text-positive">All Data Processed Successfully</div>
      <p class="text-grey-5">No failed data items require manual processing</p>
    </q-card-section>

    <q-card-section v-else class="col tw:overflow-y-auto tw:shrink tw:min-h-0">
      <!-- Current Item Processing -->
      <div v-if="currentItem" class="q-mb-md">
        <div class="text-subtitle2 q-mb-sm">
          Processing Item {{ currentIndex + 1 }} of {{ failedDataItems.length }}
        </div>

        <!-- Data Point Information -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle2 q-mb-sm">Original Data</div>
            <div class="tw:bg-gray-100 tw:p-3 tw:rounded text-body2">
              {{ currentItem.data.text }}
            </div>
          </q-card-section>
        </q-card>

        <!-- Error Information -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle2 q-mb-sm text-negative">
              <q-icon name="error" class="q-mr-sm" />
              Parsing Error
            </div>
            <div class="tw:bg-red-50 tw:p-3 tw:rounded text-body2 text-negative">
              {{ currentItem.error }}
            </div>
          </q-card-section>
        </q-card>

        <!-- LLM Response Editing -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle2 q-mb-sm">LLM Response</div>
            <q-input
              v-model="editedResponse"
              type="textarea"
              outlined
              label="Edit the LLM response to fix parsing issues"
              rows="10"
              class="q-mb-sm"
            />
          </q-card-section>
        </q-card>

        <!-- Action Buttons -->
        <div class="row q-gutter-sm">
          <q-btn
            color="primary"
            icon="refresh"
            label="Parse Again"
            @click="retryParsing"
            :loading="parsingLoading"
          />
          <q-btn
            color="negative"
            icon="skip_next"
            label="Skip This Item"
            @click="skipCurrentItem"
            outline
          />
          <q-btn
            color="warning"
            icon="clear_all"
            label="Clear All Failed Items"
            @click="clearAllFailedItems"
            outline
          />
        </div>
      </div>

      <!-- Progress Indicator -->
      <div v-if="failedDataItems.length > 1" class="q-mt-md">
        <q-separator />
        <div class="text-subtitle2 q-mt-md q-mb-sm">Progress</div>
        <q-linear-progress
          :value="currentIndex / failedDataItems.length"
          color="warning"
          size="20px"
          class="q-mb-sm"
        >
          <div class="absolute-full flex flex-center">
            <q-badge
              color="white"
              text-color="warning"
              :label="`${currentIndex} / ${failedDataItems.length}`"
            />
          </div>
        </q-linear-progress>
      </div>

      <!-- Processing History -->
      <div v-if="processingLogs.length > 0" class="q-mt-md">
        <q-separator />
        <div class="text-subtitle2 q-mt-md q-mb-sm">Processing History</div>
        <q-scroll-area style="height: 150px" class="tw:border tw:border-gray-300 tw:rounded">
          <div class="q-pa-sm">
            <div
              v-for="(log, index) in processingLogs"
              :key="index"
              class="text-caption q-mb-xs"
              :class="{
                'text-positive': log.type === 'success',
                'text-negative': log.type === 'error',
                'text-warning': log.type === 'warning',
                'text-grey-7': log.type === 'info',
              }"
            >
              [{{ log.timestamp }}] {{ log.message }}
            </div>
          </div>
        </q-scroll-area>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import type { OutputFormat } from '@/shared/models/output-format.model';
import dataApi from '@/shared/sdk/data.api';
import outputFormatApi from '@/shared/sdk/output-format.api';
import { useDataBoostStore } from '@/stores/data-boost.store';
import { parseCoTToSegments } from '@/utils/cot-parser';
import { useQuasar } from 'quasar';
import { computed, ref, watch } from 'vue';

const dataBoostStore = useDataBoostStore();
const $q = useQuasar();

// State
const currentIndex = ref(0);
const editedResponse = ref('');
const parsingLoading = ref(false);
const currentOutputFormat = ref<OutputFormat | null>(null);

// Processing logs
interface ProcessingLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

const processingLogs = ref<ProcessingLog[]>([]);

// Computed
const failedDataItems = computed(() => dataBoostStore.failedDataItemsForCurrentDataBoost);
const currentItem = computed(() => {
  if (currentIndex.value >= 0 && currentIndex.value < failedDataItems.value.length) {
    return failedDataItems.value[currentIndex.value];
  }
  return null;
});

// Methods
function addLog(type: ProcessingLog['type'], message: string) {
  const timestamp = new Date().toLocaleTimeString();
  processingLogs.value.push({ timestamp, type, message });

  // Keep only last 50 logs
  if (processingLogs.value.length > 50) {
    processingLogs.value = processingLogs.value.slice(-50);
  }
}

async function loadOutputFormat() {
  if (!dataBoostStore.selectedDataBoost) return;

  try {
    currentOutputFormat.value = await outputFormatApi.getOutputFormat(
      dataBoostStore.selectedDataBoost.outputFormatId
    );
  } catch (error) {
    addLog('error', `Failed to load output format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function retryParsing() {
  if (!currentItem.value || !currentOutputFormat.value) return;

  parsingLoading.value = true;

  try {
    // Try parsing with the edited response
    const segments = parseCoTToSegments(
      editedResponse.value,
      currentOutputFormat.value,
      currentItem.value.data.text,
      true // Enable error throwing for detailed error information
    );

    // Update the data point with parsed segments
    await dataApi.updateData(
      dataBoostStore.selectedDataBoost!.inputDatasetId,
      currentItem.value.data.id,
      { segments }
    );

    addLog('success', `Successfully processed data point: ${currentItem.value.data.text.substring(0, 50)}...`);

    $q.notify({
      type: 'positive',
      message: 'Data point processed successfully',
      position: 'top',
    });

    // Remove the successfully processed item and move to next
    const currentItemIndex = failedDataItems.value.findIndex(
      item => item.data.id === currentItem.value!.data.id
    );
    if (currentItemIndex !== -1) {
      dataBoostStore.removeFailedDataItem(currentItemIndex);
    }

    // Adjust current index if necessary
    if (currentIndex.value >= failedDataItems.value.length && failedDataItems.value.length > 0) {
      currentIndex.value = failedDataItems.value.length - 1;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    addLog('error', `Parsing failed: ${errorMessage}`);

    $q.notify({
      type: 'negative',
      message: `Parsing failed: ${errorMessage}`,
      position: 'top',
    });
  } finally {
    parsingLoading.value = false;
  }
}

function skipCurrentItem() {
  if (!currentItem.value) return;

  addLog('warning', `Skipped data point: ${currentItem.value.data.text.substring(0, 50)}...`);

  // Remove the current item
  const currentItemIndex = failedDataItems.value.findIndex(
    item => item.data.id === currentItem.value!.data.id
  );
  if (currentItemIndex !== -1) {
    dataBoostStore.removeFailedDataItem(currentItemIndex);
  }

  // Adjust current index if necessary
  if (currentIndex.value >= failedDataItems.value.length && failedDataItems.value.length > 0) {
    currentIndex.value = failedDataItems.value.length - 1;
  }

  $q.notify({
    type: 'warning',
    message: 'Data point skipped',
    position: 'top',
  });
}

function clearAllFailedItems() {
  $q.dialog({
    title: 'Clear All Failed Items',
    message: 'Are you sure you want to clear all failed data items? This action cannot be undone.',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    if (dataBoostStore.selectedDataBoost) {
      dataBoostStore.clearFailedDataItems(dataBoostStore.selectedDataBoost.id);
      currentIndex.value = 0;
      addLog('info', 'Cleared all failed data items');

      $q.notify({
        type: 'info',
        message: 'All failed data items cleared',
        position: 'top',
      });
    }
  });
}

// Watchers
watch(currentItem, (newItem) => {
  if (newItem) {
    editedResponse.value = newItem.llmResponse;
  }
}, { immediate: true });

watch(() => dataBoostStore.selectedDataBoost, async (newDataBoost) => {
  if (newDataBoost) {
    currentIndex.value = 0;
    await loadOutputFormat();
  }
}, { immediate: true });

// Reset index when failed items change
watch(failedDataItems, (newItems) => {
  if (newItems.length === 0) {
    currentIndex.value = 0;
  } else if (currentIndex.value >= newItems.length) {
    currentIndex.value = Math.max(0, newItems.length - 1);
  }
});
</script>
