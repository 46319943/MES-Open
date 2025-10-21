import { z } from 'zod';
import { OutputFormatTypeSchema } from './output-format.model';

export const DataBoostSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  inputDatasetId: z.uuid(),
  exampleDatasetId: z.uuid(),
  promptId: z.uuid(),
  outputFormatId: z.uuid(),
  // Currently, assume value is only cot.
  outputFormatType: OutputFormatTypeSchema,
  exampleTemplate: z.string(),
  exampleCount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type DataBoost = z.infer<typeof DataBoostSchema>;
