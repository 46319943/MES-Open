<template>
  <div
    ref="contentWrapper"
    class="rounded-borders"
    :class="{
      'cursor-pointer hover-effect': isContentOverflowing,
    }"
    :style="{
      /* Primary word breaking strategy */
      'overflow-wrap': 'break-word',
      /* Fallback for older browsers */
      'word-wrap': 'break-word',
      /* Handle CJK text appropriately */
      'word-break': 'normal',
      /* Ensure proper line height */
      'line-height': '1.5',
      /* Prevent text from being squeezed */
      'min-width': '0',
      'max-width': '100%',
      /* Line clamping - only applied when maxLines is provided */
      display: maxLines ? '-webkit-box' : 'block',
      '-webkit-line-clamp': maxLines || 'none',
      '-webkit-box-orient': maxLines ? 'vertical' : 'initial',
      overflow: maxLines ? 'hidden' : 'visible',
    }"
  >
    <div ref="contentElement">
      <slot></slot>
      <q-popup-proxy
        v-if="isContentOverflowing && showPopupOnOverflow"
        transition-show="scale"
        transition-hide="scale"
      >
        <q-card class="q-pa-md" :style="{ maxWidth: popupMaxWidth }">
          <div v-if="popupTitle" class="text-caption text-grey q-mb-sm">{{ popupTitle }}</div>
          <div
            style="
              /* Primary word breaking strategy */
              overflow-wrap: break-word;
              /* Fallback for older browsers */
              word-wrap: break-word;
              /* Handle CJK text appropriately */
              word-break: normal;
              /* Ensure proper line height */
              line-height: 1.5;
              /* Prevent text from being squeezed */
              min-width: 0;
              max-width: 100%;
            "
          >
            <slot name="popup-content">
              <slot></slot>
            </slot>
          </div>
        </q-card>
      </q-popup-proxy>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, readonly } from 'vue'

const props = withDefaults(
  defineProps<{
    maxLines?: number
    showPopupOnOverflow?: boolean
    popupTitle?: string
    popupMaxWidth?: string
  }>(),
  {
    showPopupOnOverflow: true,
    popupMaxWidth: '400px',
  },
)

const emit = defineEmits<{
  overflowStateChanged: [isOverflowing: boolean]
}>()

const contentWrapper = ref<HTMLElement | null>(null)
const contentElement = ref<HTMLElement | null>(null)
const isContentOverflowing = ref(false)

const checkOverflow = () => {
  if (!props.maxLines) {
    const wasOverflowing = isContentOverflowing.value
    isContentOverflowing.value = false
    if (wasOverflowing !== isContentOverflowing.value) {
      emit('overflowStateChanged', isContentOverflowing.value)
    }
    return
  }

  if (contentWrapper.value && contentElement.value) {
    // Get the actual content height and the visible container height
    const actualHeight = contentElement.value.scrollHeight
    const visibleHeight = contentWrapper.value.clientHeight
    const wasOverflowing = isContentOverflowing.value
    isContentOverflowing.value = actualHeight > visibleHeight

    if (wasOverflowing !== isContentOverflowing.value) {
      emit('overflowStateChanged', isContentOverflowing.value)
    }
  }
}

onMounted(() => {
  // Initial check
  checkOverflow()

  // Set up a ResizeObserver to check for changes
  const resizeObserver = new ResizeObserver(checkOverflow)
  if (contentElement.value) {
    resizeObserver.observe(contentElement.value)
  }
})

// Watch for changes in maxLines prop
watch(
  () => props.maxLines,
  () => {
    setTimeout(checkOverflow, 0) // Use setTimeout to ensure DOM updates are complete
  },
)

// Expose the overflow state for parent components that might need it
defineExpose({
  isContentOverflowing: readonly(isContentOverflowing),
})
</script>

<style scoped>
.hover-effect {
  transition: all 0.3s ease;
  border: 1px solid transparent;
}
.hover-effect:hover {
  opacity: 0.8;
  border-color: #ccc;
}
</style>
