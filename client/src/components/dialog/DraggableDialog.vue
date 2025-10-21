<template>
  <q-dialog v-model="dialogVisible" persistent seamless position="standard">
    <q-card
      :id="dialogId"
      class="draggable-dialog-card column no-wrap"
      :style="{
        maxHeight: maxHeight + 'px',
        maxWidth: maxWidth + 'px',
        width: dialogWidth + 'px',
        height: dialogHeight + 'px',
        left: dialogLeft + 'px',
        top: dialogTop + 'px',
        position: 'fixed',
        overflow: 'hidden',
      }"
    >
      <resizable-component
        v-model:width="dialogWidth"
        v-model:height="dialogHeight"
        v-model:left="dialogLeft"
        v-model:top="dialogTop"
        :min-width="props.minWidth"
        :min-height="props.minHeight"
        :max-width="maxWidth"
        :max-height="maxHeight"
      >
        <!-- Header Section -->
        <div
          class="dialog-header q-pa-sm row items-center bg-white cursor-move"
          @mousedown="startDrag"
        >
          <slot name="header">
            <div class="text-h6">Dialog Header</div>
          </slot>
          <q-space />
          <q-btn icon="close" flat round dense @click="handleClose" />
        </div>

        <q-separator />

        <!-- Body Section with Scroll Area -->
        <q-scroll-area class="col">
          <div class="q-pa-md">
            <slot name="body">Dialog Content</slot>
          </div>
        </q-scroll-area>

        <q-separator />

        <!-- Footer Section -->
        <template v-if="$slots.footer">
          <div class="q-pa-md bg-white">
            <slot name="footer"></slot>
          </div>
        </template>
      </resizable-component>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, provide, onUnmounted } from 'vue'
import ResizableComponent from './ResizableComponent.vue'
import { useDraggable } from '@/composables/dialog/useDraggable'

interface DialogProps {
  modelValue: boolean
  initialWidth?: number
  initialHeight?: number
  initialLeft?: number
  initialTop?: number
  minWidth?: number
  minHeight?: number
}

const props = withDefaults(defineProps<DialogProps>(), {
  initialWidth: 600,
  initialHeight: 400,
  minWidth: 300,
  minHeight: 200,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

// Interface for child component callbacks
type CloseValidationCallback = () => Promise<boolean>

// Store for child component callbacks
const childCallbacks = ref<Set<CloseValidationCallback>>(new Set())

// Provide functions for child components to bind/unbind
const bindChild = (callback: CloseValidationCallback) => {
  childCallbacks.value.add(callback)
}

const unbindChild = (callback: CloseValidationCallback) => {
  childCallbacks.value.delete(callback)
}

// Provide the bind/unbind functions to child components
provide('dialogBindChild', bindChild)
provide('dialogUnbindChild', unbindChild)

// Generate a unique ID for this dialog instance
const dialogId = `draggable-dialog-${Math.random().toString(36).substring(2, 11)}`

// Calculate default positions if not provided
const defaultLeft = window.innerWidth * 0.05
const defaultTop = window.innerHeight * 0.05

// Initialize with props or default values for positions (which don't have defaults in withDefaults)
const dialogWidth = ref(props.initialWidth)
const dialogHeight = ref(props.initialHeight)
const dialogLeft = ref(props.initialLeft !== undefined ? props.initialLeft : defaultLeft)
const dialogTop = ref(props.initialTop !== undefined ? props.initialTop : defaultTop)
const maxWidth = computed(() => window.innerWidth * 0.9)
const maxHeight = computed(() => window.innerHeight * 0.9)

// Use the draggable composable with direct ref passing
const { startDrag } = useDraggable(dialogId, dialogLeft, dialogTop, {
  boundToWindow: true,
})

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Clean up callbacks when dialog is unmounted
onUnmounted(() => {
  childCallbacks.value.clear()
})

onMounted(() => {
  // Only apply getBoundingClientRect if initial left or top positions weren't provided
  if (props.initialLeft === undefined || props.initialTop === undefined) {
    const dialog = document.getElementById(dialogId)
    if (dialog) {
      const rect = dialog.getBoundingClientRect()

      // Only update position values that weren't provided as props
      if (props.initialLeft === undefined) dialogLeft.value = rect.left
      if (props.initialTop === undefined) dialogTop.value = rect.top
    }
  }
})

const handleClose = async () => {
  // Execute all child callbacks
  const results = await Promise.all(Array.from(childCallbacks.value).map((callback) => callback()))

  // Only close if all callbacks return true
  if (results.every((result) => result === true)) {
    emit('close')
  }
}
</script>

<style scoped>
.draggable-dialog-card {
  position: fixed;
  overflow: hidden;
}

.dialog-header {
  user-select: none;
}

.cursor-move {
  cursor: move;
}
</style>
