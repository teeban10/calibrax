import { Router } from "express";
import { normalizePagination } from "../validation/pagination";
import { overpricedQuerySchema } from "../validation/analysis";
import { getOverpricedMatches, getOverpricedMatchesV2 } from "../services/analysisService";

const router = Router();

const DEFAULT_THRESHOLD = 1.1;

router.get("/", async (req, res, next) => {
  try {
    const parsed = overpricedQuerySchema.parse(req.query);
    const pagination = normalizePagination(parsed);
    const threshold = parsed.threshold ?? DEFAULT_THRESHOLD;
    const vendor = parsed.vendor?.trim() || undefined;
    const competitorVendor = parsed.competitorVendor?.trim() || undefined;
    // if (!vendor || !competitorVendor) {
    //   return res.status(400).json({ error: "Vendor or competitor vendor is required" });
    // }
    const result = await getOverpricedMatchesV2({
      ...pagination,
      threshold,
      vendor,
      competitorVendor,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

