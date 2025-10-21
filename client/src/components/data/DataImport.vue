<template>
  <q-card class="q-pa-md" style="min-width: 500px">
    <q-card-section>
      <div class="text-h6 q-mb-md">Import Data</div>

      <!-- Step 1: File Selection -->
      <div v-if="currentStep === 'file-selection'">
        <div class="text-subtitle2 q-mb-md">Select Data File</div>
        <q-file v-model="selectedFile" accept=".json,.jsonl" label="Choose JSON or JSONL file" outlined clearable
          @update:model-value="handleFileSelect" :error="!!fileError" :error-message="fileError">
          <template v-slot:prepend>
            <q-icon name="attach_file" />
          </template>
        </q-file>

        <div v-if="selectedFile" class="q-mt-md">
          <q-banner class="bg-blue-1 text-blue-9 q-mb-md">
            <template v-slot:avatar>
              <q-icon name="info" />
            </template>
            File selected: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
            <br>
            <span class="text-caption">Type: {{ getFileType(selectedFile.name) }}</span>
          </q-banner>
        </div>
      </div>

      <!-- Step 2: Field Mapping -->
      <div v-if="currentStep === 'field-mapping'">
        <div class="text-subtitle2 q-mb-md">Map Fields</div>

        <div v-if="availableFields.length === 0" class="text-center q-py-lg">
          <q-icon name="warning" size="3em" color="orange" />
          <div class="text-h6 q-mt-md">No fields found</div>
          <div class="text-body2 text-grey-6">
            The JSON file doesn't contain any valid data objects.
          </div>
        </div>

        <div v-else>
          <q-banner class="bg-green-1 text-green-9 q-mb-md">
            <template v-slot:avatar>
              <q-icon name="check_circle" />
            </template>
            Found {{ jsonData.length }} data objects with {{ availableFields.length }} unique fields
          </q-banner>

          <div class="q-gutter-md">
            <!-- Required Text Field Mapping -->
            <div>
              <q-select v-model="textFieldMapping" :options="fieldOptions" label="Text Field (Required)" outlined
                emit-value map-options :error="!textFieldMapping" error-message="Text field mapping is required">
                <template v-slot:prepend>
                  <q-icon name="text_fields" />
                </template>
              </q-select>
            </div>

            <!-- Optional Segments Field Mapping -->
            <div>
              <q-select v-model="segmentsFieldMapping" :options="fieldOptions" label="Segments Field (Optional)"
                outlined emit-value map-options clearable>
                <template v-slot:prepend>
                  <q-icon name="segment" />
                </template>
              </q-select>
            </div>

            <!-- Upload Progress -->
            <div v-if="importing && importProgress.total > 0" class="q-mt-lg">
              <div class="text-subtitle2 q-mb-md">Upload Progress</div>
              <q-linear-progress :value="importProgress.current / importProgress.total" color="primary" size="20px"
                rounded class="q-mb-sm" />
              <div class="text-caption text-center">
                Batch {{ importProgress.current }} of {{ importProgress.total }}
                ({{ Math.round((importProgress.current / importProgress.total) * 100) }}%)
              </div>
            </div>

            <!-- Preview -->
            <div v-if="textFieldMapping && !importing" class="q-mt-lg">
              <div class="text-subtitle2 q-mb-md">Preview (First 3 items)</div>
              <q-list bordered separator>
                <q-item v-for="(item, index) in previewItems" :key="index" class="q-py-md">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">
                      {{ truncateText(item.text, 100) }}
                    </q-item-label>
                    <q-item-label caption>
                      <div class="q-mt-xs">
                        <span class="text-blue-7">Segments:</span>
                        {{ item.segments?.length || 0 }} |
                        <span class="text-purple-7">Metadata fields:</span>
                        {{ Object.keys(item.metaData).length }}
                      </div>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </div>
      </div>
    </q-card-section>

    <q-card-actions align="right" class="q-pa-md">
      <q-btn label="Cancel" color="grey" flat @click="emit('close')" />
      <q-btn v-if="currentStep === 'file-selection'" label="Next" color="primary" @click="processFile"
        :disable="!selectedFile" :loading="processing" />
      <q-btn v-if="currentStep === 'field-mapping'" label="Back" flat @click="goBackToFileSelection"
        :disable="importing" />
      <q-btn v-if="currentStep === 'field-mapping'" :label="importing && importProgress.total > 0
        ? `Importing... (${importProgress.current}/${importProgress.total})`
        : 'Import Data'" color="primary" @click="importData"
        :disable="!textFieldMapping || availableFields.length === 0" :loading="importing" />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDataStore } from '@/stores/data.store';
import { useErrorStore } from '@/stores/error.store';
import dataApi from '@/shared/sdk/data.api';
import type { DataSegment } from '@/shared/models/data.model';
import { useQuasar } from 'quasar';

interface Emits {
  (e: 'import-completed'): void;
  (e: 'close'): void;
}

const emit = defineEmits<Emits>();
const dataStore = useDataStore();
const errorStore = useErrorStore();
const $q = useQuasar();

// Constants
const BATCH_SIZE = 5000;

// State
const currentStep = ref<'file-selection' | 'field-mapping'>('file-selection');
const selectedFile = ref<File | null>(null);
const fileError = ref('');
const processing = ref(false);
const importing = ref(false);
const importProgress = ref({ current: 0, total: 0 });
const jsonData = ref<Record<string, unknown>[]>([]);
const availableFields = ref<string[]>([]);
const textFieldMapping = ref<string>('');
const segmentsFieldMapping = ref<string>('');
const isJsonlFile = ref(false);
const jsonlTotalLines = ref(0);

// Computed
const fieldOptions = computed(() =>
  availableFields.value.map((field) => ({
    label: field,
    value: field,
  })),
);

const previewItems = computed(() => {
  if (!textFieldMapping.value) return [];

  return jsonData.value.slice(0, 3).map((item) => {
    const textValue = item[textFieldMapping.value];
    const text =
      typeof textValue === 'string'
        ? textValue
        : typeof textValue === 'number'
          ? String(textValue)
          : textValue
            ? JSON.stringify(textValue)
            : '';
    const segments =
      segmentsFieldMapping.value && Array.isArray(item[segmentsFieldMapping.value])
        ? item[segmentsFieldMapping.value]
        : [];

    // Create metadata by excluding mapped fields
    const metaData = { ...item };
    delete metaData[textFieldMapping.value];
    if (segmentsFieldMapping.value) {
      delete metaData[segmentsFieldMapping.value];
    }

    // If original item has metaData field, merge it
    if (item.metaData && typeof item.metaData === 'object') {
      Object.assign(metaData, item.metaData);
      delete metaData.metaData;
    }

    return {
      text,
      segments: segments as unknown[],
      metaData,
    };
  });
});

// Methods
function handleFileSelect() {
  fileError.value = '';
  if (selectedFile.value) {
    isJsonlFile.value = selectedFile.value.name.toLowerCase().endsWith('.jsonl');
  }
}

function getFileType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  return ext === 'jsonl' ? 'JSONL (Line-delimited JSON)' : 'JSON (Array format)';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

async function processFile() {
  if (!selectedFile.value) return;

  processing.value = true;
  fileError.value = '';

  try {
    if (isJsonlFile.value) {
      await processJsonlFile();
    } else {
      await processJsonFile();
    }

    currentStep.value = 'field-mapping';
  } catch (error) {
    if (error instanceof SyntaxError) {
      fileError.value = 'Invalid file format';
    } else {
      fileError.value = 'Failed to read file';
    }
  } finally {
    processing.value = false;
  }
}

async function processJsonFile() {
  if (!selectedFile.value) return;

  const fileContent = await readFileAsText(selectedFile.value);
  const parsedData = JSON.parse(fileContent);

  // Validate that it's an array
  if (!Array.isArray(parsedData)) {
    fileError.value = 'JSON file must contain an array of objects';
    return;
  }

  if (parsedData.length === 0) {
    fileError.value = 'JSON array cannot be empty';
    return;
  }

  // Extract all available fields from the data objects
  const fieldsSet = new Set<string>();
  parsedData.forEach((item) => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach((key) => fieldsSet.add(key));
    }
  });

  jsonData.value = parsedData.filter((item) => typeof item === 'object' && item !== null);
  availableFields.value = Array.from(fieldsSet).sort();

  // Auto-select common field names
  if (availableFields.value.includes('text')) {
    textFieldMapping.value = 'text';
  }
  if (availableFields.value.includes('segments')) {
    segmentsFieldMapping.value = 'segments';
  }
}

async function processJsonlFile() {
  if (!selectedFile.value) return;

  // For JSONL, we'll read the first few lines to determine fields
  const previewData: Record<string, unknown>[] = [];
  const fieldsSet = new Set<string>();

  // Read first 100 lines to determine field structure
  const lines = await readJsonlLinesStream(selectedFile.value, 0, 100);

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (typeof parsed === 'object' && parsed !== null) {
        previewData.push(parsed);
        Object.keys(parsed).forEach((key) => fieldsSet.add(key));
      }
    } catch {
      // Skip invalid JSON lines
      continue;
    }
  }

  if (previewData.length === 0) {
    fileError.value = 'JSONL file contains no valid JSON objects';
    return;
  }

  // Count total lines for progress tracking
  jsonlTotalLines.value = await countJsonlLinesStream(selectedFile.value);

  jsonData.value = previewData;
  availableFields.value = Array.from(fieldsSet).sort();

  // Auto-select common field names
  if (availableFields.value.includes('text')) {
    textFieldMapping.value = 'text';
  }
  if (availableFields.value.includes('segments')) {
    segmentsFieldMapping.value = 'segments';
  }
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

async function readJsonlLinesStream(file: File, startLine: number, maxLines: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let currentLine = 0;
    const targetLines: string[] = [];

    const chunkSize = 1024 * 1024; // 1MB chunks
    let offset = 0;
    let buffer = '';

    function readChunk() {
      const end = Math.min(offset + chunkSize, file.size);
      const blob = file.slice(offset, end);

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          buffer += e.target.result as string;
          const newLines = buffer.split('\n');

          // Keep the last partial line in buffer
          buffer = newLines.pop() || '';

          // Process complete lines
          for (const line of newLines) {
            if (line.trim() !== '') {
              if (currentLine >= startLine && currentLine < startLine + maxLines) {
                targetLines.push(line);
              }
              currentLine++;
            }
          }

          // Continue reading if we need more data and haven't reached the end
          if (end < file.size && targetLines.length < maxLines) {
            offset = end;
            readChunk();
          } else {
            resolve(targetLines);
          }
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(blob);
    }

    readChunk();
  });
}

async function countJsonlLinesStream(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    let lineCount = 0;
    const chunkSize = 1024 * 1024; // 1MB chunks
    let offset = 0;
    let buffer = '';

    function readChunk() {
      const end = Math.min(offset + chunkSize, file.size);
      const blob = file.slice(offset, end);

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          buffer += e.target.result as string;
          const newLines = buffer.split('\n');

          // Keep the last partial line in buffer
          buffer = newLines.pop() || '';

          // Count non-empty lines
          lineCount += newLines.filter(line => line.trim() !== '').length;

          // Continue reading if we haven't reached the end
          if (end < file.size) {
            offset = end;
            readChunk();
          } else {
            // Count the last line if it's not empty
            if (buffer.trim() !== '') {
              lineCount++;
            }
            resolve(lineCount);
          }
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(blob);
    }

    readChunk();
  });
}

async function* readJsonlFileStream(file: File, batchSize: number = 1000): AsyncGenerator<string[], void, unknown> {
  const chunkSize = 1024 * 1024; // 1MB chunks
  let offset = 0;
  let buffer = '';
  let currentBatch: string[] = [];

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const blob = file.slice(offset, end);

    // Read chunk synchronously using Promise
    const chunkContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(blob);
    });

    buffer += chunkContent;
    const newLines = buffer.split('\n');

    // Keep the last partial line in buffer
    buffer = newLines.pop() || '';

    // Process complete lines
    for (const line of newLines) {
      if (line.trim() !== '') {
        currentBatch.push(line);

        // Yield batch when it reaches the desired size
        if (currentBatch.length >= batchSize) {
          yield [...currentBatch];
          currentBatch = [];
        }
      }
    }

    offset = end;
  }

  // Yield any remaining lines in the final batch
  if (currentBatch.length > 0) {
    yield currentBatch;
  }

  // Handle any remaining content in buffer
  if (buffer.trim() !== '') {
    yield [buffer];
  }
}

function goBackToFileSelection() {
  currentStep.value = 'file-selection';
  jsonData.value = [];
  availableFields.value = [];
  textFieldMapping.value = '';
  segmentsFieldMapping.value = '';
  isJsonlFile.value = false;
  jsonlTotalLines.value = 0;
}

function splitIntoBatches<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

async function importData() {
  if (!textFieldMapping.value || !dataStore.currentDataset?.id || !selectedFile.value) return;

  importing.value = true;
  importProgress.value = { current: 0, total: 0 };

  try {
    if (isJsonlFile.value) {
      await importJsonlData();
    } else {
      await importJsonData();
    }

    // Refresh the data list
    await dataStore.loadData();

    emit('import-completed');
  } catch (error) {
    errorStore.addError(
      `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  } finally {
    importing.value = false;
    importProgress.value = { current: 0, total: 0 };
  }
}

async function importJsonData() {
  if (!dataStore.currentDataset?.id) return;

  // Transform JSON data to the format expected by the API
  const dataToImport = jsonData.value.map((item) => transformDataItem(item));

  // Split data into batches
  const batches = splitIntoBatches(dataToImport, BATCH_SIZE);
  importProgress.value.total = batches.length;

  let totalImported = 0;

  // Process each batch sequentially
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    if (!batch) continue; // Skip if batch is undefined

    importProgress.value.current = i + 1;

    // Call the API to create data for this batch
    await dataApi.createData(dataStore.currentDataset.id, {
      data: batch,
    });

    totalImported += batch.length;

    // Show progress notification for each batch (except the last one)
    if (i < batches.length - 1) {
      $q.notify({
        type: 'info',
        message: `Uploading batch ${i + 1}/${batches.length} (${batch.length} items)`,
        position: 'top',
        timeout: 1000,
      });
    }
  }

  $q.notify({
    type: 'positive',
    message: `Successfully imported ${totalImported} data entries in ${batches.length} batches`,
    position: 'top',
  });
}

async function importJsonlData() {
  if (!dataStore.currentDataset?.id || !selectedFile.value) return;

  let totalImported = 0;
  let batchCount = 0;
  const estimatedBatches = Math.ceil(jsonlTotalLines.value / BATCH_SIZE);

  // Process JSONL file iteratively
  for await (const lineBatch of readJsonlFileStream(selectedFile.value, BATCH_SIZE)) {
    const dataToImport: ReturnType<typeof transformDataItem>[] = [];

    // Parse each line in the batch
    for (const line of lineBatch) {
      try {
        const parsed = JSON.parse(line);
        if (typeof parsed === 'object' && parsed !== null) {
          dataToImport.push(transformDataItem(parsed));
        }
      } catch {
        // Skip invalid JSON lines
        continue;
      }
    }

    if (dataToImport.length === 0) continue;

    // Upload this batch
    await dataApi.createData(dataStore.currentDataset.id, {
      data: dataToImport,
    });

    totalImported += dataToImport.length;
    batchCount++;

    // Update progress
    importProgress.value = {
      current: batchCount,
      total: estimatedBatches
    };
  }

  $q.notify({
    type: 'positive',
    message: `Successfully imported ${totalImported} data entries from JSONL file in ${batchCount} batches`,
    position: 'top',
  });
}

function transformDataItem(item: Record<string, unknown>) {
  const textValue = item[textFieldMapping.value];
  const text =
    typeof textValue === 'string'
      ? textValue
      : typeof textValue === 'number'
        ? String(textValue)
        : textValue
          ? JSON.stringify(textValue)
          : '';

  // Handle segments
  let segments: DataSegment[] = [];
  if (segmentsFieldMapping.value && Array.isArray(item[segmentsFieldMapping.value])) {
    segments = (item[segmentsFieldMapping.value] as unknown[]).filter(
      (segment: unknown) =>
        segment &&
        typeof segment === 'object' &&
        segment !== null &&
        'indexStart' in segment &&
        'indexEnd' in segment &&
        'annotations' in segment &&
        typeof (segment as Record<string, unknown>).indexStart === 'number' &&
        typeof (segment as Record<string, unknown>).indexEnd === 'number' &&
        Array.isArray((segment as Record<string, unknown>).annotations),
    ) as DataSegment[];
  }

  // Create metadata by excluding mapped fields
  const metaData = { ...item };
  delete metaData[textFieldMapping.value];
  if (segmentsFieldMapping.value) {
    delete metaData[segmentsFieldMapping.value];
  }

  // If original item has metaData field, merge it
  if (item.metaData && typeof item.metaData === 'object') {
    Object.assign(metaData, item.metaData);
    delete metaData.metaData;
  }

  return {
    text,
    segments,
    metaData,
  };
}
</script>
