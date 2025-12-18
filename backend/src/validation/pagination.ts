import { z } from "zod";

const positiveIntSchema = z.preprocess((value) => {
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
}, z.number().int().positive());

export const paginationSchema = z.object({
  page: positiveIntSchema.optional().default(1),
  limit: positiveIntSchema.optional().default(20),
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const normalizePagination = (input: z.infer<typeof paginationSchema>) => ({
  page: input.page ?? 1,
  limit: clamp(input.limit ?? 20, 1, 100),
});

export const productsQuerySchema = paginationSchema.extend({
  vendor: z.string().optional(),
  search: z.string().optional(),
});

export const competitorProductsQuerySchema = paginationSchema.extend({
  competitorVendor: z.string().optional(),
});

