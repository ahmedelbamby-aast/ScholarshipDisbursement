import { getPostgresPool } from "../postgres.js";
import { DependencyUnavailableError } from "../errors.js";

function getPoolOrThrow() {
  const pool = getPostgresPool();
  if (!pool) {
    // Deterministic dependency error is surfaced as 503 upstream.
    throw new DependencyUnavailableError("PostgreSQL not configured");
  }
  return pool;
}

async function insertIfClient(table, payload) {
  const pool = getPoolOrThrow();
  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  // Column names come from internal constants only; values remain parameterized.
  const statement = `insert into ${table} (${columns.join(", ")}) values (${placeholders})`;

  try {
    await pool.query(statement, values);
  } catch (_error) {
    throw new Error(`Audit write failed for ${table}`);
  }
}

async function saveApprovalAudit(payload) {
  await insertIfClient("scholarship_approvals", payload);
}

async function saveReleaseAudit(payload) {
  await insertIfClient("scholarship_releases", payload);
}

function buildAuditHistoryQuery({ table, studentAddress, from, pageSize }) {
  const filters = [];
  const params = [];

  if (studentAddress) {
    params.push(studentAddress);
    filters.push(`student_address = $${params.length}`);
  }

  params.push(pageSize);
  const limitRef = `$${params.length}`;
  params.push(from);
  const offsetRef = `$${params.length}`;

  const whereClause = filters.length ? `where ${filters.join(" and ")}` : "";
  // Ordering by created_at matches API contract for "recent activity" views.
  const rowsSql = `
    select *
    from ${table}
    ${whereClause}
    order by created_at desc
    limit ${limitRef}
    offset ${offsetRef}
  `;

  const countParams = params.slice(0, studentAddress ? 1 : 0);
  const countSql = `
    -- Count mirrors the same filter to keep pagination totals consistent.
    select count(*)::int as total
    from ${table}
    ${whereClause}
  `;

  return {
    rowsSql,
    rowsParams: params,
    countSql,
    countParams,
  };
}

async function queryAuditTable(table, studentAddress, from, pageSize) {
  const pool = getPoolOrThrow();
  const query = buildAuditHistoryQuery({ table, studentAddress, from, pageSize });

  try {
    const [rowsResult, countResult] = await Promise.all([
      pool.query(query.rowsSql, query.rowsParams),
      pool.query(query.countSql, query.countParams),
    ]);

    return {
      rows: rowsResult.rows || [],
      count: Number(countResult.rows?.[0]?.total || 0),
    };
  } catch (_error) {
    throw new Error(`Audit read failed for ${table}`);
  }
}

async function getAuditHistory({ page, pageSize, studentAddress }) {
  const from = (page - 1) * pageSize;
  const [approvals, releases] = await Promise.all([
    queryAuditTable("scholarship_approvals", studentAddress, from, pageSize),
    queryAuditTable("scholarship_releases", studentAddress, from, pageSize),
  ]);

  return {
    approvals: approvals.rows,
    releases: releases.rows,
    pagination: {
      page,
      pageSize,
      approvalsTotal: approvals.count,
      releasesTotal: releases.count,
    },
  };
}

export { saveApprovalAudit, saveReleaseAudit, getAuditHistory };
