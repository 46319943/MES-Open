import { dataBoostCollection } from "@/database/mongo";
import { errorMiddleware } from "@/middlewares/error.middleware";
import {
  validateBody,
  validateParams,
} from "@/middlewares/validator.middleware";
import type {
  CreateDataBoostBody,
  CreateDataBoostResponse,
  DeleteDataBoostParams,
  DeleteDataBoostResponse,
  GetDataBoostParams,
  GetDataBoostResponse,
  ListDataBoostsResponse,
  UpdateDataBoostBody,
  UpdateDataBoostParams,
  UpdateDataBoostResponse,
} from "@/shared/api-schemas/data-boost.api-schema";
import {
  CreateDataBoostBodySchema,
  DeleteDataBoostParamsSchema,
  GetDataBoostParamsSchema,
  UpdateDataBoostBodySchema,
  UpdateDataBoostParamsSchema,
} from "@/shared/api-schemas/data-boost.api-schema";
import type { DataBoost } from "@/shared/models/data-boost.model";
import logger from "@/utils/logger";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response, Router } from "express";
import createHttpError from "http-errors";

const router = Router();

// List data boosts
router.get(
  "/",
  async (
    req: Request,
    res: Response<ListDataBoostsResponse>,
    next: NextFunction
  ) => {
    // Get all data boosts
    const dataBoostItems = await dataBoostCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Transform data boosts to remove MongoDB _id field
    const response: ListDataBoostsResponse = dataBoostItems.map((doc) => {
      const { _id, ...dataBoost } = doc;
      return dataBoost as DataBoost;
    });

    res.json(response);
  }
);

// Get specific data boost
router.get(
  "/:id",
  validateParams(GetDataBoostParamsSchema),
  async (
    req: Request<GetDataBoostParams>,
    res: Response<GetDataBoostResponse>,
    next: NextFunction
  ) => {
    const { id } = req.params;

    const doc = await dataBoostCollection.findOne({ id });

    if (!doc) {
      return next(createHttpError(404, "Data boost not found"));
    }

    const { _id, ...dataBoost } = doc;
    const response: GetDataBoostResponse = dataBoost as DataBoost;

    res.json(response);
  }
);

// Create data boost
router.post(
  "/",
  validateBody(CreateDataBoostBodySchema),
  async (
    req: Request<any, any, CreateDataBoostBody>,
    res: Response<CreateDataBoostResponse>,
    next: NextFunction
  ) => {
    const {
      name,
      inputDatasetId,
      exampleDatasetId,
      promptId,
      outputFormatId,
      outputFormatType,
      exampleTemplate,
      exampleCount,
    } = req.body;

    // Check if data boost with same name already exists
    const existingDataBoost = await dataBoostCollection.findOne({ name });
    if (existingDataBoost) {
      return next(createHttpError(409, "Data boost with this name already exists"));
    }

    // Prepare new data boost
    const now = new Date();
    const newDataBoost: DataBoost = {
      id: randomUUID(),
      name,
      inputDatasetId,
      exampleDatasetId,
      promptId,
      outputFormatId,
      outputFormatType,
      exampleTemplate,
      exampleCount,
      createdAt: now,
      updatedAt: now,
    };

    // Insert data boost
    await dataBoostCollection.insertOne(newDataBoost as any);

    const response: CreateDataBoostResponse = newDataBoost;

    logger.info("Data boost created", { dataBoostId: newDataBoost.id, name });
    res.status(201).json(response);
  }
);

// Update data boost
router.put(
  "/:id",
  validateParams(UpdateDataBoostParamsSchema),
  validateBody(UpdateDataBoostBodySchema),
  async (
    req: Request<UpdateDataBoostParams, any, UpdateDataBoostBody>,
    res: Response<UpdateDataBoostResponse>,
    next: NextFunction
  ) => {
    const { id } = req.params;

    // Check if data boost exists
    const existingDoc = await dataBoostCollection.findOne({ id });
    if (!existingDoc) {
      return next(createHttpError(404, "Data boost not found"));
    }

    // Check if name is being updated and if it conflicts with another data boost
    if (req.body.name && req.body.name !== existingDoc.name) {
      const nameConflict = await dataBoostCollection.findOne({
        name: req.body.name,
        id: { $ne: id },
      });
      if (nameConflict) {
        return next(
          createHttpError(409, "Data boost with this name already exists")
        );
      }
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    // Update the data boost
    await dataBoostCollection.updateOne({ id }, { $set: updateData });

    // Get the updated data boost
    const updatedDoc = await dataBoostCollection.findOne({ id });
    if (!updatedDoc) {
      return next(createHttpError(500, "Failed to update data boost"));
    }

    const { _id, ...updatedDataBoost } = updatedDoc;
    const response: UpdateDataBoostResponse = updatedDataBoost as DataBoost;

    logger.info("Data boost updated", { dataBoostId: id, changes: req.body });
    res.json(response);
  }
);

// Delete data boost
router.delete(
  "/:id",
  validateParams(DeleteDataBoostParamsSchema),
  async (
    req: Request<DeleteDataBoostParams>,
    res: Response<DeleteDataBoostResponse>,
    next: NextFunction
  ) => {
    const { id } = req.params;

    // Check if data boost exists
    const existingDoc = await dataBoostCollection.findOne({ id });
    if (!existingDoc) {
      return next(createHttpError(404, "Data boost not found"));
    }

    // Delete the data boost
    const deleteResult = await dataBoostCollection.deleteOne({ id });

    const response: DeleteDataBoostResponse = {
      deleted: deleteResult.deletedCount === 1,
      id,
    };

    logger.info("Data boost deleted", { dataBoostId: id });
    res.json(response);
  }
);

// Apply error middleware
router.use(errorMiddleware);

export default router;
