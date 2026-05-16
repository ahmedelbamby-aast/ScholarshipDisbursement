import { ValidationError } from "../errors.js";

function parsePositiveIntOrDefault(raw, defaultValue) {
  if (raw === undefined || raw === null || raw === "") {
    return defaultValue;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError("Page and page size must be positive integers");
  }
  return parsed;
}

function parseAuditHistoryQuery(query) {
  const page = parsePositiveIntOrDefault(query.page, 1);
  const pageSize = parsePositiveIntOrDefault(query.pageSize, 10);
  // Cap protects DB/query cost even if clients request very large pages.
  const cappedPageSize = Math.min(pageSize, 50);
  const studentAddress = typeof query.studentAddress === "string" ? query.studentAddress.trim() : "";

  return {
    page,
    pageSize: cappedPageSize,
    studentAddress,
  };
}

function parseFundsMovementQuery(query) {
  const days = parsePositiveIntOrDefault(query.days, 14);
  return {
    days: Math.min(days, 90),
  };
}

function parseTelemetryQuery(query) {
  const blocks = parsePositiveIntOrDefault(query.blocks, 500);
  return {
    blocks: Math.min(blocks, 10000),
  };
}

export { parseAuditHistoryQuery, parseFundsMovementQuery, parseTelemetryQuery };
