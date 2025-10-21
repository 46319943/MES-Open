import {
    ConversationSchema,
    LLMModelSchema
} from '@/shared/models/llm.model';
import { z } from 'zod';

// Call LLM endpoint
export const CallLLMBodySchema = z.object({
  messages: ConversationSchema,
  model: LLMModelSchema,
});
export type CallLLMBody = z.infer<typeof CallLLMBodySchema>;

export interface CallLLMResponse {
  response: string;
  inputToken: number;
  outputToken: number;
  model: string;
  backend: string;
}
