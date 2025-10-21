import type { Data } from '@/shared/models/data.model';
import type { OutputFormat } from '@/shared/models/output-format.model';

/**
 * Generates a Chain-of-Thought (CoT) string from data segments with proper annotation value mapping.
 *
 * This function correctly applies the annotation value mapping for both 'sense' and 'sentiment' fields
 * according to the output format configuration, ensuring that custom names are used consistently.
 *
 * @param data - The data object containing segments and annotations
 * @param outputFormat - The output format configuration with custom names and templates
 * @returns The generated CoT string
 */
export function generateCoTString(data: Data, outputFormat: OutputFormat): string {
  let result = '';

  // Add start template if exists
  if (outputFormat.CoTStartTemplate) {
    result += outputFormat.CoTStartTemplate + '\n';
  }

  // Process each segment
  for (const segment of data.segments) {
    const segmentText = data.text.slice(segment.indexStart, segment.indexEnd);

    if (segment.annotations.length === 0) {
      // Use not exist template
      if (outputFormat.CoTSentenceNotExistTemplate) {
        result +=
          outputFormat.CoTSentenceNotExistTemplate.replace(/\{\{\s*SENTENCE\s*\}\}/g, segmentText) +
          '\n';
      }
    } else {
      // Use exist template
      if (outputFormat.CoTSentenceExistTemplate) {
        result +=
          outputFormat.CoTSentenceExistTemplate.replace(/\{\{\s*SENTENCE\s*\}\}/g, segmentText) +
          '\n';
      }

      // Add annotations with proper value mapping
      for (const annotation of segment.annotations) {
        if (outputFormat.CoTSentenceAnnotationTemplate) {
          // Map standard sense values to custom names
          const senseMap: Record<string, string> = {
            Vision: outputFormat.visionName || 'Vision',
            Hearing: outputFormat.hearingName || 'Hearing',
            Taste: outputFormat.tasteName || 'Taste',
            Smell: outputFormat.smellName || 'Smell',
            Touch: outputFormat.touchName || 'Touch',
          };

          // Map standard sentiment values to custom names
          const sentimentMap: Record<string, string> = {
            Positive: outputFormat.positiveName || 'Positive',
            Negative: outputFormat.negativeName || 'Negative',
            Neutral: outputFormat.neutralName || 'Neutral',
          };

          // Apply value mapping
          const mappedSense = senseMap[annotation.sense] || annotation.sense;
          const mappedSentiment = sentimentMap[annotation.sentiment] || annotation.sentiment;

          // Build annotation string with mapped values
          const annotationString = `[<${outputFormat.senseName || 'sense'}: ${mappedSense}><${outputFormat.stimulusName || 'stimulus'}: ${annotation.stimulus}><${outputFormat.perceptionName || 'perception'}: ${annotation.perception}><${outputFormat.sentimentName || 'sentiment'}: ${mappedSentiment}>]`;

          let annotationLine = outputFormat.CoTSentenceAnnotationTemplate.replace(
            /\{\{\s*ANNOTATION\s*\}\}/g,
            annotationString,
          );

          if (annotation.CoT) {
            annotationLine = annotationLine.replace(/\{\{\s*COT\s*\}\}/g, annotation.CoT);
          }

          result += annotationLine + '\n';
        }
      }
    }
  }

  return result.trim();
}
