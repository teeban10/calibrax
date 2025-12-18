import { Router } from "express";
import path from "path";
import { ingestCsvBodySchema } from "../validation/ingest";
import { ingestCsv } from "../services/ingestService";

const router = Router();

// Default filename - only this is visible in code
const DEFAULT_CSV_FILE = "pricing_data.csv";

// Resolve path relative to backend root directory
// process.cwd() should be the backend directory when running the server
const getDefaultFilePath = () => {
  return path.join(process.cwd(), DEFAULT_CSV_FILE);
};

router.post("/", async (req, res, next) => {
  try {
    const parsed = ingestCsvBodySchema.parse(req.body);
    
    // Use provided filePath or default to pricing_data.csv in backend root
    const filePath = parsed.filePath || getDefaultFilePath();
    
    const summary = await ingestCsv(filePath);
    res.status(202).json({ data: summary });
  } catch (error) {
    next(error);
  }
});

export default router;

