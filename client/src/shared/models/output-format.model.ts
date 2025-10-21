import { z } from "zod";

export const OutputFormatSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  // Key name for the output
  senseName: z.string(),
  stimulusName: z.string(),
  perceptionName: z.string(),
  sentimentName: z.string(),
  // Sense value name for the output
  visionName: z.string(),
  hearingName: z.string(),
  tasteName: z.string(),
  smellName: z.string(),
  touchName: z.string(),
  // Sentiment value name for the output
  positiveName: z.string(),
  negativeName: z.string(),
  neutralName: z.string(),
  // CoT templates for the output
  CoTStartTemplate: z.string(),
  CoTSentenceExistTemplate: z.string(),
  CoTSentenceNotExistTemplate: z.string(),
  CoTSentenceAnnotationTemplate: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type OutputFormat = z.infer<typeof OutputFormatSchema>;


export const OutputFormatTypeSchema = z.enum(['sense-prioritized', 'order-preserving', 'sense-separated', 'cot']);
export type OutputFormatType = z.infer<typeof OutputFormatTypeSchema>;