import { z } from "zod/v4";

export const GeneralMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});
export type GeneralMessage = z.infer<typeof GeneralMessageSchema>;

export const ConversationSchema = z.array(GeneralMessageSchema);
export type Conversation = z.infer<typeof ConversationSchema>;

export const DeepseekModels = ["deepseek-chat", "deepseek-reasoner"] as const;
export const GeminiModels = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

export const LLMBackendAndModelMapping: {
  deepseek: typeof DeepseekModels;
  google: typeof GeminiModels;
} = {
  deepseek: DeepseekModels,
  google: GeminiModels,
};

export const LLMBackendSchema = z.enum(
  Object.keys(LLMBackendAndModelMapping) as [
    keyof typeof LLMBackendAndModelMapping,
    ...Array<keyof typeof LLMBackendAndModelMapping>
  ]
);
export type LLMBackend = z.infer<typeof LLMBackendSchema>;

export const DeepseekModelSchema = z.enum(DeepseekModels);
export type DeepseekModel = z.infer<typeof DeepseekModelSchema>;

export const GeminiModelSchema = z.enum(GeminiModels);
export type GeminiModel = z.infer<typeof GeminiModelSchema>;

export const LLMModelSchema = z.union([DeepseekModelSchema, GeminiModelSchema]);
export type LLMModel = z.infer<typeof LLMModelSchema>;

/**
 * Infers the LLM backend from a model name.
 * 
 * **Purpose:** Dynamically determines which backend service should handle a given model
 * **Usage:** Used by the workflow engine to dispatch LLM calls to the correct service
 * **Error Handling:** Throws error for unknown models
 * 
 * @param model - The LLM model name to look up
 * @returns The backend that supports the given model
 * @throws {Error} When the model is not supported by any backend
 * 
 * @example
 * ```typescript
 * inferBackendFromModel("gemini-2.0-flash") // returns "google"
 * inferBackendFromModel("deepseek-chat")    // returns "deepseek"
 * ```
 */
export function inferBackendFromModel(model: LLMModel): LLMBackend {
  // Check Google models
  if (GeminiModels.includes(model as GeminiModel)) {
    return "google";
  }
  
  // Check DeepSeek models
  if (DeepseekModels.includes(model as DeepseekModel)) {
    return "deepseek";
  }
  
  throw new Error(`Model '${model}' is not supported by any available backend`);
}
