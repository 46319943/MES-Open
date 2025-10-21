<template>
  <q-dialog v-model="isVisible" v-bind="$attrs">
    <slot>
      <component :is="renderedComponent" />
    </slot>
  </q-dialog>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue';
import type { Component } from 'vue';

const props = defineProps<{ renderedComponent: Component | null }>();

// Local state for dialog visibility
const isVisible = ref(false);

// Watch for changes in renderedComponent and update dialog visibility
watch(
  () => props.renderedComponent,
  (newComponent) => {
    isVisible.value = !!newComponent;
  },
  { immediate: true }
);
</script>

<script lang="ts">
// Make the component inherit QDialog's attributes manually.
export default {
  inheritAttrs: false,
};
</script>
