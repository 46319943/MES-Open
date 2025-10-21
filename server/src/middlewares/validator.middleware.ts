import { NextFunction, Request, Response } from 'express';
import { promises as fs } from 'fs';
import { z, ZodType } from 'zod/v4';

const generateValidator = <T, B, Q, P>(
  dataGetter: (req: Request<T, B, Q, P>) => any,
  dataSetter: (req: Request<T, B, Q, P>, data: any) => void
) => {
  return (schema: ZodType) => 
    async (req: Request<T, B, Q, P>, res: Response, next: NextFunction) => {
      try {
        const data = await schema.parseAsync(dataGetter(req));
        dataSetter(req, data);
        return next();
      } catch (error) {
        next(error);
      }
    };
};

export const validateBody = generateValidator(
  (req) => req.body,
  (req, data) => { req.body = data; }
);

export const validateQuery = generateValidator(
  (req) => req.query,
  (req, data) => { req.query = data; }
);

export const validateParams = generateValidator(
  (req) => req.params,
  (req, data) => { req.params = data; }
);

export const validateFiles = <T extends ZodType>(schema: T) => async (req: Request, res: Response, next: NextFunction) => {
  // No files uploaded. Pass validation if schema allows for no files
  if (!req.files) {
    try {
      await schema.parseAsync({});
      return next();
    } catch (error) {
      next(error);
    }
  }

  try {
    await schema.parseAsync(req.files) as z.infer<T>;
    next();
  } catch (error) {
    // Clean up uploaded files in case of validation failure
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      for (const fieldFiles of Object.values(files)) {
        for (const file of fieldFiles) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('Error deleting file:', unlinkError);
          }
        }
      }
    }
    next(error);
  }
};
