import { DEEPSEEK_API_KEY, LLM_RETRY_INTERVAL } from '@/config/integration.config';
import { DeepseekModel, GeneralMessage } from "@/shared/models/llm.model";
import logger from "@/utils/logger";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: DEEPSEEK_API_KEY,
});

export async function callDeepseekLLM(
  messages: GeneralMessage[],
  model: DeepseekModel
): Promise<{ response: string; inputToken: number; outputToken: number }> {
  while (true) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages,
        temperature: 0,
        max_tokens: 8192,
      });
      
      // Extract token usage from Deepseek (OpenAI-compatible) response
      const inputToken = response.usage?.prompt_tokens ?? 0;
      const outputToken = response.usage?.completion_tokens ?? 0;

      return {
        response: response.choices[0]?.message?.content || "",
        inputToken,
        outputToken,
      };
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          logger.info(
            `Rate limit exceeded. Retrying in ${
              LLM_RETRY_INTERVAL / 1000
            } seconds...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, LLM_RETRY_INTERVAL)
          );
        } else if (error.status === 504) {
          logger.info(
            `Gateway timeout. Retrying in ${
              LLM_RETRY_INTERVAL / 1000
            } seconds...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, LLM_RETRY_INTERVAL)
          );
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }
}
