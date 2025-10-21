import { z } from "zod";

export const PromptSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Prompt = z.infer<typeof PromptSchema>;
