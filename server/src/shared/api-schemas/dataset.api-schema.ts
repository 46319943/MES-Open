import type { Dataset } from '@/shared/models/dataset.model';
import { DatasetSchema } from '@/shared/models/dataset.model';
import type { z } from 'zod';

// Dataset response with length field (not in model)
export interface DatasetResponse extends Dataset {
  length: number;
}

// List datasets
export interface ListDatasetsResponse {
  datasets: DatasetResponse[];
}

// Get dataset
export const GetDatasetParamsSchema = DatasetSchema.pick({
  id: true,
});
export type GetDatasetParams = z.infer<typeof GetDatasetParamsSchema>;
export type GetDatasetResponse = DatasetResponse;

// Create dataset
export const CreateDatasetBodySchema = DatasetSchema.pick({
  name: true,
  description: true,
});
export type CreateDatasetBody = z.infer<typeof CreateDatasetBodySchema>;
export type CreateDatasetResponse = DatasetResponse;

// Update dataset
export const UpdateDatasetParamsSchema = DatasetSchema.pick({
  id: true,
});
export type UpdateDatasetParams = z.infer<typeof UpdateDatasetParamsSchema>;

export const UpdateDatasetBodySchema = DatasetSchema.pick({
  name: true,
  description: true,
}).partial();
export type UpdateDatasetBody = z.infer<typeof UpdateDatasetBodySchema>;
export type UpdateDatasetResponse = DatasetResponse;

// Delete dataset
export const DeleteDatasetParamsSchema = DatasetSchema.pick({
  id: true,
});
export type DeleteDatasetParams = z.infer<typeof DeleteDatasetParamsSchema>;
