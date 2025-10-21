import type { z } from 'zod';

type ZodValidationResult = string | true;

export const zodToQuasarRules = <T>(schema: z.ZodType<T>, path: string[]) => {
  return (val: unknown): ZodValidationResult => {
    const objToValidate = path.reduceRight((acc, key) => ({ [key]: acc }), val);

    const result = schema.safeParse(objToValidate);

    if (!result.success) {
      const error = result.error.issues.find(
        (issue) => issue.path.join('.') === path.join('.')
      );
      return error ? error.message : true;
    }

    return true;
  };
};
