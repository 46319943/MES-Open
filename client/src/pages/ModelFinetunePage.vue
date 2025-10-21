<template>
  <q-page :style-fn="pageStyleFn">
    <div class="row no-wrap full-height">
      <!-- Left Section - Fine-Tuning Configuration -->
      <FineTuneConfiguration class="col-5 tw:border-r tw:border-gray-300 full-height" />

      <!-- Right Section - Model Management -->
      <FineTuneManagement class="col-7 tw:bg-gray-50 full-height" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import FineTuneConfiguration from '@/components/fine-tune/FineTuneConfiguration.vue';
import FineTuneManagement from '@/components/fine-tune/FineTuneManagement.vue';
import { pageStyleFn } from '@/utils/page-height';

defineOptions({
  name: 'ModelFinetunePage',
});
</script>
