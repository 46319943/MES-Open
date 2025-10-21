import { z } from 'zod';
import {
  TrainingDataSchema,
  TrainingConfigSchema,
  FineTuneRecordSchema,
} from 'src/local/models/fine-tune.model';

// Fine-tune endpoints
export const FineTuneRequestSchema = z.object({
  data: z.array(TrainingDataSchema).min(1).describe('Training data array'),
  training_config: TrainingConfigSchema.describe('Training configuration'),
  meta: z
    .record(z.string(), z.any())
    .optional()
    .describe('Optional metadata dictionary for informational purposes'),
});
export type FineTuneRequest = z.infer<typeof FineTuneRequestSchema>;

export const FineTuneResponseSchema = z.object({
  fine_tune_name: z.string().describe('Name of the created fine-tune'),
  status: z.string().describe('Status of the fine-tuning process'),
  message: z.string().describe('Additional information'),
  data_size: z.number().int().describe('Number of training examples'),
  created_at: z.coerce.date().describe('Creation timestamp'),
  meta: z.record(z.string(), z.any()).optional().describe('Optional metadata dictionary'),
});
export type FineTuneResponse = z.infer<typeof FineTuneResponseSchema>;

export const ListFineTunesResponseSchema = z.array(FineTuneRecordSchema);
export type ListFineTunesResponse = z.infer<typeof ListFineTunesResponseSchema>;

export const GetFineTuneParamsSchema = z.object({
  fine_tune_name: z.string().describe('Name of the fine-tune to retrieve'),
});
export type GetFineTuneParams = z.infer<typeof GetFineTuneParamsSchema>;

export const GetFineTuneResponseSchema = FineTuneRecordSchema;
export type GetFineTuneResponse = z.infer<typeof GetFineTuneResponseSchema>;

export const DeleteFineTuneParamsSchema = z.object({
  fine_tune_name: z.string().describe('Name of the fine-tune to delete'),
});
export type DeleteFineTuneParams = z.infer<typeof DeleteFineTuneParamsSchema>;

export const DeleteFineTuneResponseSchema = z.object({
  message: z.string().describe('Success message'),
  deleted_count: z.number().int().describe('Number of records deleted'),
});
export type DeleteFineTuneResponse = z.infer<typeof DeleteFineTuneResponseSchema>;
