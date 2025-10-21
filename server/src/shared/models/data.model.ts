import { z } from 'zod';
import { AnnotationSchema } from './annotation.model';

export const DataSegmentSchema = z.object({
  // Index of the first character of the segment in the text (inclusive)
  indexStart: z.number(),
  // Index after the last character of the segment in the text (exclusive)
  indexEnd: z.number(),
  // Annotations of the segment
  annotations: z.array(AnnotationSchema),
});
export type DataSegment = z.infer<typeof DataSegmentSchema>;

export const DataSchema = z.object({
  id: z.string(),
  text: z.string(),
  // Segments of the text
  segments: z.array(DataSegmentSchema),
  // Metadata of the data, key-value pairs
  metaData: z.record(z.string(), z.any()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Data = z.infer<typeof DataSchema>;
