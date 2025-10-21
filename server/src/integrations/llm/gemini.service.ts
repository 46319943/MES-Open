import { GOOGLE_API_KEY, LLM_RETRY_INTERVAL } from '@/config/integration.config';
import { GeminiModel, GeneralMessage } from "@/shared/models/llm.model";
import logger from "@/utils/logger";
import {
  ApiError,
  GoogleGenAI,
} from "@google/genai";

const GOOGLE_API = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

export async function callGeminiLLM(
  messages: GeneralMessage[],
  model: GeminiModel
): Promise<{ response: string; inputToken: number; outputToken: number }> {
  while (true) {
    try {
      // Convert messages to the new format
      const contents = messages.map((msg) => ({
        role: msg.role !== "user" ? "model" : msg.role,
        parts: [{ text: msg.content }],
      }));

      const response = await GOOGLE_API.models.generateContent({
        model: model,
        contents: contents,
        config: {
          temperature: 0,
          maxOutputTokens: 8192,
        },
      });

      if (!response.text) {
        throw new Error("No response text received from Gemini API");
      }

      // Extract token usage from response metadata
      const inputToken = response.usageMetadata?.promptTokenCount || 0;
      const outputToken = response.usageMetadata?.candidatesTokenCount || 0;

      return {
        response: response.text,
        inputToken,
        outputToken,
      };
    } catch (error: unknown) {
      // Handle errors using the new ApiError class
      if (error instanceof ApiError) {
        logger.error(`Gemini API Error: ${error.message}`);
        
        // Handle rate limiting and quota errors
        if (error.status === 429 || error.message?.includes("quota")) {
          logger.info(
            `Rate limit exceeded. Retrying in ${
              LLM_RETRY_INTERVAL / 1000
            } seconds...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, LLM_RETRY_INTERVAL)
          );
          continue;
        } else if (error.status === 503) {
          logger.info(
            `Gemini API is temporarily unavailable. Retrying in ${
              LLM_RETRY_INTERVAL / 1000
            } seconds...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, LLM_RETRY_INTERVAL)
          );
          continue;
        } else {
          throw error;
        }
      } else {
        // Handle any other unexpected errors
        logger.error(`Unexpected error in Gemini service:`, error);
        throw error;
      }
    }
  }
}
