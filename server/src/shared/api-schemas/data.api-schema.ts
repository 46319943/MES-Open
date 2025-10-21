import type { Data } from '@/shared/models/data.model';
import { DataSchema } from '@/shared/models/data.model';
import { z } from 'zod';

// List data in a dataset
export const ListDataParamsSchema = z.object({
  datasetId: z.uuid(),
});
export type ListDataParams = z.infer<typeof ListDataParamsSchema>;

export const ListDataQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(5000).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  filterByEmptySegments: z.coerce.boolean().optional(),
  filterByPopulatedSegments: z.coerce.boolean().optional(),
});
export type ListDataQuery = z.infer<typeof ListDataQuerySchema>;

export interface ListDataResponse {
  data: Data[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Get specific data item
export const GetDataParamsSchema = z.object({
  datasetId: z.uuid(),
  id: z.string(),
});
export type GetDataParams = z.infer<typeof GetDataParamsSchema>;
export type GetDataResponse = Data;

// Create data (bulk operation)
export const CreateDataParamsSchema = z.object({
  datasetId: z.uuid(),
});
export type CreateDataParams = z.infer<typeof CreateDataParamsSchema>;

export const CreateDataBodySchema = z.object({
  data: z.array(
    DataSchema.pick({
      text: true,
      segments: true,
      metaData: true,
    }),
  ),
});
export type CreateDataBody = z.infer<typeof CreateDataBodySchema>;

export interface CreateDataResponse {
  data: Data[];
  created: number;
}

// Update data
export const UpdateDataParamsSchema = z.object({
  datasetId: z.uuid(),
  id: z.string(),
});
export type UpdateDataParams = z.infer<typeof UpdateDataParamsSchema>;

export const UpdateDataBodySchema = DataSchema.pick({
  text: true,
  segments: true,
  metaData: true,
}).partial();
export type UpdateDataBody = z.infer<typeof UpdateDataBodySchema>;
export type UpdateDataResponse = Data;

// Delete data (bulk operation)
export const DeleteDataParamsSchema = z.object({
  datasetId: z.uuid(),
});
export type DeleteDataParams = z.infer<typeof DeleteDataParamsSchema>;

export const DeleteDataBodySchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID must be provided'),
});
export type DeleteDataBody = z.infer<typeof DeleteDataBodySchema>;

export interface DeleteDataResponse {
  deleted: number;
  notFound: string[];
}
