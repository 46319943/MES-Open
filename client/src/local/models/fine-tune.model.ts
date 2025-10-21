import { z } from 'zod';

export const TrainingDataSchema = z.object({
  input: z.string().describe('Input text for training'),
  output: z.string().describe('Expected output text for training'),
});
export type TrainingData = z.infer<typeof TrainingDataSchema>;

export const TrainingConfigSchema = z.object({
  model_name: z.string().describe('Base model name to fine-tune'),
  num_epochs: z.number().int().min(1).max(100).default(3).describe('Number of training epochs'),
  batch_size: z.number().int().min(1).max(32).default(2).describe('Training batch size'),
  accumulated_batch_size: z
    .number()
    .int()
    .min(1)
    .max(128)
    .default(4)
    .describe('Gradient accumulation batch size'),
  max_seq_length: z
    .number()
    .int()
    .min(128)
    .max(8192)
    .default(2048)
    .describe('Maximum sequence length'),
  learning_rate: z.number().positive().max(0.01).default(0.0002).describe('Learning rate'),
  resume_from_finetune: z.string().optional().nullable().describe('Name of the fine-tune to resume from'),
});
export type TrainingConfig = z.infer<typeof TrainingConfigSchema>;

export const FineTuneRecordSchema = z.object({
  fine_tune_name: z.string().describe('Name of the fine-tune'),
  output_path: z.string().describe('Path to the fine-tuned model'),
  data_size: z.number().int().describe('Number of training examples used'),
  training_config: TrainingConfigSchema.describe('Training configuration used'),
  status: z.enum(['training', 'completed', 'failed']).describe('Status of the fine-tune'),
  created_at: z.coerce.date().describe('Creation timestamp'),
  updated_at: z.coerce.date().describe('Last update timestamp'),
  meta: z
    .record(z.string(), z.any())
    .optional()
    .nullable()
    .describe('Optional metadata dictionary'),
  error: z.string().optional().describe('Error message if status is failed'),
  resumed_from: z.string().optional().nullable().describe('Name of the fine-tune this was resumed from'),
});
export type FineTuneRecord = z.infer<typeof FineTuneRecordSchema>;
