import type { Annotation } from '@/shared/models/annotation.model';
import type { OutputFormat } from '@/shared/models/output-format.model';

/**
 * Formats an annotation with custom names based on the output format configuration
 * @param annotation - The annotation to format
 * @param outputFormat - The output format configuration containing custom names
 * @returns A formatted annotation object with custom key names and mapped values
 */
export function formatAnnotation(
  annotation: Annotation,
  outputFormat?: OutputFormat
): Record<string, string> {
  if (!outputFormat) {
    return {
      sense: annotation.sense,
      stimulus: annotation.stimulus,
      perception: annotation.perception,
      sentiment: annotation.sentiment,
    };
  }

  const senseMap: Record<string, string> = {
    Vision: outputFormat.visionName || 'Vision',
    Hearing: outputFormat.hearingName || 'Hearing',
    Taste: outputFormat.tasteName || 'Taste',
    Smell: outputFormat.smellName || 'Smell',
    Touch: outputFormat.touchName || 'Touch',
  };

  const sentimentMap: Record<string, string> = {
    Positive: outputFormat.positiveName || 'Positive',
    Negative: outputFormat.negativeName || 'Negative',
    Neutral: outputFormat.neutralName || 'Neutral',
  };

  // Use custom key names or fallback to defaults
  const senseKey = outputFormat.senseName || 'sense';
  const stimulusKey = outputFormat.stimulusName || 'stimulus';
  const perceptionKey = outputFormat.perceptionName || 'perception';
  const sentimentKey = outputFormat.sentimentName || 'sentiment';

  return {
    [senseKey]: senseMap[annotation.sense] || annotation.sense,
    [stimulusKey]: annotation.stimulus,
    [perceptionKey]: annotation.perception,
    [sentimentKey]: sentimentMap[annotation.sentiment] || annotation.sentiment,
  };
}
