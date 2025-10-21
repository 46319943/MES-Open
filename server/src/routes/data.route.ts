import { DATASET_COLLECTION_PREFIX } from "@/config/constants";
import db from "@/database/mongo";
import { errorMiddleware } from "@/middlewares/error.middleware";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middlewares/validator.middleware";
import type {
  CreateDataBody,
  CreateDataParams,
  CreateDataResponse,
  DeleteDataBody,
  DeleteDataParams,
  DeleteDataResponse,
  GetDataParams,
  GetDataResponse,
  ListDataParams,
  ListDataQuery,
  ListDataResponse,
  UpdateDataBody,
  UpdateDataParams,
  UpdateDataResponse,
} from "@/shared/api-schemas/data.api-schema";
import {
  CreateDataBodySchema,
  CreateDataParamsSchema,
  DeleteDataBodySchema,
  DeleteDataParamsSchema,
  GetDataParamsSchema,
  ListDataParamsSchema,
  ListDataQuerySchema,
  UpdateDataBodySchema,
  UpdateDataParamsSchema,
} from "@/shared/api-schemas/data.api-schema";
import type { Data } from "@/shared/models/data.model";
import logger from "@/utils/logger";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response, Router } from "express";
import createHttpError from "http-errors";

const router = Router();

// List data in a dataset
router.get(
  "/:datasetId",
  validateParams(ListDataParamsSchema),
  validateQuery(ListDataQuerySchema),
  async (
    req: Request<ListDataParams, any, any, ListDataQuery>,
    res: Response<ListDataResponse>,
    next: NextFunction
  ) => {
    const { datasetId } = req.params;
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc', filterByEmptySegments, filterByPopulatedSegments } = req.query;

    // Check if dataset exists
    const { datasetCollection } = await import("@/database/mongo");
    const dataset = await datasetCollection.findOne({ id: datasetId });
    if (!dataset) {
      return next(createHttpError(404, "Dataset not found"));
    }

    // Get data from the dataset collection with pagination
    const dataCollectionName = `${DATASET_COLLECTION_PREFIX}${dataset.name}`;
    const dataCollection = db.collection(dataCollectionName);
    
    // Build query filter
    const queryFilter: any = {};
    
    // Handle filtering by segments
    if (filterByEmptySegments !== undefined && filterByPopulatedSegments !== undefined) {
      // Both parameters provided - this is an invalid combination
      return next(createHttpError(400, "Cannot specify both filterByEmptySegments and filterByPopulatedSegments"));
    } else if (filterByEmptySegments !== undefined) {
      // Filter for empty segments
      if (filterByEmptySegments) {
        queryFilter.$or = [
          { segments: { $exists: false } },
          { segments: { $size: 0 } }
        ];
      }
    } else if (filterByPopulatedSegments !== undefined) {
      // Filter for populated segments
      if (filterByPopulatedSegments) {
        queryFilter.segments = { $exists: true, $not: { $size: 0 } };
      }
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get total count for pagination info
    const total = await dataCollection.countDocuments(queryFilter);
    const totalPages = Math.ceil(total / limit);
    
    // Build sort object
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortObject: any = {
      [sortBy]: sortDirection,
      id: 1, // Always use id as secondary sort criterion
    };

    // Get paginated data
    const dataItems = await dataCollection
      .find(queryFilter)
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .toArray();

    // Transform data to remove MongoDB _id field
    const data: Data[] = dataItems.map((doc) => {
      const { _id, ...dataItem } = doc;
      return dataItem as Data;
    });

    const response: ListDataResponse = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    res.json(response);
  }
);

// Get specific data item
router.get(
  "/:datasetId/:id",
  validateParams(GetDataParamsSchema),
  async (
    req: Request<GetDataParams>,
    res: Response<GetDataResponse>,
    next: NextFunction
  ) => {
    const { datasetId, id } = req.params;

    // Check if dataset exists
    const { datasetCollection } = await import("@/database/mongo");
    const dataset = await datasetCollection.findOne({ id: datasetId });
    if (!dataset) {
      return next(createHttpError(404, "Dataset not found"));
    }

    // Get data item from the dataset collection
    const dataCollectionName = `${DATASET_COLLECTION_PREFIX}${dataset.name}`;
    const dataCollection = db.collection(dataCollectionName);
    const doc = await dataCollection.findOne({ id });

    if (!doc) {
      return next(createHttpError(404, "Data item not found"));
    }

    const { _id, ...dataItem } = doc;
    const response: GetDataResponse = dataItem as Data;

    res.json(response);
  }
);

// Create data (bulk operation)
router.post(
  "/:datasetId",
  validateParams(CreateDataParamsSchema),
  validateBody(CreateDataBodySchema),
  async (
    req: Request<CreateDataParams, any, CreateDataBody>,
    res: Response<CreateDataResponse>,
    next: NextFunction
  ) => {
    const { datasetId } = req.params;
    const { data: dataItems } = req.body;

    // Check if dataset exists
    const { datasetCollection } = await import("@/database/mongo");
    const dataset = await datasetCollection.findOne({ id: datasetId });
    if (!dataset) {
      return next(createHttpError(404, "Dataset not found"));
    }

    // Prepare data items for insertion
    const now = new Date();
    const newDataItems: Data[] = dataItems.map((item) => ({
      id: randomUUID(),
      text: item.text,
      segments: item.segments,
      metaData: item.metaData,
      createdAt: now,
      updatedAt: now,
    }));

    // Insert data into the dataset collection
    const dataCollectionName = `${DATASET_COLLECTION_PREFIX}${dataset.name}`;
    const dataCollection = db.collection(dataCollectionName);
    await dataCollection.insertMany(newDataItems as any[]);

    const response: CreateDataResponse = {
      data: newDataItems,
      created: newDataItems.length,
    };

    logger.info("Data items created", {
      datasetId,
      count: newDataItems.length,
    });
    res.status(201).json(response);
  }
);

// Update data
router.put(
  "/:datasetId/:id",
  validateParams(UpdateDataParamsSchema),
  validateBody(UpdateDataBodySchema),
  async (
    req: Request<UpdateDataParams, any, UpdateDataBody>,
    res: Response<UpdateDataResponse>,
    next: NextFunction
  ) => {
    const { datasetId, id } = req.params;

    // Check if dataset exists
    const { datasetCollection } = await import("@/database/mongo");
    const dataset = await datasetCollection.findOne({ id: datasetId });
    if (!dataset) {
      return next(createHttpError(404, "Dataset not found"));
    }

    // Get data collection
    const dataCollectionName = `${DATASET_COLLECTION_PREFIX}${dataset.name}`;
    const dataCollection = db.collection(dataCollectionName);

    // Check if data item exists
    const existingDoc = await dataCollection.findOne({ id });
    if (!existingDoc) {
      return next(createHttpError(404, "Data item not found"));
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    // Update the data item
    await dataCollection.updateOne({ id }, { $set: updateData });

    // Get the updated data item
    const updatedDoc = await dataCollection.findOne({ id });
    if (!updatedDoc) {
      return next(createHttpError(500, "Failed to update data item"));
    }

    const { _id, ...updatedDataItem } = updatedDoc;
    const response: UpdateDataResponse = updatedDataItem as Data;

    logger.info("Data item updated", { datasetId, dataId: id, changes: req.body });
    res.json(response);
  }
);

// Delete data (bulk operation)
router.delete(
  "/:datasetId",
  validateParams(DeleteDataParamsSchema),
  validateBody(DeleteDataBodySchema),
  async (
    req: Request<DeleteDataParams, any, DeleteDataBody>,
    res: Response<DeleteDataResponse>,
    next: NextFunction
  ) => {
    const { datasetId } = req.params;
    const { ids } = req.body;

    // Check if dataset exists
    const { datasetCollection } = await import("@/database/mongo");
    const dataset = await datasetCollection.findOne({ id: datasetId });
    if (!dataset) {
      return next(createHttpError(404, "Dataset not found"));
    }

    // Get data collection
    const dataCollectionName = `${DATASET_COLLECTION_PREFIX}${dataset.name}`;
    const dataCollection = db.collection(dataCollectionName);

    // Find existing data items to determine which IDs were not found
    const existingItems = await dataCollection
      .find({ id: { $in: ids } })
      .toArray();
    const existingIds = existingItems.map((item) => item.id);
    const notFound = ids.filter((id) => !existingIds.includes(id));

    // Delete the data items
    const deleteResult = await dataCollection.deleteMany({
      id: { $in: ids },
    });

    const response: DeleteDataResponse = {
      deleted: deleteResult.deletedCount || 0,
      notFound,
    };

    logger.info("Data items deleted", {
      datasetId,
      deleted: response.deleted,
      notFound: response.notFound,
    });
    res.json(response);
  }
);

// Apply error middleware
router.use(errorMiddleware);

export default router;
