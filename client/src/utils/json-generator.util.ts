import type { Data } from '@/shared/models/data.model';
import type { OutputFormat } from '@/shared/models/output-format.model';
import { formatAnnotation } from './annotation-format.util';

/**
 * Interface for annotation with segment context (internal use only)
 */
interface AnnotationWithContext {
  annotation: Data['segments'][0]['annotations'][0];
  segmentIndex: number;
}

/**
 * Converts Data object to internal AnnotationWithContext array
 * @param data - Data object containing segments and annotations
 * @returns Array of annotations with their segment context
 */
function convertDataToAnnotationWithContext(data: Data): AnnotationWithContext[] {
  const annotationsWithContext: AnnotationWithContext[] = [];

  data.segments.forEach((segment, segmentIndex) => {
    segment.annotations.forEach((annotation) => {
      annotationsWithContext.push({
        annotation,
        segmentIndex,
      });
    });
  });

  return annotationsWithContext;
}

/**
 * Generates sense-prioritized JSON format where annotations are grouped by sense type
 * @param data - Data object containing segments and annotations
 * @param outputFormat - Output format configuration
 * @returns JSON string with annotations grouped by sense
 */
export function generateSensePrioritizedJson(
  data: Data,
  outputFormat: OutputFormat
): string {
  const annotations = convertDataToAnnotationWithContext(data);

  if (annotations.length === 0) {
    return 'No annotations to display';
  }

  const groupedBySense: Record<string, Array<Record<string, string>>> = {};

  annotations.forEach(({ annotation }) => {
    const formatted = formatAnnotation(annotation, outputFormat);
    const senseKey = outputFormat.senseName || 'sense';
    const senseValue = formatted[senseKey] || 'Unknown';

    if (!groupedBySense[senseValue]) {
      groupedBySense[senseValue] = [];
    }

    groupedBySense[senseValue].push(formatted);
  });

  return JSON.stringify(groupedBySense, null, 2);
}

/**
 * Generates order-preserving JSON format where annotations are kept in order of appearance
 * @param data - Data object containing segments and annotations
 * @param outputFormat - Output format configuration
 * @returns JSON string with annotations in order of appearance
 */
export function generateOrderPreservingJson(
  data: Data,
  outputFormat: OutputFormat
): string {
  const annotations = convertDataToAnnotationWithContext(data);

  if (annotations.length === 0) {
    return 'No annotations to display';
  }

  const orderedAnnotations = [...annotations]
    .sort((a, b) => a.segmentIndex - b.segmentIndex)
    .map(({ annotation }) => formatAnnotation(annotation, outputFormat));

  return JSON.stringify(orderedAnnotations, null, 2);
}

