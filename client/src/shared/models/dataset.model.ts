import { z } from "zod";

export const DatasetSchema = z.object({
    id: z.uuid(),
    // Use with DATASET_COLLECTION_PREFIX to get the name of underlying collection to store data. e.g. `${DATASET_COLLECTION_PREFIX}${name}`
    name: z.string().min(1, "Name must not be empty").regex(/^[a-zA-Z0-9-]+$/, "Name must only contain letters, numbers, and hyphens (no spaces)"),
    description: z.string().optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
export type Dataset = z.infer<typeof DatasetSchema>;