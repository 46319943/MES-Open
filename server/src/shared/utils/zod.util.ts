import type { ZodBoolean, ZodOptional } from 'zod/v4';
import { z } from 'zod/v4';

/**
 * Creates a Zod object schema where each specified field is an optional boolean.
 * @param fields Array of field names to convert to optional boolean types
 * @param makeOptional Whether to make the boolean fields optional (defaults to true)
 * @returns A Zod object schema with the specified fields as boolean types
 */
export function createBooleanFieldsSchema<T extends string>(
  fields: readonly T[],
  makeOptional: boolean = true
): z.ZodObject<Record<T, z.ZodType<boolean> | ZodOptional<ZodBoolean>>> {
  const schemaFields = fields.reduce<Record<string, z.ZodType<boolean> | ZodOptional<ZodBoolean>>>((acc, field) => {
    const booleanField = z.boolean();
    acc[field] = makeOptional ? booleanField.optional() : booleanField;
    return acc;
  }, {});

  return z.object(schemaFields as Record<T, z.ZodType<boolean> | ZodOptional<ZodBoolean>>);
}