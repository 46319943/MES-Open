import { outputFormatCollection } from "@/database/mongo";
import { errorMiddleware } from "@/middlewares/error.middleware";
import {
    validateBody,
    validateParams,
} from "@/middlewares/validator.middleware";
import type {
    CreateOutputFormatBody,
    CreateOutputFormatResponse,
    DeleteOutputFormatParams,
    DeleteOutputFormatResponse,
    GetOutputFormatParams,
    GetOutputFormatResponse,
    ListOutputFormatsResponse,
    UpdateOutputFormatBody,
    UpdateOutputFormatParams,
    UpdateOutputFormatResponse,
} from "@/shared/api-schemas/output-format.api-schema";
import {
    CreateOutputFormatBodySchema,
    DeleteOutputFormatParamsSchema,
    GetOutputFormatParamsSchema,
    UpdateOutputFormatBodySchema,
    UpdateOutputFormatParamsSchema,
} from "@/shared/api-schemas/output-format.api-schema";
import type { OutputFormat } from "@/shared/models/output-format.model";
import logger from "@/utils/logger";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response, Router } from "express";
import createHttpError from "http-errors";

const router = Router();

// List output formats
router.get(
  "/",
  async (
    req: Request,
    res: Response<ListOutputFormatsResponse>,
    next: NextFunction
  ) => {

    // Get all output formats
    const outputFormatItems = await outputFormatCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Transform output formats to remove MongoDB _id field
    const response: ListOutputFormatsResponse = outputFormatItems.map((doc) => {
      const { _id, ...outputFormat } = doc;
      return outputFormat as OutputFormat;
    });

    res.json(response);
  }
);

// Get specific output format
router.get(
  "/:id",
  validateParams(GetOutputFormatParamsSchema),
  async (
    req: Request<GetOutputFormatParams>,
    res: Response<GetOutputFormatResponse>,
    next: NextFunction
  ) => {
    const { id } = req.params;

    const doc = await outputFormatCollection.findOne({ id });

    if (!doc) {
      return next(createHttpError(404, "Output format not found"));
    }

    const { _id, ...outputFormat } = doc;
    const response: GetOutputFormatResponse = outputFormat as OutputFormat;

    res.json(response);
  }
);

// Create output format
router.post(
  "/",
  validateBody(CreateOutputFormatBodySchema),
  async (
    req: Request<any, any, CreateOutputFormatBody>,
    res: Response<CreateOutputFormatResponse>,
    next: NextFunction
  ) => {

    // Check if output format with same name already exists
    const existingOutputFormat = await outputFormatCollection.findOne({ name: req.body.name });
    if (existingOutputFormat) {
      return next(createHttpError(409, "Output format with this name already exists"));
    }

    // Prepare new output format
    const now = new Date();
    const newOutputFormat: OutputFormat = {
      id: randomUUID(),
      ...req.body,
      createdAt: now,
      updatedAt: now,
    };

    // Insert output format
    await outputFormatCollection.insertOne(newOutputFormat as any);

    const response: CreateOutputFormatResponse = newOutputFormat;

    logger.info("Output format created", { outputFormatId: newOutputFormat.id, name: newOutputFormat.name });
    res.status(201).json(response);
  }
);

// Update output format
router.put(
  "/:id",
  validateParams(UpdateOutputFormatParamsSchema),
  validateBody(UpdateOutputFormatBodySchema),
  async (
    req: Request<UpdateOutputFormatParams, any, UpdateOutputFormatBody>,
    res: Response<UpdateOutputFormatResponse>,
    next: NextFunction
  ) => {
    const { id } = req.params;

    // Check if output format exists
    const existingDoc = await outputFormatCollection.findOne({ id });
    if (!existingDoc) {
      return next(createHttpError(404, "Output format not found"));
    }

    // Check if name is being updated and if it conflicts with another output format
    if (req.body.name && req.body.name !== existingDoc.name) {
      const nameConflict = await outputFormatCollection.findOne({
        name: req.body.name,
        id: { $ne: id },
      });
      if (nameConflict) {
        return next(
          createHttpError(409, "Output format with this name already exists")
        );
      }
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    // Update the output format
    await outputFormatCollection.updateOne({ id }, { $set: updateData });

    // Get the updated output format
    const updatedDoc = await outputFormatCollection.findOne({ id });
    if (!updatedDoc) {
      return next(createHttpError(500, "Failed to update output format"));
    }

    const { _id, ...updatedOutputFormat } = updatedDoc;
    const response: UpdateOutputFormatResponse = updatedOutputFormat as OutputFormat;

    logger.info("Output format updated", { outputFormatId: id, changes: req.body });
    res.json(response);
  }
);

// Delete output format
router.delete(
  "/:id",
  validateParams(DeleteOutputFormatParamsSchema),
  async (
    req: Request<DeleteOutputFormatParams>,
    res: Response<DeleteOutputFormatResponse>,
    next: NextFunction
  ) => {
    const { id } = req.params;

    // Check if output format exists
    const existingDoc = await outputFormatCollection.findOne({ id });
    if (!existingDoc) {
      return next(createHttpError(404, "Output format not found"));
    }

    // Delete the output format
    const deleteResult = await outputFormatCollection.deleteOne({ id });

    const response: DeleteOutputFormatResponse = {
      deleted: deleteResult.deletedCount === 1,
      id,
    };

    logger.info("Output format deleted", { outputFormatId: id });
    res.json(response);
  }
);

// Apply error middleware
router.use(errorMiddleware);

export default router;
