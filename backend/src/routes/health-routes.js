/**
 * Health/readiness route.
 *
 * Responsibilities:
 * - Exposes lightweight liveness signal for orchestrators and operators.
 * - Returns static backend service identity payload.
 *
 * Note:
 * - This endpoint does not probe downstream dependencies (DB/RPC).
 */
import { Router } from "express";

const healthRouter = Router();

healthRouter.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "scholarship-backend" });
});

export default healthRouter;
