import type { DataBoost } from '@/shared/models/data-boost.model';
import { DataBoostSchema } from '@/shared/models/data-boost.model';
import { z } from 'zod';

// List data boosts
export type ListDataBoostsResponse = DataBoost[];

// Get specific data boost
export const GetDataBoostParamsSchema = z.object({
  id: z.uuid(),
});
export type GetDataBoostParams = z.infer<typeof GetDataBoostParamsSchema>;
export type GetDataBoostResponse = DataBoost;

// Create data boost
export const CreateDataBoostBodySchema = DataBoostSchema.pick({
  name: true,
  inputDatasetId: true,
  exampleDatasetId: true,
  promptId: true,
  outputFormatId: true,
  outputFormatType: true,
  exampleTemplate: true,
  exampleCount: true,
});
export type CreateDataBoostBody = z.infer<typeof CreateDataBoostBodySchema>;
export type CreateDataBoostResponse = DataBoost;

// Update data boost
export const UpdateDataBoostParamsSchema = z.object({
  id: z.uuid(),
});
export type UpdateDataBoostParams = z.infer<typeof UpdateDataBoostParamsSchema>;

export const UpdateDataBoostBodySchema = DataBoostSchema.pick({
  name: true,
  inputDatasetId: true,
  exampleDatasetId: true,
  promptId: true,
  outputFormatId: true,
  outputFormatType: true,
  exampleTemplate: true,
  exampleCount: true,
}).partial();
export type UpdateDataBoostBody = z.infer<typeof UpdateDataBoostBodySchema>;
export type UpdateDataBoostResponse = DataBoost;

// Delete data boost
export const DeleteDataBoostParamsSchema = z.object({
  id: z.uuid(),
});
export type DeleteDataBoostParams = z.infer<typeof DeleteDataBoostParamsSchema>;

export interface DeleteDataBoostResponse {
  deleted: boolean;
  id: string;
}
