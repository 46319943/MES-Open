import type { Annotation } from '@/shared/models/annotation.model';
import type { DataSegment } from '@/shared/models/data.model';
import type { OutputFormat } from '@/shared/models/output-format.model';

/**
 * Preprocesses regex templates to handle Chinese quotation marks
 * Replaces Chinese quotation marks ("" and "") with a regex pattern that matches both Chinese and English quotation marks
 * @param template The template string to preprocess
 * @returns The preprocessed template with quotation mark patterns replaced
 */
function preprocessRegexTemplate(template: string): string {
  // Replace Chinese left quotation mark " with pattern that matches both " and "
  let processed = template.replace(/“/g, '[“"]');

  // Replace Chinese right quotation mark " with pattern that matches both " and "
  processed = processed.replace(/”/g, '[”"]');

  return processed;
}

/**
 * Parses a Chain-of-Thought (CoT) output string back into data segments structure
 * @param cotString The CoT formatted string to parse
 * @param outputFormat The output format used to generate the CoT string
 * @param originalText The original text (needed for segment indexing)
 * @param throwOnError Optional flag to throw detailed errors when parsing fails
 * @returns Array of DataSegment objects with annotations
 */
export function parseCoTToSegments(
  cotString: string,
  outputFormat: OutputFormat,
  originalText: string,
  throwOnError: boolean = false,
): DataSegment[] {
  const segments: DataSegment[] = [];

  // Remove the start template if it exists
  let processedString = cotString;
  if (outputFormat.CoTStartTemplate) {
    processedString = processedString.replace(outputFormat.CoTStartTemplate.trim(), '').trim();
  }

  // Split by lines and process each line
  const lines = processedString.split('\n').filter((line) => line.trim());

  let currentSegment: DataSegment | null = null;
  let currentSentence = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check if this line contains a sentence (using templates)
    const sentenceFromExist = extractSentenceFromTemplate(
      trimmedLine,
      outputFormat.CoTSentenceExistTemplate,
    );
    const sentenceFromNotExist = extractSentenceFromTemplate(
      trimmedLine,
      outputFormat.CoTSentenceNotExistTemplate,
    );

    if (sentenceFromExist || sentenceFromNotExist) {
      // Save previous segment if exists
      if (currentSegment) {
        segments.push(currentSegment);
      }

      currentSentence = sentenceFromExist || sentenceFromNotExist || '';

      // Find the segment indices in the original text
      const segmentIndices = findSegmentIndices(
        currentSentence,
        originalText,
        segments,
        throwOnError,
      );

      currentSegment = {
        indexStart: segmentIndices.start,
        indexEnd: segmentIndices.end,
        annotations: [],
      };

      // If it's from NotExist template, this segment has no annotations
      if (sentenceFromNotExist) {
        segments.push(currentSegment);
        currentSegment = null;
      }
    } else {
      // This might be an annotation line
      const annotation = parseAnnotationLine(trimmedLine, outputFormat, throwOnError);
      if (annotation && currentSegment) {
        currentSegment.annotations.push(annotation);
      } else if (throwOnError && trimmedLine && !annotation && currentSegment) {
        throw new Error(
          `Failed to parse annotation line. Step: Processing annotation, Process: parseAnnotationLine, Content: "${trimmedLine}", Action: Annotation parsing failed - line format does not match expected template pattern`,
        );
      }
    }
  }

  // Add the last segment if exists
  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Extracts sentence text from a template line
 */
function extractSentenceFromTemplate(
  line: string,
  template: string,
  throwOnError: boolean = false,
): string | null {
  if (!template) {
    if (throwOnError) {
      throw new Error(
        `Failed to extract sentence from template. Step: Template validation, Process: extractSentenceFromTemplate, Content: "${line}", Action: Template is empty or undefined`,
      );
    }
    return null;
  }

  // Create regex from template by replacing {{ SENTENCE }} with capture group
  const regexPattern = template
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\\\{\\\{\s*SENTENCE\s*\\\}\\\}/g, '(.+?)'); // Replace template placeholder

  // Preprocess the final pattern to handle Chinese quotation marks
  const preprocessedPattern = preprocessRegexTemplate(regexPattern);

  const regex = new RegExp(`^${preprocessedPattern}$`);
  const match = line.match(regex);

  const result = match?.[1]?.trim() || null;

  if (throwOnError && !result && template.includes('{{ SENTENCE }}')) {
    throw new Error(
      `Failed to extract sentence from template. Step: Regex matching, Process: extractSentenceFromTemplate, Content: "${line}", Regex: "${regexPattern}" - Line does not match expected sentence template pattern`,
    );
  }

  return result;
}

/**
 * Finds the start and end indices of a sentence segment in the original text
 */
function findSegmentIndices(
  sentence: string,
  originalText: string,
  existingSegments: DataSegment[],
  throwOnError: boolean = false,
): { start: number; end: number } {
  // Find all occurrences of the sentence in the original text
  const occurrences: { start: number; end: number }[] = [];
  let searchIndex = 0;

  while (true) {
    const foundIndex = originalText.indexOf(sentence, searchIndex);
    if (foundIndex === -1) break;

    occurrences.push({
      start: foundIndex,
      end: foundIndex + sentence.length,
    });
    searchIndex = foundIndex + 1;
  }

  if (throwOnError && occurrences.length === 0) {
    throw new Error(
      `Failed to find sentence in original text. Step: Text search, Process: findSegmentIndices, Content: "${sentence}", Action: Sentence not found in original text - extracted sentence does not exist in the source text`,
    );
  }

  // Find the occurrence that doesn't overlap with existing segments
  for (const occurrence of occurrences) {
    const overlaps = existingSegments.some(
      (segment) => occurrence.start < segment.indexEnd && occurrence.end > segment.indexStart,
    );

    if (!overlaps) {
      return occurrence;
    }
  }

  if (throwOnError && occurrences.length > 0) {
    throw new Error(
      `Failed to find non-overlapping occurrence. Step: Overlap detection, Process: findSegmentIndices, Content: "${sentence}", Action: All occurrences overlap with existing segments - cannot place sentence without conflicts`,
    );
  }

  // If no non-overlapping occurrence found, return the first one
  return occurrences[0] || { start: 0, end: sentence.length };
}

/**
 * Parses an annotation line and returns an Annotation object
 */
function parseAnnotationLine(
  line: string,
  outputFormat: OutputFormat,
  throwOnError: boolean = false,
): Annotation | null {
  // Extract annotation content from template
  const annotationContent = extractAnnotationFromTemplate(
    line,
    outputFormat.CoTSentenceAnnotationTemplate,
    throwOnError,
  );
  if (!annotationContent) {
    if (throwOnError) {
      throw new Error(
        `Failed to extract annotation from template. Step: Template extraction, Process: parseAnnotationLine, Content: "${line}", Action: Could not extract annotation content from line using template pattern`,
      );
    }
    return null;
  }

  // Parse the annotation format: [<sense: value><stimulus: value><perception: value><sentiment: value>]
  const annotationMatch = annotationContent.match(/^\[<(.+?)><(.+?)><(.+?)><(.+?)>\]$/);
  if (!annotationMatch) {
    if (throwOnError) {
      throw new Error(
        `Failed to parse annotation format. Step: Annotation parsing, Process: parseAnnotationLine, Content: "${annotationContent}", Regex: "^\\[<(.+?)><(.+?)><(.+?)><(.+?)>\\]$" - Annotation content does not match expected format [<sense: value><stimulus: value><perception: value><sentiment: value>]`,
      );
    }
    return null;
  }

  const [, senseField, stimulusField, perceptionField, sentimentField] = annotationMatch;

  // Extract field values (with safety checks)
  const senseValue = senseField ? extractFieldValue(senseField, throwOnError) : null;
  const stimulusValue = stimulusField ? extractFieldValue(stimulusField, throwOnError) : null;
  const perceptionValue = perceptionField ? extractFieldValue(perceptionField, throwOnError) : null;
  const sentimentValue = sentimentField ? extractFieldValue(sentimentField, throwOnError) : null;

  if (!senseValue || !stimulusValue || !perceptionValue || !sentimentValue) {
    if (throwOnError) {
      const missingFields = [];
      if (!senseValue) missingFields.push('sense');
      if (!stimulusValue) missingFields.push('stimulus');
      if (!perceptionValue) missingFields.push('perception');
      if (!sentimentValue) missingFields.push('sentiment');

      throw new Error(
        `Failed to extract field values. Step: Field extraction, Process: parseAnnotationLine, Content: "${annotationContent}", Action: Missing or invalid field values for: ${missingFields.join(', ')}`,
      );
    }
    return null;
  }

  // Map custom names back to standard values
  const sense = mapSenseBack(senseValue, outputFormat, throwOnError);
  const sentiment = mapSentimentBack(sentimentValue, outputFormat, throwOnError);

  // Extract CoT content from the line
  const cotContent = extractCoTFromTemplate(
    line,
    outputFormat.CoTSentenceAnnotationTemplate,
    throwOnError,
  );

  return {
    sense,
    stimulus: stimulusValue,
    perception: perceptionValue,
    sentiment,
    CoT: cotContent,
  };
}

/**
 * Extracts annotation content from annotation template line
 */
function extractAnnotationFromTemplate(
  line: string,
  template: string,
  throwOnError: boolean = false,
): string | null {
  if (!template) {
    if (throwOnError) {
      throw new Error(
        `Failed to extract annotation from template. Step: Template validation, Process: extractAnnotationFromTemplate, Content: "${line}", Action: Template is empty or undefined`,
      );
    }
    return null;
  }

  // Create regex from template, looking for {{ ANNOTATION }} placeholder
  const regexPattern = template
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\\\{\\\{\s*ANNOTATION\s*\\\}\\\}/g, '(.+)') // Replace annotation placeholder
    .replace(/\\\{\\\{\s*COT\s*\\\}\\\}/g, '.+'); // Replace CoT placeholder with non-capturing group

  // Preprocess the final pattern to handle Chinese quotation marks
  const preprocessedPattern = preprocessRegexTemplate(regexPattern);

  const regex = new RegExp(preprocessedPattern);
  const match = line.match(regex);

  const result = match?.[1]?.trim() || null;

  if (throwOnError && !result && template.includes('{{ ANNOTATION }}')) {
    throw new Error(
      `Failed to extract annotation from template. Step: Regex matching, Process: extractAnnotationFromTemplate, Content: "${line}", Regex: "${regexPattern}" - Line does not match expected annotation template pattern`,
    );
  }

  return result;
}

/**
 * Extracts CoT content from annotation template line
 */
function extractCoTFromTemplate(
  line: string,
  template: string,
  throwOnError: boolean = false,
): string | undefined {
  if (!template || !template.includes('{{ COT }}')) {
    if (throwOnError && template && !template.includes('{{ COT }}')) {
      throw new Error(
        `Failed to extract CoT from template. Step: Template validation, Process: extractCoTFromTemplate, Content: "${line}", Action: Template does not contain {{ COT }} placeholder`,
      );
    }
    return undefined;
  }

  // Create regex from template, looking for {{ COT }} placeholder
  const regexPattern = template
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\\\{\\\{\s*ANNOTATION\s*\\\}\\\}/g, '.+') // Replace annotation placeholder with non-capturing group
    .replace(/\\\{\\\{\s*COT\s*\\\}\\\}/g, '(.+)'); // Replace CoT placeholder (greedy match)

  // Preprocess the final pattern to handle Chinese quotation marks
  const preprocessedPattern = preprocessRegexTemplate(regexPattern);

  const regex = new RegExp(preprocessedPattern);
  const match = line.match(regex);

  const result = match?.[1]?.trim() || undefined;

  if (throwOnError && !result) {
    throw new Error(
      `Failed to extract CoT from template. Step: Regex matching, Process: extractCoTFromTemplate, Content: "${line}", Regex: "${regexPattern}" - Line does not match expected CoT template pattern`,
    );
  }

  return result;
}

/**
 * Extracts field value from field string like "fieldName: value"
 */
function extractFieldValue(fieldString: string, throwOnError: boolean = false): string | null {
  const match = fieldString.match(/^(.+?):\s*(.+)$/);
  if (!match) {
    if (throwOnError) {
      throw new Error(
        `Failed to extract field value. Step: Field parsing, Process: extractFieldValue, Content: "${fieldString}", Regex: "^(.+?):\\s*(.+)$" - Field string does not match expected format "fieldName: value"`,
      );
    }
    return null;
  }

  const [, , value] = match;
  const result = value?.trim() || null;

  if (throwOnError && !result) {
    throw new Error(
      `Failed to extract field value. Step: Value extraction, Process: extractFieldValue, Content: "${fieldString}", Action: Field value is empty or contains only whitespace`,
    );
  }

  // We don't need to check field name match since custom names might be used
  return result;
}

/**
 * Maps custom sense name back to standard sense enum value
 */
function mapSenseBack(
  customSenseValue: string,
  outputFormat: OutputFormat,
  throwOnError: boolean = false,
): 'Vision' | 'Hearing' | 'Taste' | 'Smell' | 'Touch' {
  const senseMapping: Record<string, 'Vision' | 'Hearing' | 'Taste' | 'Smell' | 'Touch'> = {
    [outputFormat.visionName || 'Vision']: 'Vision',
    [outputFormat.hearingName || 'Hearing']: 'Hearing',
    [outputFormat.tasteName || 'Taste']: 'Taste',
    [outputFormat.smellName || 'Smell']: 'Smell',
    [outputFormat.touchName || 'Touch']: 'Touch',
  };

  const result = senseMapping[customSenseValue];

  if (throwOnError && !result) {
    const validValues = Object.keys(senseMapping).join(', ');
    throw new Error(
      `Failed to map sense value. Step: Sense mapping, Process: mapSenseBack, Content: "${customSenseValue}", Action: Invalid sense value - expected one of: ${validValues}`,
    );
  }

  return result || 'Vision';
}

/**
 * Maps custom sentiment name back to standard sentiment enum value
 */
function mapSentimentBack(
  customSentimentValue: string,
  outputFormat: OutputFormat,
  throwOnError: boolean = false,
): 'Positive' | 'Negative' | 'Neutral' {
  const sentimentMapping: Record<string, 'Positive' | 'Negative' | 'Neutral'> = {
    [outputFormat.positiveName || 'Positive']: 'Positive',
    [outputFormat.negativeName || 'Negative']: 'Negative',
    [outputFormat.neutralName || 'Neutral']: 'Neutral',
  };

  const result = sentimentMapping[customSentimentValue];

  if (throwOnError && !result) {
    const validValues = Object.keys(sentimentMapping).join(', ');
    throw new Error(
      `Failed to map sentiment value. Step: Sentiment mapping, Process: mapSentimentBack, Content: "${customSentimentValue}", Action: Invalid sentiment value - expected one of: ${validValues}`,
    );
  }

  return result || 'Neutral';
}
