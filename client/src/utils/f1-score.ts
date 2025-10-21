import type { IndividualDataMetrics, ValidationMetrics } from '@/components/inference/inference.types';
import type { Annotation } from '@/shared/models/annotation.model';
import type { Data, DataSegment } from '@/shared/models/data.model';

/**
 * Helper function to check if two annotations match (all four fields must be equal)
 */
export function annotationsMatch(annotation1: Annotation, annotation2: Annotation): boolean {
  return (
    annotation1.sense === annotation2.sense &&
    annotation1.stimulus === annotation2.stimulus &&
    annotation1.perception === annotation2.perception &&
    annotation1.sentiment === annotation2.sentiment
  );
}

/**
 * Helper function to calculate individual F1 score for a single data point
 */
export function calculateIndividualF1Score(dataPoint: Data, predictedSegments: DataSegment[], index: number): IndividualDataMetrics {
  const originalSegments = dataPoint.segments;

  // Extract all annotations from original data
  const originalAnnotations: Annotation[] = [];
  for (const segment of originalSegments) {
    originalAnnotations.push(...segment.annotations);
  }

  // Extract all annotations from predicted data
  const predictedAnnotations: Annotation[] = [];
  for (const segment of predictedSegments) {
    predictedAnnotations.push(...segment.annotations);
  }

  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  // Find matches between original and predicted annotations
  const matchedPredicted = new Set<number>();

  for (const originalAnnotation of originalAnnotations) {
    let foundMatch = false;

    for (let i = 0; i < predictedAnnotations.length; i++) {
      if (matchedPredicted.has(i)) continue;

      const predictedAnnotation = predictedAnnotations[i];
      if (!predictedAnnotation) continue;

      // Two annotations are considered a match only if all four fields are equal
      if (annotationsMatch(originalAnnotation, predictedAnnotation)) {
        truePositives++;
        matchedPredicted.add(i);
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      falseNegatives++;
    }
  }

  // Count unmatched predicted annotations as false positives
  for (let i = 0; i < predictedAnnotations.length; i++) {
    if (!matchedPredicted.has(i)) {
      falsePositives++;
    }
  }

  // Calculate precision, recall, and F1 score for this individual data point
  const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
  const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    dataIndex: index,
    precision,
    recall,
    f1,
    truePositives,
    falsePositives,
    falseNegatives,
  };
}

/**
 * Calculate aggregate validation metrics from individual metrics
 */
export function calculateValidationMetrics(individualMetrics: IndividualDataMetrics[]): ValidationMetrics {
  if (individualMetrics.length === 0) {
    return {
      precision: 0,
      recall: 0,
      f1: 0,
      totalTruePositives: 0,
      totalFalsePositives: 0,
      totalFalseNegatives: 0,
      individualScores: [],
    };
  }

  // Aggregate the individual metrics
  let totalTruePositives = 0;
  let totalFalsePositives = 0;
  let totalFalseNegatives = 0;

  for (const metric of individualMetrics) {
    totalTruePositives += metric.truePositives;
    totalFalsePositives += metric.falsePositives;
    totalFalseNegatives += metric.falseNegatives;
  }

  // Calculate aggregate precision, recall, and F1 score
  const precision = totalTruePositives + totalFalsePositives > 0 ? totalTruePositives / (totalTruePositives + totalFalsePositives) : 0;
  const recall = totalTruePositives + totalFalseNegatives > 0 ? totalTruePositives / (totalTruePositives + totalFalseNegatives) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    precision,
    recall,
    f1,
    totalTruePositives,
    totalFalsePositives,
    totalFalseNegatives,
    individualScores: individualMetrics,
  };
}
