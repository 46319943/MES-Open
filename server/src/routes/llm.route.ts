import { callDeepseekLLM } from "@/integrations/llm/deepseek.service";
import { callGeminiLLM } from "@/integrations/llm/gemini.service";
import { errorMiddleware } from "@/middlewares/error.middleware";
import { validateBody } from "@/middlewares/validator.middleware";
import type {
    CallLLMBody,
    CallLLMResponse,
} from "@/shared/api-schemas/llm.api-schema";
import { CallLLMBodySchema } from "@/shared/api-schemas/llm.api-schema";
import {
    inferBackendFromModel,
    type DeepseekModel,
    type GeminiModel
} from "@/shared/models/llm.model";
import logger from "@/utils/logger";
import { NextFunction, Request, Response, Router } from "express";
import createHttpError from "http-errors";

const router = Router();

// Call LLM endpoint
router.post(
  "/call",
  validateBody(CallLLMBodySchema),
  async (
    req: Request<any, any, CallLLMBody>,
    res: Response<CallLLMResponse>,
    next: NextFunction
  ) => {
    try {
      const { messages, model } = req.body;

      // Infer backend from model
      const backend = inferBackendFromModel(model);

      let result: { response: string; inputToken: number; outputToken: number };

      // Call appropriate LLM service based on backend
      switch (backend) {
        case "deepseek":
          result = await callDeepseekLLM(messages, model as DeepseekModel);
          break;
        case "google":
          result = await callGeminiLLM(messages, model as GeminiModel);
          break;
        default:
          return next(createHttpError(400, `Unsupported backend: ${backend}`));
      }

      const response: CallLLMResponse = {
        response: result.response,
        inputToken: result.inputToken,
        outputToken: result.outputToken,
        model,
        backend,
      };

      logger.info("LLM call completed", {
        model,
        backend,
        inputToken: result.inputToken,
        outputToken: result.outputToken,
      });

      res.json(response);
    } catch (error) {
      logger.error("LLM call failed", {
        model: req.body.model,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      next(error);
    }
  }
);

// Apply error middleware
router.use(errorMiddleware);

export default router;
