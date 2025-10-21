<template>
  <div class="console-logger">
    <!-- Console Header -->
    <div class="console-header bg-grey-9 text-white q-pa-sm flex items-center justify-between">
      <div class="flex items-center q-gutter-sm">
        <q-icon name="terminal" size="sm" />
        <span class="text-subtitle2">Console</span>
        <q-badge v-if="logs.length > 0" :label="logs.length" color="primary" />
      </div>
      <div class="flex items-center q-gutter-xs">
        <!-- Category Filter -->
        <q-select
          v-if="availableCategories.length > 1"
          v-model="selectedCategory"
          :options="categoryOptions"
          emit-value
          map-options
          option-label="label"
          option-value="value"
          dense
          borderless
          dark
          style="min-width: 120px"
          @update:model-value="handleCategoryChange"
        >
          <template v-slot:prepend>
            <q-icon name="filter_list" size="xs" />
          </template>
        </q-select>

        <!-- Toggle visibility -->
        <q-btn
          :icon="isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_up'"
          flat
          dense
          size="sm"
          @click="toggleExpanded"
        />

        <!-- Clear logs -->
        <q-btn
          icon="clear_all"
          flat
          dense
          size="sm"
          @click="handleClearLogs"
        >
        </q-btn>
      </div>
    </div>

    <!-- Console Content -->
    <div v-show="isExpanded" class="console-content">
      <q-scroll-area
        :style="{ height: consoleHeight + 'px' }"
        class="bg-grey-1"
      >
        <div class="q-pa-sm">
          <div v-if="filteredLogs.length === 0" class="text-center text-grey-5 q-py-md">
            <q-icon name="info" size="2em" class="q-mb-sm" />
            <div>No logs to display</div>
          </div>

          <div
            v-for="log in filteredLogs"
            :key="log.id"
            class="log-entry text-caption q-mb-xs q-pa-xs"
            :class="getLogClass(log.type)"
          >
            <span class="log-timestamp text-grey-6">[{{ log.timestamp }}]</span>
            <span v-if="log.category && showCategories" class="log-category q-mx-xs">
              <q-chip
                :label="log.category"
                size="sm"
                dense
                color="grey-4"
                text-color="grey-8"
              />
            </span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </q-scroll-area>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConsoleStore } from '@/stores/console.store';
import { computed, ref, watch } from 'vue';

defineOptions({
  name: 'ConsoleLogger',
});

// Props
const props = withDefaults(defineProps<{
  height?: number;
  defaultExpanded?: boolean;
  category?: string; // If provided, only show logs from this category
}>(), {
  height: 300,
  defaultExpanded: true,
});

const consoleStore = useConsoleStore();

// Component state
const isExpanded = ref(props.defaultExpanded);
const selectedCategory = ref<string | null>(null);
const consoleHeight = ref(props.height);

// Computed
const logs = computed(() => {
  if (props.category) {
    return consoleStore.getLogsByCategory(props.category);
  }
  return consoleStore.logs;
});

const availableCategories = computed(() => {
  const categories = new Set<string>();
  consoleStore.logs.forEach(log => {
    if (log.category) {
      categories.add(log.category);
    }
  });
  return Array.from(categories).sort();
});

const categoryOptions = computed(() => [
  { label: 'All Categories', value: null },
  ...availableCategories.value.map(cat => ({ label: cat, value: cat }))
]);

const showCategories = computed(() => {
  return !props.category && availableCategories.value.length > 1;
});

const filteredLogs = computed(() => {
  let filtered = logs.value;

  // Filter by selected category if not showing a specific category
  if (!props.category && selectedCategory.value) {
    filtered = filtered.filter(log => log.category === selectedCategory.value);
  }

  return filtered;
});

// Methods
function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function handleClearLogs() {
  if (props.category) {
    consoleStore.clearLogsByCategory(props.category);
  } else if (selectedCategory.value) {
    consoleStore.clearLogsByCategory(selectedCategory.value);
  } else {
    consoleStore.clearLogs();
  }
}

function handleCategoryChange() {
  // Category filter changed, no additional logic needed
}

function getLogClass(type: string) {
  return {
    'text-positive': type === 'success',
    'text-negative': type === 'error',
    'text-warning': type === 'warning',
    'text-grey-7': type === 'info',
  };
}

// Watch for new logs and auto-scroll to bottom
watch(
  () => filteredLogs.value.length,
  () => {
    // Auto-expand console when new logs arrive if collapsed
    if (!isExpanded.value && filteredLogs.value.length > 0) {
      // Only expand for error logs or if there are very few logs
      const hasErrors = filteredLogs.value.some(log => log.type === 'error');
      if (hasErrors || filteredLogs.value.length <= 5) {
        isExpanded.value = true;
      }
    }
  },
  { flush: 'post' }
);
</script>

<style scoped>
.console-logger {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.console-header {
  min-height: 40px;
}

.log-entry {
  font-family: 'Courier New', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.2;
  border-bottom: 1px solid #f0f0f0;
}

.log-entry:hover {
  background-color: #f5f5f5;
}

.log-timestamp {
  white-space: nowrap;
}

.log-category {
  display: inline-block;
}

.log-message {
  word-break: break-word;
}
</style>
