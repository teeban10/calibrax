import { Router } from "express";
import { ingestCsvBodySchema } from "../validation/ingest";
import { ingestCsv } from "../services/ingestService";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    // const parsed = ingestCsvBodySchema.parse(req.body);
    const summary = await ingestCsv("/Users/teebankumar/Documents/calibrax/backend/src/routes/pricing_data.csv");
    res.status(202).json({ data: summary });
  } catch (error) {
    next(error);
  }
});

export default router;

