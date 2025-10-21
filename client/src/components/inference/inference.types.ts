import type { Dataset } from '@/shared/models/dataset.model';

export interface InferenceSettings {
  dataset: Dataset;
  mode: 'validation' | 'inference';
  poolSize: number;
}

export interface DatasetStats {
  total: number;
  withAnnotations: number;
}

export interface ExecutionLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface IndividualDataMetrics {
  dataIndex: number;
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
}

export interface ValidationMetrics {
  precision: number;
  recall: number;
  f1: number;
  totalTruePositives: number;
  totalFalsePositives: number;
  totalFalseNegatives: number;
  individualScores?: IndividualDataMetrics[];
}

export interface InferenceResults {
  totalProcessed: number;
  successful: number;
  failed: number;
  duration: string;
  metrics?: ValidationMetrics;
}
