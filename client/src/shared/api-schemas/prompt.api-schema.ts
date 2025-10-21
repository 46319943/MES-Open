import type { Prompt } from '@/shared/models/prompt.model';
import { PromptSchema } from '@/shared/models/prompt.model';
import { z } from 'zod';

// List prompts
export type ListPromptsResponse = Prompt[];

// Get specific prompt
export const GetPromptParamsSchema = z.object({
  id: z.uuid(),
});
export type GetPromptParams = z.infer<typeof GetPromptParamsSchema>;
export type GetPromptResponse = Prompt;

// Create prompt
export const CreatePromptBodySchema = PromptSchema.pick({
  name: true,
  content: true,
});
export type CreatePromptBody = z.infer<typeof CreatePromptBodySchema>;
export type CreatePromptResponse = Prompt;

// Update prompt
export const UpdatePromptParamsSchema = z.object({
  id: z.uuid(),
});
export type UpdatePromptParams = z.infer<typeof UpdatePromptParamsSchema>;

export const UpdatePromptBodySchema = PromptSchema.pick({
  name: true,
  content: true,
}).partial();
export type UpdatePromptBody = z.infer<typeof UpdatePromptBodySchema>;
export type UpdatePromptResponse = Prompt;

// Delete prompt
export const DeletePromptParamsSchema = z.object({
  id: z.uuid(),
});
export type DeletePromptParams = z.infer<typeof DeletePromptParamsSchema>;

export interface DeletePromptResponse {
  deleted: boolean;
  id: string;
}
