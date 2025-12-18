import { Router } from "express";
import {
  competitorProductsQuerySchema,
  normalizePagination,
} from "../validation/pagination";
import { listCompetitorProducts } from "../services/productsService";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const parsed = competitorProductsQuerySchema.parse(req.query);
    const pagination = normalizePagination(parsed);
    const competitorVendor =
      parsed.competitorVendor?.trim() || undefined;

    const result = await listCompetitorProducts({
      ...pagination,
      competitorVendor,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

