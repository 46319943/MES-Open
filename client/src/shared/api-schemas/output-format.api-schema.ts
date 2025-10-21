import type { OutputFormat } from '@/shared/models/output-format.model';
import { OutputFormatSchema } from '@/shared/models/output-format.model';
import { z } from 'zod';

// List output formats
export type ListOutputFormatsResponse = OutputFormat[];

// Get specific output format
export const GetOutputFormatParamsSchema = z.object({
  id: z.uuid(),
});
export type GetOutputFormatParams = z.infer<typeof GetOutputFormatParamsSchema>;
export type GetOutputFormatResponse = OutputFormat;

// Create output format
export const CreateOutputFormatBodySchema = OutputFormatSchema.pick({
  name: true,
  senseName: true,
  stimulusName: true,
  perceptionName: true,
  sentimentName: true,
  visionName: true,
  hearingName: true,
  tasteName: true,
  smellName: true,
  touchName: true,
  positiveName: true,
  negativeName: true,
  neutralName: true,
  CoTStartTemplate: true,
  CoTSentenceExistTemplate: true,
  CoTSentenceNotExistTemplate: true,
  CoTSentenceAnnotationTemplate: true,
});
export type CreateOutputFormatBody = z.infer<typeof CreateOutputFormatBodySchema>;
export type CreateOutputFormatResponse = OutputFormat;

// Update output format
export const UpdateOutputFormatParamsSchema = z.object({
  id: z.uuid(),
});
export type UpdateOutputFormatParams = z.infer<typeof UpdateOutputFormatParamsSchema>;

export const UpdateOutputFormatBodySchema = OutputFormatSchema.pick({
  name: true,
  senseName: true,
  stimulusName: true,
  perceptionName: true,
  sentimentName: true,
  visionName: true,
  hearingName: true,
  tasteName: true,
  smellName: true,
  touchName: true,
  positiveName: true,
  negativeName: true,
  neutralName: true,
  CoTStartTemplate: true,
  CoTSentenceExistTemplate: true,
  CoTSentenceNotExistTemplate: true,
  CoTSentenceAnnotationTemplate: true,
}).partial();
export type UpdateOutputFormatBody = z.infer<typeof UpdateOutputFormatBodySchema>;
export type UpdateOutputFormatResponse = OutputFormat;

// Delete output format
export const DeleteOutputFormatParamsSchema = z.object({
  id: z.uuid(),
});
export type DeleteOutputFormatParams = z.infer<typeof DeleteOutputFormatParamsSchema>;

export interface DeleteOutputFormatResponse {
  deleted: boolean;
  id: string;
}
