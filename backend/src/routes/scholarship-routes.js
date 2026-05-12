import { Router } from "express";
import { AppError } from "../errors.js";
import { parseApprovalPayload, parseReleasePayload } from "../validators/scholarships.js";
import {
  approveScholarship,
  getApprovedStudents,
  releaseInstallment,
} from "../services/scholarship-service.js";
import config from "../config.js";

const scholarshipRouter = Router();

scholarshipRouter.post("/api/scholarships/approve", async (req, res, next) => {
  try {
    const payload = parseApprovalPayload(req.body);
    const result = await approveScholarship(payload, config.txTimeoutMs);
    return res.status(201).json({ ok: true, txHash: result.txHash });
  } catch (error) {
    return next(normalizeRouteError(error, "Approval failed"));
  }
});

scholarshipRouter.post("/api/scholarships/release", async (req, res, next) => {
  try {
    const payload = parseReleasePayload(req.body);
    const result = await releaseInstallment(payload, config.txTimeoutMs);
    return res.status(200).json({ ok: true, txHash: result.txHash });
  } catch (error) {
    return next(normalizeRouteError(error, "Release failed"));
  }
});

scholarshipRouter.get("/api/scholarships/approved", async (_req, res, next) => {
  try {
    const students = await getApprovedStudents();
    return res.status(200).json({ ok: true, students });
  } catch (error) {
    return next(normalizeRouteError(error, "Read failed"));
  }
});

function normalizeRouteError(error, fallbackMessage) {
  if (error?.statusCode) {
    return error;
  }
  return new AppError(error?.message || fallbackMessage, 500);
}

export default scholarshipRouter;
