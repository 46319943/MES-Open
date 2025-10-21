import type { Annotation } from '@/shared/models/annotation.model';
import type { DataSegment } from '@/shared/models/data.model';
import type { OutputFormat } from '@/shared/models/output-format.model';

/**
 * Parses sense-prioritized JSON format back into DataSegment array
 * @param jsonString - JSON string with annotations grouped by sense
 * @param outputFormat - Output format configuration used for mapping
 * @param originalText - Original text for segment indexing (optional, defaults to empty string)
 * @returns Array of DataSegment objects containing a single item with all annotations
 */
export function parseSensePrioritizedJson(
  jsonString: string,
  outputFormat: OutputFormat,
  originalText: string = ''
): DataSegment[] {
  try {
    const parsedJson = JSON.parse(jsonString);

    // Handle empty or invalid JSON
    if (!parsedJson || typeof parsedJson !== 'object') {
      return [];
    }

    const annotations: Annotation[] = [];

    // Extract annotations from each sense group
    Object.values(parsedJson).forEach((senseGroup) => {
      if (Array.isArray(senseGroup)) {
        senseGroup.forEach((annotationData) => {
          const annotation = parseAnnotationFromJson(annotationData, outputFormat);
          if (annotation) {
            annotations.push(annotation);
          }
        });
      }
    });

    // Return single DataSegment containing all annotations
    return [{
      indexStart: 0,
      indexEnd: originalText.length,
      annotations
    }];
  } catch (error) {
    console.error('Failed to parse sense-prioritized JSON:', error);
    return [];
  }
}

/**
 * Parses order-preserving JSON format back into DataSegment array
 * @param jsonString - JSON string with annotations in order of appearance
 * @param outputFormat - Output format configuration used for mapping
 * @param originalText - Original text for segment indexing (optional, defaults to empty string)
 * @returns Array of DataSegment objects containing a single item with all annotations
 */
export function parseOrderPreservingJson(
  jsonString: string,
  outputFormat: OutputFormat,
  originalText: string = ''
): DataSegment[] {
  try {
    const parsedJson = JSON.parse(jsonString);

    // Handle empty or invalid JSON
    if (!Array.isArray(parsedJson)) {
      return [];
    }

    const annotations: Annotation[] = [];

    // Extract annotations from ordered array
    parsedJson.forEach((annotationData) => {
      const annotation = parseAnnotationFromJson(annotationData, outputFormat);
      if (annotation) {
        annotations.push(annotation);
      }
    });

    // Return single DataSegment containing all annotations
    return [{
      indexStart: 0,
      indexEnd: originalText.length,
      annotations
    }];
  } catch (error) {
    console.error('Failed to parse order-preserving JSON:', error);
    return [];
  }
}

/**
 * Helper function to parse annotation data from JSON object
 * @param annotationData - Raw annotation data from JSON
 * @param outputFormat - Output format configuration for field mapping
 * @returns Parsed Annotation object or null if parsing fails
 */
function parseAnnotationFromJson(
  annotationData: Record<string, unknown>,
  outputFormat: OutputFormat
): Annotation | null {
  if (!annotationData || typeof annotationData !== 'object') {
    return null;
  }

  try {
    // Map custom field names back to standard annotation fields
    const senseKey = outputFormat.senseName || 'sense';
    const stimulusKey = outputFormat.stimulusName || 'stimulus';
    const perceptionKey = outputFormat.perceptionName || 'perception';
    const sentimentKey = outputFormat.sentimentName || 'sentiment';

    // Extract field values with type checking
    const senseValue = typeof annotationData[senseKey] === 'string' ? annotationData[senseKey] : '';
    const stimulusValue = typeof annotationData[stimulusKey] === 'string' ? annotationData[stimulusKey] : '';
    const perceptionValue = typeof annotationData[perceptionKey] === 'string' ? annotationData[perceptionKey] : '';
    const sentimentValue = typeof annotationData[sentimentKey] === 'string' ? annotationData[sentimentKey] : '';

    // Map custom sense name back to standard sense enum value
    const sense = mapSenseBack(senseValue, outputFormat);

    // Map custom sentiment name back to standard sentiment enum value
    const sentiment = mapSentimentBack(sentimentValue, outputFormat);

    // Validate required fields
    if (!sense || !stimulusValue || !perceptionValue || !sentiment) {
      return null;
    }

    return {
      sense,
      stimulus: stimulusValue,
      perception: perceptionValue,
      sentiment,
    };
  } catch (error) {
    console.error('Failed to parse annotation from JSON:', error);
    return null;
  }
}

/**
 * Maps custom sense name back to standard sense enum value
 */
function mapSenseBack(
  customSenseValue: string,
  outputFormat: OutputFormat
): 'Vision' | 'Hearing' | 'Taste' | 'Smell' | 'Touch' | null {
  if (!customSenseValue) return null;

  const senseMapping: Record<string, 'Vision' | 'Hearing' | 'Taste' | 'Smell' | 'Touch'> = {
    [outputFormat.visionName || 'Vision']: 'Vision',
    [outputFormat.hearingName || 'Hearing']: 'Hearing',
    [outputFormat.tasteName || 'Taste']: 'Taste',
    [outputFormat.smellName || 'Smell']: 'Smell',
    [outputFormat.touchName || 'Touch']: 'Touch',
  };

  return senseMapping[customSenseValue] || null;
}

/**
 * Maps custom sentiment name back to standard sentiment enum value
 */
function mapSentimentBack(
  customSentimentValue: string,
  outputFormat: OutputFormat
): 'Positive' | 'Negative' | 'Neutral' | null {
  if (!customSentimentValue) return null;

  const sentimentMapping: Record<string, 'Positive' | 'Negative' | 'Neutral'> = {
    [outputFormat.positiveName || 'Positive']: 'Positive',
    [outputFormat.negativeName || 'Negative']: 'Negative',
    [outputFormat.neutralName || 'Neutral']: 'Neutral',
  };

  return sentimentMapping[customSentimentValue] || null;
}
