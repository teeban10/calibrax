import { Router } from "express";
import { patternsQuerySchema } from "../validation/analysis";
import { getPricingPatterns } from "../services/analysisService";

const router = Router();

const DEFAULT_THRESHOLD = 1.1;

router.get("/", async (req, res, next) => {
  try {
    const parsed = patternsQuerySchema.parse(req.query);
    const threshold = parsed.threshold ?? DEFAULT_THRESHOLD;
    const vendor = parsed.vendor?.trim() || undefined;
    const competitorVendor = parsed.competitorVendor?.trim() || undefined;
    const confidenceScope = parsed.confidenceScope || undefined;

    const result = await getPricingPatterns({
      threshold,
      vendor,
      competitorVendor,
      confidenceScope,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

