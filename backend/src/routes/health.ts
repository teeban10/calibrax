import { Router } from "express";
import { dbPool } from "../db/client";

const router = Router();

type HealthResponse = {
  status: "ok";
  db: "up" | "down";
};

router.get("/", async (req, res) => {
  try {
    await dbPool.query("SELECT 1");
    const response: HealthResponse = { status: "ok", db: "up" };
    res.json(response);
  } catch (error) {
    const response: HealthResponse = { status: "ok", db: "down" };
    res.status(503).json(response);
  }
});

export default router;

