import { DEV_ENV } from '@/config/server.config';
import {
  ErrorBasicContent,
  ErrorHTTPContent,
  ErrorResponse,
} from "@/shared/models/error.model";
import logger from "@/utils/logger";
import { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import multer from "multer";
import { ZodError } from "zod/v4";

export const errorMiddleware = (
  err: Error & { details?: any },
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let errorBasic: ErrorBasicContent = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    details: err.details,
  };
  let errorHTTP: ErrorHTTPContent = {
    status: 500,
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
  };

  if (err instanceof multer.MulterError) {
    errorBasic.details = {
      code: err.code,
      field: err.field,
    };
    errorHTTP.status = 400;
  }

  if (createError.isHttpError(err)) {
    errorHTTP.status = err.statusCode;
    const {
      name,
      message,
      stack,
      status,
      statusCode,
      expose,
      headers,
      ...additionalFields
    } = err;
    errorBasic.details = {
      ...errorBasic.details,
      ...additionalFields,
    };
  }

  if (err instanceof ZodError) {
    errorBasic.details = err.issues;
    errorHTTP.status = 400;
  }

  let errorResponse: ErrorResponse = {
    ...errorBasic,
    ...errorHTTP,
  };

  logger.error("Error captured in error-middleware", errorResponse);

  if (!DEV_ENV) delete errorResponse.stack;
  res.status(errorResponse.status).json(errorResponse);
};
