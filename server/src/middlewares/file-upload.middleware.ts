import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB in bytes
  }
});

// Audio upload configuration with memory storage
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

const uploadWithDataParsing = (fieldOptions: multer.Field[]) => {
  return async (req: Request, res: Response, next: Function) => {
    // This functional scope try-catch could be removed if updated to Express 5+.
    try {
      // Execute multer middleware
      await new Promise((resolve, reject) => {
        upload.fields(fieldOptions)(req, res, (error: any) => {
          if (error) reject(error);
          resolve(undefined);
        });
      });

      // Execute data parsing
      if (req.body && req.body.data) {
        try {
          const parsedData = typeof req.body.data === 'string' 
            ? JSON.parse(req.body.data)
            : req.body.data;

          req.body = {
            ...req.body,
            ...parsedData
          };
          
          delete req.body.data;
        } catch (error) {
          console.warn('Failed to parse data field:', error);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Audio file upload middleware for single audio file
export const uploadAudioFile = (fieldName: string = 'audioFile') => {
  return audioUpload.single(fieldName);
};

export default uploadWithDataParsing;