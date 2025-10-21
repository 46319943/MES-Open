import type { Ref } from 'vue';
import { ref } from 'vue';

interface UseDraggableOptions {
  boundToWindow?: boolean;
}

export function useDraggable(
  elementId: string,
  left: Ref<number>,
  top: Ref<number>,
  options: UseDraggableOptions = {}
) {
  const isDragging = ref(false);

  const startDrag = (event: MouseEvent) => {
    // Only handle primary mouse button
    if (event.button !== 0) return;

    const element = document.getElementById(elementId);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const initialX = event.clientX - rect.left;
    const initialY = event.clientY - rect.top;

    const handleMouseMove = (e: MouseEvent) => {
      isDragging.value = true;
      let newX = e.clientX - initialX;
      let newY = e.clientY - initialY;

      if (options.boundToWindow) {
        const maxX = window.innerWidth - element.offsetWidth;
        const maxY = window.innerHeight - element.offsetHeight;
        newX = Math.min(Math.max(0, newX), maxX);
        newY = Math.min(Math.max(0, newY), maxY);
      }

      left.value = newX;
      top.value = newY;
    };

    const handleMouseUp = () => {
      isDragging.value = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return {
    isDragging,
    startDrag,
  };
}
