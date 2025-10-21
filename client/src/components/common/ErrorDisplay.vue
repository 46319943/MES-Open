<template>
  <div
    v-if="errorStore.errors.length > 0"
    class="fixed-center text-center q-pa-md"
    style="
      z-index: 9999;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    "
  >
    <q-icon name="error_outline" size="4em" color="negative" class="q-mb-md" />
    <div class="text-h6 q-mb-md">Something went wrong</div>
    <div
      v-for="(error, index) in errorStore.errors"
      :key="index"
      class="text-body2 text-grey-6 q-mb-md"
    >
      {{ error }}
    </div>
    <q-btn color="primary" label="Close" @click="closeError" />
  </div>
</template>

<script setup lang="ts">
import { useErrorStore } from 'src/stores/error.store';

defineOptions({
  name: 'ErrorDisplay',
});

const errorStore = useErrorStore();

const closeError = () => {
  errorStore.clearErrors();
};
</script>
