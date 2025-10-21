<template>
  <div class="text-segment-container">
    <div class="text-content" ref="textContentRef" @click="handleTextClick">
      <template v-for="(segment, index) in segments" :key="index">
        <!-- Segment separator (except for first segment) -->
        <span v-if="index > 0" class="segment-separator">
          <span class="separator-line"></span>
          <span class="separator-label">{{ index }}</span>
        </span>

        <!-- Segment content -->
        <span
          class="text-segment"
          :class="{ 'segment-highlighted': highlightedSegment === index }"
          @mouseenter="highlightedSegment = index"
          @mouseleave="highlightedSegment = null"
        >
          {{ getSegmentText(segment) }}
        </span>
      </template>

      <!-- Click indicator -->
      <div
        v-if="clickPosition !== null"
        class="click-indicator"
        :style="{ left: clickPosition.x + 'px', top: clickPosition.y + 'px' }"
      >
        <div class="indicator-dot"></div>
      </div>
    </div>

    <!-- Toolbar Section -->
    <div class="toolbar-section">
      <div class="toolbar-content">
        <div class="toolbar-info">
          <span v-if="clickPosition !== null" class="text-caption text-grey-6">
            Split position: {{ clickPosition.textIndex }}
          </span>
          <span v-else class="text-caption text-grey-5">
            Click on text to select split position
          </span>
        </div>
        <q-btn
          size="sm"
          color="primary"
          icon="content_cut"
          label="Split at Position"
          @click="splitAtPosition"
          :disable="clickPosition === null"
          no-caps
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { DataSegment } from '@/shared/models/data.model';

interface Props {
  text: string;
  segments: DataSegment[];
}

interface Emits {
  (e: 'update:segments', segments: DataSegment[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// State
const textContentRef = ref<HTMLElement | null>(null);
const clickPosition = ref<{ x: number; y: number; textIndex: number } | null>(null);
const highlightedSegment = ref<number | null>(null);

// Computed
const sortedSegments = computed(() => {
  return [...props.segments].sort((a, b) => a.indexStart - b.indexStart);
});

// Methods
const getSegmentText = (segment: DataSegment) => {
  return props.text.slice(segment.indexStart, segment.indexEnd);
};

const handleTextClick = (event: MouseEvent) => {
  if (!textContentRef.value) return;

  // Get the click position relative to the text content
  const rect = textContentRef.value.getBoundingClientRect();
  const relativeX = event.clientX - rect.left;
  const relativeY = event.clientY - rect.top;

  // Find the text index at the click position
  const textIndex = getTextIndexAtPosition(event);

  if (textIndex !== null) {
    clickPosition.value = {
      x: relativeX,
      y: relativeY,
      textIndex,
    };

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (clickPosition.value?.textIndex === textIndex) {
        clickPosition.value = null;
      }
    }, 5000);
  }
};

const getTextIndexAtPosition = (event: MouseEvent): number | null => {
  if (!textContentRef.value) return null;

  // Try to get a range from the click position
  let range: Range | null = null;

  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
  } else {
    // Fallback for browsers that don't support caretRangeFromPoint
    // Use a simpler approach - estimate position based on click coordinates
    const rect = textContentRef.value.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;

    // Simple estimation - this is less accurate but avoids TypeScript issues
    const textLength = props.text.length;
    const estimatedIndex = Math.min(
      textLength - 1,
      Math.max(0, Math.floor((relativeX / rect.width) * textLength)),
    );

    return estimatedIndex;
  }

  if (!range) return null;

  // Calculate the text index based on the range
  let textIndex = 0;
  const walker = document.createTreeWalker(textContentRef.value, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      // Only accept text nodes that are inside elements with class 'text-segment'
      // This excludes text nodes from separator elements
      const parent = node.parentElement;
      if (parent && parent.classList.contains('text-segment')) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_REJECT;
    },
  });

  let node;
  while ((node = walker.nextNode())) {
    if (node === range.startContainer) {
      return textIndex + range.startOffset;
    }
    textIndex += node.textContent?.length || 0;
  }

  return textIndex;
};

const splitAtPosition = () => {
  if (!clickPosition.value) return;

  const splitIndex = clickPosition.value.textIndex;
  const newSegments: DataSegment[] = [];

  // Find which segment contains the split position
  for (const segment of sortedSegments.value) {
    if (splitIndex >= segment.indexStart && splitIndex < segment.indexEnd) {
      // Split this segment
      if (splitIndex > segment.indexStart) {
        // Create first part of the split segment (inclusive start, exclusive end)
        newSegments.push({
          indexStart: segment.indexStart,
          indexEnd: splitIndex,
          annotations: [...segment.annotations], // Copy annotations to first part
        });
      }

      if (splitIndex < segment.indexEnd) {
        // Create second part of the split segment (inclusive start, exclusive end)
        newSegments.push({
          indexStart: splitIndex,
          indexEnd: segment.indexEnd,
          annotations: [], // Second part starts with no annotations
        });
      }
    } else {
      // Keep other segments as they are
      newSegments.push({ ...segment });
    }
  }

  // Sort segments by start index
  newSegments.sort((a, b) => a.indexStart - b.indexStart);

  // Emit the updated segments
  emit('update:segments', newSegments);

  // Hide the click indicator
  clickPosition.value = null;
};
</script>

<style scoped>
.text-segment-container {
  position: relative;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: #fafafa;
  min-height: 120px;
}

.text-content {
  padding: 16px;
  cursor: text;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  position: relative;
}

.text-segment {
  position: relative;
  transition: background-color 0.2s ease;
}

.text-segment.segment-highlighted {
  background-color: rgba(25, 118, 210, 0.1);
  border-radius: 2px;
}

.segment-separator {
  display: inline-flex;
  align-items: center;
  position: relative;
  margin: 0 4px;
  vertical-align: middle;
}

.separator-line {
  width: 2px;
  height: 20px;
  background: linear-gradient(to bottom, transparent, #2196f3, transparent);
  border-radius: 1px;
}

.separator-label {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #2196f3;
  color: white;
  padding: 1px 4px;
  border-radius: 6px;
  font-size: 8px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  min-width: 12px;
  text-align: center;
}

.click-indicator {
  position: absolute;
  z-index: 10;
  pointer-events: none;
}

.indicator-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #2196f3;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: pulse 1.5s infinite;
}

.toolbar-section {
  border-top: 1px solid #e0e0e0;
  background-color: #f8f9fa;
  padding: 12px 16px;
}

.toolbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toolbar-info {
  flex: 1;
  min-width: 0;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(33, 150, 243, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(33, 150, 243, 0);
  }
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .toolbar-info {
    text-align: center;
  }

  .separator-line {
    height: 16px;
  }

  .separator-label {
    font-size: 7px;
    padding: 1px 3px;
    top: -6px;
  }
}
</style>
