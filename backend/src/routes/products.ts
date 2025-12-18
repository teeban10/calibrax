import { Router } from "express";
import { productsQuerySchema, normalizePagination } from "../validation/pagination";
import { listProducts } from "../services/productsService";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const parsed = productsQuerySchema.parse(req.query);
    const pagination = normalizePagination(parsed);
    const vendor = parsed.vendor?.trim() || undefined;
    const search = parsed.search?.trim() || undefined;

    const result = await listProducts({
      ...pagination,
      vendor,
      search,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

