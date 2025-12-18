import { z } from "zod";
import { paginationSchema } from "./pagination";

const thresholdSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  return undefined;
}, z.number().positive());

const analysisBaseSchema = paginationSchema.extend({
  vendor: z.string().optional(),
  competitorVendor: z.string().optional(),
  threshold: thresholdSchema.optional(),
});

export const overpricedQuerySchema = analysisBaseSchema;
export const patternsQuerySchema = analysisBaseSchema;

