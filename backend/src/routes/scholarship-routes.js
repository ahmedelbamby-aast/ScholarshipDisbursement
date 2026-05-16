import { Router } from "express";
import { AppError } from "../errors.js";
import { parseApprovalPayload, parseReleasePayload } from "../validators/scholarships.js";
import {
  approveScholarship,
  editAuditEntry,
  getChainTelemetry,
  getFundsMovement,
  getApprovedStudents,
  listAuditHistory,
  releaseInstallment,
} from "../services/scholarship-service.js";
import config from "../config.js";
import { parseAuditHistoryQuery, parseFundsMovementQuery, parseTelemetryQuery } from "../validators/pagination.js";
import { parseAuditUpdateParams, parseAuditUpdatePayload } from "../validators/audits.js";
import { ROLES, requireRole } from "../middleware/role-auth.js";
import { exportCsv, exportPdf, exportXlsx } from "../services/export-service.js";

const scholarshipRouter = Router();

scholarshipRouter.post("/api/scholarships/approve", requireRole([ROLES.ADMIN]), async (req, res, next) => {
  try {
    const payload = parseApprovalPayload(req.body);
    const result = await approveScholarship(payload, config.txTimeoutMs);
    return res.status(201).json({ ok: true, txHash: result.txHash });
  } catch (error) {
    // Normalize all non-AppError throws to keep response schema deterministic.
    return next(normalizeRouteError(error, "Approval failed"));
  }
});

scholarshipRouter.post("/api/scholarships/release", requireRole([ROLES.ADMIN]), async (req, res, next) => {
  try {
    const payload = parseReleasePayload(req.body);
    const result = await releaseInstallment(payload, config.txTimeoutMs);
    return res.status(200).json({ ok: true, txHash: result.txHash });
  } catch (error) {
    return next(normalizeRouteError(error, "Release failed"));
  }
});

scholarshipRouter.get("/api/scholarships/approved", requireRole([ROLES.ADMIN, ROLES.AUDITOR, ROLES.STUDENT]), async (_req, res, next) => {
  try {
    const students = await getApprovedStudents();
    return res.status(200).json({ ok: true, students });
  } catch (error) {
    return next(normalizeRouteError(error, "Read failed"));
  }
});

scholarshipRouter.get("/api/audits/history", requireRole([ROLES.ADMIN, ROLES.AUDITOR, ROLES.STUDENT]), async (req, res, next) => {
  try {
    const query = parseAuditHistoryQuery(req.query);
    const history = await listAuditHistory(query);
    return res.status(200).json({ ok: true, ...history });
  } catch (error) {
    return next(normalizeRouteError(error, "Audit history read failed"));
  }
});

scholarshipRouter.patch("/api/audits/:type/:id", requireRole([ROLES.ADMIN]), async (req, res, next) => {
  try {
    const { type, id } = parseAuditUpdateParams(req.params);
    const payload = parseAuditUpdatePayload(req.body);
    const updated = await editAuditEntry(type, id, payload);
    return res.status(200).json({ ok: true, entry: updated });
  } catch (error) {
    return next(normalizeRouteError(error, "Audit update failed"));
  }
});

scholarshipRouter.get("/api/audits/funds-movement", requireRole([ROLES.ADMIN, ROLES.AUDITOR, ROLES.STUDENT]), async (req, res, next) => {
  try {
    const { days } = parseFundsMovementQuery(req.query);
    const movement = await getFundsMovement(days);
    return res.status(200).json({ ok: true, ...movement });
  } catch (error) {
    return next(normalizeRouteError(error, "Funds movement read failed"));
  }
});

scholarshipRouter.get("/api/chain/telemetry", requireRole([ROLES.ADMIN, ROLES.AUDITOR, ROLES.STUDENT]), async (req, res, next) => {
  try {
    const { blocks } = parseTelemetryQuery(req.query);
    const telemetry = await getChainTelemetry(blocks);
    return res.status(200).json({ ok: true, ...telemetry });
  } catch (error) {
    return next(normalizeRouteError(error, "Chain telemetry read failed"));
  }
});

scholarshipRouter.get("/api/exports/transactions.csv", requireRole([ROLES.ADMIN]), async (req, res, next) => {
  try {
    const { blocks } = parseTelemetryQuery(req.query);
    const buffer = await exportCsv(blocks);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"transactions-and-logs.csv\"");
    return res.status(200).send(buffer);
  } catch (error) {
    return next(normalizeRouteError(error, "CSV export failed"));
  }
});

scholarshipRouter.get("/api/exports/transactions.xlsx", requireRole([ROLES.ADMIN]), async (req, res, next) => {
  try {
    const { blocks } = parseTelemetryQuery(req.query);
    const buffer = await exportXlsx(blocks);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=\"transactions-and-logs.xlsx\"");
    return res.status(200).send(buffer);
  } catch (error) {
    return next(normalizeRouteError(error, "XLSX export failed"));
  }
});

scholarshipRouter.get("/api/exports/transactions.pdf", requireRole([ROLES.ADMIN]), async (req, res, next) => {
  try {
    const { blocks } = parseTelemetryQuery(req.query);
    const buffer = await exportPdf(blocks);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=\"transactions-and-logs.pdf\"");
    return res.status(200).send(buffer);
  } catch (error) {
    return next(normalizeRouteError(error, "PDF export failed"));
  }
});

function normalizeRouteError(error, fallbackMessage) {
  if (error?.statusCode) {
    return error;
  }
  // Unknown failures are treated as 500 with safe fallback message.
  return new AppError(error?.message || fallbackMessage, 500);
}

export default scholarshipRouter;
