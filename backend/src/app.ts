import express, { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import productsRouter from "./routes/products";
import competitorsRouter from "./routes/competitors";
import analysisOverpricedRouter from "./routes/analysisOverpriced";
import analysisPatternsRouter from "./routes/analysisPatterns";
import ingestCsvRouter from "./routes/ingestCsv";
import healthRouter from "./routes/health";

const app = express();

app.use(express.json());

app.use("/api/products", productsRouter);
app.use("/api/competitors/products", competitorsRouter);
app.use("/api/analysis/overpriced", analysisOverpricedRouter);
app.use("/api/analysis/patterns", analysisPatternsRouter);
app.use("/api/ingest/csv", ingestCsvRouter);
app.use("/api/health", healthRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Not found" });
});

app.use(
  (
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: err,
      });
    }

    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  },
);

export default app;

