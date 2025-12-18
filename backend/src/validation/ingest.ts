import { z } from "zod";

export const ingestCsvBodySchema = z.object({
  filePath: z.string().trim().min(1).optional(),
});

