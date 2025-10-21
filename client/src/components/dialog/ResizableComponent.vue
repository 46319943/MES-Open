<template>
  <!-- Resize handles -->
  <div
    v-for="direction in directions"
    :key="direction"
    :class="['resize-handle', `resize-${direction}`]"
    @mousedown="(e) => startResize(direction, e)"
  ></div>
  <slot></slot>
</template>

<script setup lang="ts">
type Direction = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

const props = defineProps<{
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  left?: number;
  top?: number;
}>();

const emit = defineEmits<{
  'update:width': [value: number];
  'update:height': [value: number];
  'update:left': [value: number];
  'update:top': [value: number];
  'resize-start': [direction: Direction];
  resizing: [
    dimensions: { width: number; height: number; left: number; top: number }
  ];
  'resize-end': [
    dimensions: { width: number; height: number; left: number; top: number }
  ];
}>();

const directions: Direction[] = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];

const startResize = (direction: Direction, event: MouseEvent) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLElement;
  const container = target.parentElement;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const initialX = event.clientX;
  const initialY = event.clientY;
  const initialWidth = rect.width;
  const initialHeight = rect.height;
  const initialLeft = rect.left;
  const initialTop = rect.top;

  const minWidth = props.minWidth ?? 0;
  const minHeight = props.minHeight ?? 0;
  const maxWidth = props.maxWidth ?? window.innerWidth;
  const maxHeight = props.maxHeight ?? window.innerHeight;

  emit('resize-start', direction);

  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - initialX;
    const deltaY = e.clientY - initialY;

    let newWidth = initialWidth;
    let newHeight = initialHeight;
    let newLeft = initialLeft;
    let newTop = initialTop;

    // Handle horizontal resizing
    if (direction.includes('e')) {
      newWidth = Math.min(Math.max(initialWidth + deltaX, minWidth), maxWidth);
    } else if (direction.includes('w')) {
      const potentialWidth = initialWidth - deltaX;
      if (potentialWidth >= minWidth && potentialWidth <= maxWidth) {
        newWidth = potentialWidth;
        newLeft = initialLeft + deltaX;
      }
    }

    // Handle vertical resizing
    if (direction.includes('s')) {
      newHeight = Math.min(
        Math.max(initialHeight + deltaY, minHeight),
        maxHeight
      );
    } else if (direction.includes('n')) {
      const potentialHeight = initialHeight - deltaY;
      if (potentialHeight >= minHeight && potentialHeight <= maxHeight) {
        newHeight = potentialHeight;
        newTop = initialTop + deltaY;
      }
    }

    emit('update:width', newWidth);
    emit('update:height', newHeight);
    if (props.left !== undefined) emit('update:left', newLeft);
    if (props.top !== undefined) emit('update:top', newTop);

    emit('resizing', {
      width: newWidth,
      height: newHeight,
      left: newLeft,
      top: newTop,
    });
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';

    emit('resize-end', {
      width: props.width,
      height: props.height,
      left: props.left ?? 0,
      top: props.top ?? 0,
    });
  };

  document.body.style.cursor = getResizeCursor(direction);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

const getResizeCursor = (direction: Direction): string => {
  const cursorMap: Record<Direction, string> = {
    n: 'n-resize',
    s: 's-resize',
    e: 'e-resize',
    w: 'w-resize',
    nw: 'nw-resize',
    ne: 'ne-resize',
    sw: 'sw-resize',
    se: 'se-resize',
  };
  return cursorMap[direction];
};
</script>

<style scoped>
.resize-handle {
  position: absolute;
  background: transparent;
  z-index: 1;
}

/* Edges */
.resize-n {
  top: 0;
  left: 4px;
  right: 4px;
  height: 4px;
  cursor: n-resize;
}

.resize-s {
  bottom: 0;
  left: 4px;
  right: 4px;
  height: 4px;
  cursor: s-resize;
}

.resize-e {
  top: 4px;
  right: 0;
  bottom: 4px;
  width: 4px;
  cursor: e-resize;
}

.resize-w {
  top: 4px;
  left: 0;
  bottom: 4px;
  width: 4px;
  cursor: w-resize;
}

/* Corners */
.resize-nw {
  top: 0;
  left: 0;
  width: 8px;
  height: 8px;
  cursor: nw-resize;
}

.resize-ne {
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  cursor: ne-resize;
}

.resize-sw {
  bottom: 0;
  left: 0;
  width: 8px;
  height: 8px;
  cursor: sw-resize;
}

.resize-se {
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  cursor: se-resize;
}

.resize-handle:hover {
  background: rgba(0, 0, 0, 0.1);
}
</style>
