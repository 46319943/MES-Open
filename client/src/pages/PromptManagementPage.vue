<template>
  <q-page :style-fn="pageStyleFn">
    <div class="row no-wrap full-height">
      <!-- Left Section - Prompt List View -->
      <div class="col-6 tw:border-r tw:border-gray-300">
        <PromptList
          @select-prompt="showEditSection = true"
          @create-prompt="showEditSection = true"
        />
      </div>

      <!-- Right Section - Create/Edit -->
      <div class="col-6 tw:bg-gray-50">
        <div
          v-if="!showEditSection"
          class="text-center q-py-xl full-height flex items-center justify-center"
        >
          <div>
            <q-icon name="touch_app" size="4em" color="grey-4" />
            <div class="text-h6 q-mt-md q-mb-sm text-grey-6">Select or Create Prompt</div>
            <p class="text-grey-5">Click on a prompt to edit it, or create a new one</p>
            <q-btn
              color="primary"
              icon="add"
              label="Create New Prompt"
              @click="showEditSection = true"
              class="q-mt-md"
            />
          </div>
        </div>

        <PromptEditor v-else :loading="promptStore.saveLoading" @close="showEditSection = false" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePromptStore } from '@/stores/prompt.store';
import PromptList from '@/components/prompt/PromptList.vue';
import PromptEditor from '@/components/prompt/PromptEditor.vue';
import { pageStyleFn } from '@/utils/page-height';

defineOptions({
  name: 'PromptManagementPage',
});

const promptStore = usePromptStore();

// Dialog states
const showEditSection = ref(false);

// Lifecycle
onMounted(async () => {
  await promptStore.loadPrompts();
});
</script>
