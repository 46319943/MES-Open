import { DATASET_COLLECTION_PREFIX } from "@/config/constants";
import db, { datasetCollection } from "@/database/mongo";
import { errorMiddleware } from "@/middlewares/error.middleware";
import {
  validateBody,
  validateParams,
} from "@/middlewares/validator.middleware";
import type {
  CreateDatasetBody,
  CreateDatasetResponse,
  DeleteDatasetParams,
  GetDatasetParams,
  GetDatasetResponse,
  ListDatasetsResponse,
  UpdateDatasetBody,
  UpdateDatasetParams,
  UpdateDatasetResponse,
} from "@/shared/api-schemas/dataset.api-schema";
import {
  CreateDatasetBodySchema,
  DeleteDatasetParamsSchema,
  GetDatasetParamsSchema,
  UpdateDatasetBodySchema,
  UpdateDatasetParamsSchema,
} from "@/shared/api-schemas/dataset.api-schema";
import type { Dataset } from "@/shared/models/dataset.model";
import logger from "@/utils/logger";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response, Router } from "express";
import createHttpError from "http-errors";

const router = Router();

// List datasets
router.get(
  "/",
  async (
    req: Request,
    res: Response<ListDatasetsResponse>,
    next: NextFunction
  ) => {
    // Get all datasets
    const datasets = await datasetCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Get length of each dataset's data collection
    const datasetsWithLength = await Promise.all(
      datasets.map(async (doc) => {
        const { _id, ...dataset } = doc;
        const dataCollectionName = `${DATASET_COLLECTION_PREFIX}${dataset.name}`;
        const dataCollection = db.collection(dataCollectionName);
        const length = await dataCollection.countDocuments({});

        return {
          ...dataset,
          length,
        };
      })
    );

    const response: ListDatasetsResponse = {
      datasets: datasetsWithLength,
    };

    res.json(response);
  }
);

// Get dataset by ID
router.get(
  "/:id",
  validateParams(GetDatasetParamsSchema),
  async (
    req: Request<GetDatasetParams>,
    res: Response<GetDatasetResponse>,
    next: NextFunction
  ) => {
    const { id } = req.params;

    const doc = await datasetCollection.findOne({
      id: id,
    });
    if (!doc) {
      return next(createHttpError(404, "Dataset not found"));
    }

    const { _id, ...dataset } = doc;

    // Get length of dataset's data collection
    const dataCollectionName = `${DATASET_COLLECTION_PREFIX}${dataset.name}`;
    const dataCollection = db.collection(dataCollectionName);
    const length = await dataCollection.countDocuments({});

    const response: GetDatasetResponse = {
      ...dataset,
      length,
    };

    res.json(response);
  }
);

// Create dataset
router.post(
  "/",
  validateBody(CreateDatasetBodySchema),
  async (
    req: Request<CreateDatasetBody>,
    res: Response<CreateDatasetResponse>,
    next: NextFunction
  ) => {
    const { name, description } = req.body;

    // Check if dataset with same name already exists
    const existingDataset = await datasetCollection.findOne({ name });
    if (existingDataset) {
      return next(
        createHttpError(409, "Dataset with this name already exists")
      );
    }

    // Create new dataset
    const now = new Date();
    const newDataset: Dataset = {
      id: randomUUID(),
      name,
      description,
      createdAt: now,
      updatedAt: now,
    };

    await datasetCollection.insertOne(newDataset as any);

    // Create the data collection for this dataset (empty initially)
    const dataCollectionName = `${DATASET_COLLECTION_PREFIX}${name}`;
    await db.createCollection(dataCollectionName);

    const response: CreateDatasetResponse = {
      ...newDataset,
      length: 0, // New dataset starts with 0 items
    };

    logger.info("Dataset created", { datasetId: newDataset.id, name });
    res.status(201).json(response);
  }
);

// Update dataset
router.put(
  "/:id",
  validateParams(UpdateDatasetParamsSchema),
  validateBody(UpdateDatasetBodySchema),
  async (
    req: Request<UpdateDatasetParams, any, UpdateDatasetBody>,
    res: Response<UpdateDatasetResponse>,
    next: NextFunction
  ) => {
    const { id } = req.params;
    const { name, description } = req.body;

    const doc = await datasetCollection.findOne({
      id: id,
    });
    if (!doc) {
      return next(createHttpError(404, "Dataset not found"));
    }

    const { _id, ...dataset } = doc;

    const updateData: Partial<Dataset> = {
      ...req.body,
      updatedAt: new Date(),
    };

    // If name is being changed, we need to rename the data collection
    if (name && name !== dataset.name) {
      // Check if new name already exists
      const existingDataset = await datasetCollection.findOne({
        name: name,
        id: { $ne: id },
      });
      if (existingDataset) {
        return next(
          createHttpError(409, "Dataset with this name already exists")
        );
      }

      // Rename the data collection
      const oldCollectionName = `${DATASET_COLLECTION_PREFIX}${dataset.name}`;
      const newCollectionName = `${DATASET_COLLECTION_PREFIX}${name}`;

      try {
        await db.collection(oldCollectionName).rename(newCollectionName);
        logger.info("Dataset collection renamed", {
          from: oldCollectionName,
          to: newCollectionName,
          datasetId: id,
        });
      } catch (renameError) {
        // If collection doesn't exist, create the new one
        logger.warn("Could not rename collection, creating new one", {
          oldCollectionName,
          newCollectionName,
          error: renameError,
        });
        await db.createCollection(newCollectionName);
      }
    }

    // Update the dataset
    await datasetCollection.updateOne({ id: id }, { $set: updateData });

    const updatedDoc = await datasetCollection.findOne({
      id: id,
    });
    if (!updatedDoc) {
      return next(createHttpError(500, "Failed to update dataset"));
    }

    const { _id: _, ...updatedDataset } = updatedDoc;

    // Get length of dataset's data collection
    const dataCollectionName = `${DATASET_COLLECTION_PREFIX}${updatedDataset.name}`;
    const dataCollection = db.collection(dataCollectionName);
    const length = await dataCollection.countDocuments({});

    const response: UpdateDatasetResponse = {
      ...updatedDataset,
      length,
    };

    logger.info("Dataset updated", { datasetId: id, changes: req.body });
    res.json(response);
  }
);

// Delete dataset
router.delete(
  "/:id",
  validateParams(DeleteDatasetParamsSchema),
  async (
    req: Request<DeleteDatasetParams>,
    res: Response<void>,
    next: NextFunction
  ) => {
    const { id } = req.params;

    const doc = await datasetCollection.findOne({
      id: id,
    });
    if (!doc) {
      return next(createHttpError(404, "Dataset not found"));
    }

    const { _id, ...dataset } = doc;

    // Delete the data collection first
    const dataCollectionName = `${DATASET_COLLECTION_PREFIX}${dataset.name}`;
    try {
      await db.collection(dataCollectionName).drop();
      logger.info("Dataset collection dropped", {
        collectionName: dataCollectionName,
      });
    } catch (dropError) {
      // Collection might not exist, log warning but continue
      logger.warn("Could not drop dataset collection", {
        collectionName: dataCollectionName,
        error: dropError,
      });
    }

    // Delete the dataset
    await datasetCollection.deleteOne({ id: id });

    logger.info("Dataset deleted", { datasetId: id, name: dataset.name });
    res.status(204).send();
  }
);

// Apply error middleware
router.use(errorMiddleware);

export default router;
