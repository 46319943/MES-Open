<template>
  <q-card flat class="column">
    <q-card-section class="bg-accent text-white">
      <div class="text-h6">Output Preview</div>
    </q-card-section>

    <!-- Preview Type Selection -->
    <q-card-section class="q-pb-none full-width">
      <q-tabs
        v-model="selectedPreviewType"
        dense
        class="text-grey-6"
        active-color="primary"
        indicator-color="primary"
        align="justify"
      >
        <q-tab name="sense-prioritized" label="Sense-Prioritized JSON" />
        <q-tab name="order-preserving" label="Order-Preserving JSON" />
        <q-tab name="cot" label="Chain-of-Thought" />
      </q-tabs>
    </q-card-section>

    <!-- Preview Content -->
    <q-card-section class="col tw:overflow-y-auto tw:shrink tw:min-h-0" style="padding-top: 0">
      <q-tab-panels v-model="selectedPreviewType" animated class="full-height">
        <!-- Sense-Prioritized JSON -->
        <q-tab-panel name="sense-prioritized" class="q-pa-none full-height">
          <div class="full-height column">
            <div class="text-subtitle2 q-mb-sm text-grey-7">Annotations grouped by sense type</div>
            <pre class="preview-code">{{ sensePrioritizedJson }}</pre>
          </div>
        </q-tab-panel>

        <!-- Order-Preserving JSON -->
        <q-tab-panel name="order-preserving" class="q-pa-none full-height">
          <div class="full-height column">
            <div class="text-subtitle2 q-mb-sm text-grey-7">Annotations in order of appearance</div>
            <pre class="preview-code">{{ orderPreservingJson }}</pre>
          </div>
        </q-tab-panel>

        <!-- Chain-of-Thought -->
        <q-tab-panel name="cot" class="q-pa-none full-height">
          <div class="full-height column">
            <div class="text-subtitle2 q-mb-sm text-grey-7">Chain-of-Thought format</div>
            <div class="preview-text">{{ cotPreview }}</div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card-section>

    <!-- Empty State -->
    <div v-if="!hasValidData" class="absolute-center text-center" style="z-index: 1">
      <q-icon name="preview" size="4em" color="grey-4" />
      <div class="text-h6 q-mt-md q-mb-sm text-grey-6">No Preview Available</div>
      <p class="text-grey-5">Select both data and output format to see preview</p>
      <div class="q-mt-md text-caption text-grey-5">
        Selected Data: {{ dataStore.selectedData?.text?.substring(0, 50) || 'None'
        }}{{ dataStore.selectedData?.text && dataStore.selectedData.text.length > 50 ? '...' : '' }}
      </div>
      <div class="text-caption text-grey-5">
        Selected Format: {{ outputFormatStore.selectedOutputFormat?.name || 'None' }}
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { useDataStore } from '@/stores/data.store';
import { useOutputFormatStore } from '@/stores/output-format.store';
import { generateCoTString } from '@/utils/cot-generator';
import {
  generateOrderPreservingJson,
  generateSensePrioritizedJson,
} from '@/utils/json-generator.util';
import { computed, ref } from 'vue';

defineOptions({
  name: 'OutputFormatPreview',
});

const dataStore = useDataStore();
const outputFormatStore = useOutputFormatStore();

// State
const selectedPreviewType = ref<
  'sense-prioritized' | 'order-preserving' | 'cot'
>('sense-prioritized');

// Computed
const hasValidData = computed(() => {
  return !!(dataStore.selectedData && outputFormatStore.selectedOutputFormat);
});

// 1. Sense-Prioritized JSON
const sensePrioritizedJson = computed(() => {
  if (!hasValidData.value) {
    return 'No annotations to display';
  }

  const format = outputFormatStore.selectedOutputFormat!;
  const data = dataStore.selectedData!;
  return generateSensePrioritizedJson(data, format);
});

// 2. Order-Preserving JSON
const orderPreservingJson = computed(() => {
  if (!hasValidData.value) {
    return 'No annotations to display';
  }

  const format = outputFormatStore.selectedOutputFormat!;
  const data = dataStore.selectedData!;
  return generateOrderPreservingJson(data, format);
});

// 3. Chain-of-Thought Preview
const cotPreview = computed(() => {
  if (!hasValidData.value) {
    return 'No data or format selected';
  }

  const format = outputFormatStore.selectedOutputFormat!;
  const data = dataStore.selectedData!;

  return generateCoTString(data, format) || 'No CoT templates configured';
});
</script>

<style scoped>
.preview-code {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  color: #333;
}

.preview-text {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 16px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: #333;
}

.q-tab-panels {
  background: transparent;
}

.q-tab-panel {
  padding: 16px 0;
}
</style>
