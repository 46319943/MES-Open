<template>
  <div class="q-gutter-md">
    <!-- Server Status and Control Buttons -->
    <div class="row items-center q-gutter-sm">
      <!-- Server Status Display -->
      <div class="text-body2">
        <strong>Server Status:</strong>
        <q-chip :color="getStatusColor(serverStatus)" text-color="white" size="sm" class="q-ml-sm">
          {{ serverStatus }}
        </q-chip>
      </div>

      <!-- Server Control Buttons -->
      <q-btn
        color="positive"
        icon="play_arrow"
        label="Start Server"
        size="md"
        @click="startServer"
        :loading="startLoading"
        :disable="serverStatus === 'running' || serverStatus === 'starting' || !fineTuneStore.selectedFineTune"
      />
      <q-btn
        color="negative"
        icon="stop"
        label="Stop Server"
        size="md"
        @click="stopServer"
        :loading="stopLoading"
        :disable="serverStatus === 'not_running'"
        outline
      />
      <q-btn
        color="primary"
        icon="refresh"
        label="Check Status"
        size="md"
        @click="checkStatus"
        :loading="statusLoading"
        flat
      />
    </div>

    <!-- Server Information -->
    <q-card v-if="inferenceFineTune" flat bordered>
      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">Server Model Information</div>
        <div class="q-gutter-sm">
          <div class="row">
            <div class="col-4 text-weight-medium">Fine-tune Name:</div>
            <div class="col-8 tw:break-all tw:wrap-anywhere">
              {{ inferenceFineTune.fine_tune_name }}
            </div>
          </div>
          <div class="row">
            <div class="col-4 text-weight-medium">Base Model:</div>
            <div class="col-8 tw:break-all tw:wrap-anywhere">
              {{ inferenceFineTune.training_config.model_name }}
            </div>
          </div>
          <div class="row">
            <div class="col-4 text-weight-medium">Output Path:</div>
            <div class="col-8 text-mono text-caption tw:break-all tw:wrap-anywhere">
              {{ inferenceFineTune.output_path }}
            </div>
          </div>
          <div class="row">
            <div class="col-4 text-weight-medium">Status:</div>
            <div class="col-8">
              <q-chip
                :color="getFineTuneStatusColor(inferenceFineTune.status)"
                text-color="white"
                size="sm"
              >
                {{ inferenceFineTune.status }}
              </q-chip>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

  </div>
</template>

<script setup lang="ts">
import type { FineTuneRecord } from 'src/local/models/fine-tune.model';
import vllmApi from 'src/local/sdk/vllm.api';
import { useConsoleStore } from '@/stores/console.store';
import { useFineTuneStore } from '@/stores/fine-tune.store';
import { useQuasar } from 'quasar';
import { onMounted, onUnmounted, ref, watch } from 'vue';

defineOptions({
  name: 'VLLMServerControl',
});

// Props
defineProps<{
  inferenceFineTune: FineTuneRecord | null;
}>();

// Emits
const emit = defineEmits<{
  'server-status-changed': [isRunning: boolean];
  'server-start-initiated': [fineTune: FineTuneRecord];
  'server-stopped': [];
}>();

const $q = useQuasar();
const fineTuneStore = useFineTuneStore();
const consoleStore = useConsoleStore();

// Component state
const serverStatus = ref<string>('not_running');
const startLoading = ref(false);
const stopLoading = ref(false);
const statusLoading = ref(false);

// Auto-refresh interval
let statusInterval: NodeJS.Timeout | null = null;

// Methods
function getStatusColor(status: string): string {
  switch (status) {
    case 'running':
      return 'positive';
    case 'starting':
      return 'primary';
    case 'error':
      return 'negative';
    case 'stopped':
      return 'warning';
    default:
      return 'grey';
  }
}

function getFineTuneStatusColor(status: string): string {
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

function addLog(type: 'info' | 'success' | 'warning' | 'error', message: string) {
  consoleStore.addLog(type, message, 'VLLM Server');
}

async function startServer() {
  if (!fineTuneStore.selectedFineTune) {
    $q.notify({
      type: 'negative',
      message: 'No fine-tuned model selected',
      position: 'top',
    });
    return;
  }

  if (fineTuneStore.selectedFineTune.status !== 'completed') {
    $q.notify({
      type: 'negative',
      message: 'Selected fine-tune is not completed',
      position: 'top',
    });
    return;
  }

  startLoading.value = true;

  // Emit event immediately when start button is clicked
  emit('server-start-initiated', fineTuneStore.selectedFineTune);

  try {
    addLog('info', `Starting VLLM server for ${fineTuneStore.selectedFineTune.fine_tune_name}`);

    await vllmApi.startServer({
      fine_tune_name: fineTuneStore.selectedFineTune.fine_tune_name,
    });

    // Set status to starting and start monitoring
    serverStatus.value = 'starting';
    addLog('success', 'VLLM server start initiated');

    $q.notify({
      type: 'positive',
      message: 'VLLM server start initiated',
      position: 'top',
    });

    // Start auto-refresh to monitor server startup
    startStatusMonitoring();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addLog('error', `Failed to start server: ${errorMessage}`);

    $q.notify({
      type: 'negative',
      message: `Failed to start VLLM server: ${errorMessage}`,
      position: 'top',
    });
  } finally {
    startLoading.value = false;
  }
}

async function stopServer() {
  stopLoading.value = true;
  try {
    addLog('info', 'Stopping VLLM server');

    const response = await vllmApi.stopServer();

    serverStatus.value = response.status;
    addLog('success', response.message);

    $q.notify({
      type: 'positive',
      message: 'VLLM server stopped',
      position: 'top',
    });

    // Emit server stopped event
    emit('server-stopped');

    // Stop auto-refresh
    stopStatusMonitoring();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addLog('error', `Failed to stop server: ${errorMessage}`);

    $q.notify({
      type: 'negative',
      message: `Failed to stop VLLM server: ${errorMessage}`,
      position: 'top',
    });
  } finally {
    stopLoading.value = false;
  }
}

async function checkStatus() {
  statusLoading.value = true;
  try {
    const response = await vllmApi.getStatus();

    const oldStatus = serverStatus.value;
    serverStatus.value = response.status;

    // Log status changes
    if (oldStatus !== response.status) {
      addLog('info', `Server status changed: ${oldStatus} → ${response.status}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addLog('error', `Failed to check status: ${errorMessage}`);
  } finally {
    statusLoading.value = false;
  }
}

function startStatusMonitoring() {
  // Clear existing interval if any
  stopStatusMonitoring();

  // Check status every 3 seconds while server is starting or running
  statusInterval = setInterval(() => {
    if (serverStatus.value === 'starting' || serverStatus.value === 'running') {
      void checkStatus();
    } else if (serverStatus.value === 'not_running' || serverStatus.value === 'error') {
      stopStatusMonitoring();
    }
  }, 3000);
}

function stopStatusMonitoring() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

// Watch for server status changes and emit events
watch(serverStatus, (newStatus) => {
  const isRunning = newStatus === 'running';
  emit('server-status-changed', isRunning);
});

// Lifecycle
onMounted(() => {
  // Check initial status and start monitoring if needed
  void checkStatus().then(() => {
    if (serverStatus.value === 'running' || serverStatus.value === 'starting') {
      startStatusMonitoring();
    }
  });
});

onUnmounted(() => {
  stopStatusMonitoring();
});
</script>

<style scoped>
.text-mono {
  font-family: 'Courier New', monospace;
}
</style>
