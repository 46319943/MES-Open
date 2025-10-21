import { inject, onMounted, onUnmounted } from 'vue'

type CloseValidationCallback = () => Promise<boolean>

export function useDialogChild(validationCallback: CloseValidationCallback) {
  const bindChild = inject<((callback: CloseValidationCallback) => void) | null>(
    'dialogBindChild',
    null,
  )
  const unbindChild = inject<((callback: CloseValidationCallback) => void) | null>(
    'dialogUnbindChild',
    null,
  )

  if (!bindChild || !unbindChild) {
    console.info('useDialogChild is currently not used within a DraggableDialog component')
    return
  }

  onMounted(() => {
    bindChild(validationCallback)
  })

  onUnmounted(() => {
    unbindChild(validationCallback)
  })
}
