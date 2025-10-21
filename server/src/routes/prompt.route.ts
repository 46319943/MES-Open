import { promptCollection } from "@/database/mongo";
import { errorMiddleware } from "@/middlewares/error.middleware";
import {
    validateBody,
    validateParams,
} from "@/middlewares/validator.middleware";
import type {
    CreatePromptBody,
    CreatePromptResponse,
    DeletePromptParams,
    DeletePromptResponse,
    GetPromptParams,
    GetPromptResponse,
    ListPromptsResponse,
    UpdatePromptBody,
    UpdatePromptParams,
    UpdatePromptResponse,
} from "@/shared/api-schemas/prompt.api-schema";
import {
    CreatePromptBodySchema,
    DeletePromptParamsSchema,
    GetPromptParamsSchema,
    UpdatePromptBodySchema,
    UpdatePromptParamsSchema,
} from "@/shared/api-schemas/prompt.api-schema";
import type { Prompt } from "@/shared/models/prompt.model";
import logger from "@/utils/logger";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response, Router } from "express";
import createHttpError from "http-errors";

const router = Router();

// List prompts
router.get(
  "/",
  async (
    req: Request,
    res: Response<ListPromptsResponse>,
    next: NextFunction
  ) => {
    // Get all prompts
    const promptItems = await promptCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Transform prompts to remove MongoDB _id field
    const response: ListPromptsResponse = promptItems.map((doc) => {
      const { _id, ...prompt } = doc;
      return prompt as Prompt;
    });

    res.json(response);
  }
);

// Get specific prompt
router.get(
  "/:id",
  validateParams(GetPromptParamsSchema),
  async (
    req: Request<GetPromptParams>,
    res: Response<GetPromptResponse>,
    next: NextFunction
  ) => {
    const { id } = req.params;

    const doc = await promptCollection.findOne({ id });

    if (!doc) {
      return next(createHttpError(404, "Prompt not found"));
    }

    const { _id, ...prompt } = doc;
    const response: GetPromptResponse = prompt as Prompt;

    res.json(response);
  }
);

// Create prompt
router.post(
  "/",
  validateBody(CreatePromptBodySchema),
  async (
    req: Request<any, any, CreatePromptBody>,
    res: Response<CreatePromptResponse>,
    next: NextFunction
  ) => {
    const { name, content } = req.body;

    // Check if prompt with same name already exists
    const existingPrompt = await promptCollection.findOne({ name });
    if (existingPrompt) {
      return next(createHttpError(409, "Prompt with this name already exists"));
    }

    // Prepare new prompt
    const now = new Date();
    const newPrompt: Prompt = {
      id: randomUUID(),
      name,
      content,
      createdAt: now,
      updatedAt: now,
    };

    // Insert prompt
    await promptCollection.insertOne(newPrompt as any);

    const response: CreatePromptResponse = newPrompt;

    logger.info("Prompt created", { promptId: newPrompt.id, name });
    res.status(201).json(response);
  }
);

// Update prompt
router.put(
  "/:id",
  validateParams(UpdatePromptParamsSchema),
  validateBody(UpdatePromptBodySchema),
  async (
    req: Request<UpdatePromptParams, any, UpdatePromptBody>,
    res: Response<UpdatePromptResponse>,
    next: NextFunction
  ) => {
    const { id } = req.params;

    // Check if prompt exists
    const existingDoc = await promptCollection.findOne({ id });
    if (!existingDoc) {
      return next(createHttpError(404, "Prompt not found"));
    }

    // Check if name is being updated and if it conflicts with another prompt
    if (req.body.name && req.body.name !== existingDoc.name) {
      const nameConflict = await promptCollection.findOne({
        name: req.body.name,
        id: { $ne: id },
      });
      if (nameConflict) {
        return next(
          createHttpError(409, "Prompt with this name already exists")
        );
      }
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    // Update the prompt
    await promptCollection.updateOne({ id }, { $set: updateData });

    // Get the updated prompt
    const updatedDoc = await promptCollection.findOne({ id });
    if (!updatedDoc) {
      return next(createHttpError(500, "Failed to update prompt"));
    }

    const { _id, ...updatedPrompt } = updatedDoc;
    const response: UpdatePromptResponse = updatedPrompt as Prompt;

    logger.info("Prompt updated", { promptId: id, changes: req.body });
    res.json(response);
  }
);

// Delete prompt
router.delete(
  "/:id",
  validateParams(DeletePromptParamsSchema),
  async (
    req: Request<DeletePromptParams>,
    res: Response<DeletePromptResponse>,
    next: NextFunction
  ) => {
    const { id } = req.params;

    // Check if prompt exists
    const existingDoc = await promptCollection.findOne({ id });
    if (!existingDoc) {
      return next(createHttpError(404, "Prompt not found"));
    }

    // Delete the prompt
    const deleteResult = await promptCollection.deleteOne({ id });

    const response: DeletePromptResponse = {
      deleted: deleteResult.deletedCount === 1,
      id,
    };

    logger.info("Prompt deleted", { promptId: id });
    res.json(response);
  }
);

// Apply error middleware
router.use(errorMiddleware);

export default router;
