/**
 * Audit edit validators.
 *
 * Responsibilities:
 * - Validates route params (`type`, `id`) for audit update endpoint.
 * - Validates allowed status transitions and note length constraints.
 */
import { ValidationError } from "../errors.js";

const allowedTypes = new Set(["approval", "release"]);
const allowedStatuses = new Set(["recorded", "reviewed", "flagged"]);

function parseAuditUpdateParams(params) {
  const type = typeof params.type === "string" ? params.type.trim().toLowerCase() : "";
  const id = Number(params.id);

  if (!allowedTypes.has(type)) {
    throw new ValidationError("Audit type must be approval or release");
  }
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Audit id must be a positive integer");
  }

  return { type, id };
}

function parseAuditUpdatePayload(body) {
  const status = typeof body.auditStatus === "string" ? body.auditStatus.trim().toLowerCase() : "";
  const note = typeof body.auditNote === "string" ? body.auditNote.trim() : "";

  if (!allowedStatuses.has(status)) {
    throw new ValidationError("Audit status must be recorded, reviewed, or flagged");
  }
  if (note.length > 500) {
    throw new ValidationError("Audit note must be 500 characters or less");
  }

  return {
    auditStatus: status,
    auditNote: note,
  };
}

export { parseAuditUpdateParams, parseAuditUpdatePayload };
