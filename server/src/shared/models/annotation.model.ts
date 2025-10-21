import { z } from 'zod';

export const AnnotationSchema = z.object({
  sense: z.enum(['Vision', 'Hearing', 'Taste', 'Smell', 'Touch']),
  stimulus: z.string(),
  perception: z.string(),
  sentiment: z.enum(['Positive', 'Negative', 'Neutral']),
  CoT: z.string().optional(),
});
export type Annotation = z.infer<typeof AnnotationSchema>;
