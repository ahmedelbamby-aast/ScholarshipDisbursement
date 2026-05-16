import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { getChainTelemetry } from "./contract-service.js";
import { getAuditRowsForExport } from "../repositories/audit-repository.js";

async function buildExportRows(blocks) {
  const [telemetry, auditRows] = await Promise.all([
    getChainTelemetry(blocks),
    getAuditRowsForExport(5000),
  ]);

  const chainRows = (telemetry.recentEvents || []).map((item) => ({
    source: "chain",
    type: item.type,
    blockNumber: item.blockNumber,
    txHash: item.txHash,
    amountWei: item.amountWei,
    studentAddress: "",
    auditStatus: "",
    auditNote: "",
    createdAt: "",
  }));

  const dbRows = (auditRows || []).map((item) => ({
    source: "audit_db",
    type: item.type,
    blockNumber: "",
    txHash: item.tx_hash || "",
    amountWei: "",
    studentAddress: item.student_address || "",
    auditStatus: item.audit_status || "",
    auditNote: item.audit_note || "",
    createdAt: item.created_at ? new Date(item.created_at).toISOString() : "",
  }));

  return [...chainRows, ...dbRows];
}

async function exportCsv(blocks) {
  const rows = await buildExportRows(blocks);
  const headers = [
    "source",
    "type",
    "blockNumber",
    "txHash",
    "amountWei",
    "studentAddress",
    "auditStatus",
    "auditNote",
    "createdAt",
  ];

  const csvLines = [headers.join(",")].concat(
    rows.map((row) =>
      headers
        .map((key) => `"${String(row[key] ?? "").replace(/"/g, "\"\"")}"`)
        .join(",")
    )
  );
  return Buffer.from(csvLines.join("\n"), "utf8");
}

async function exportXlsx(blocks) {
  const rows = await buildExportRows(blocks);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "TransactionsAndLogs");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

async function exportPdf(blocks) {
  const rows = await buildExportRows(blocks);
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(14).text("Scholarship Blockchain Transactions and Logs Export");
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();

    rows.slice(0, 250).forEach((row, index) => {
      doc
        .fontSize(9)
        .text(
          `${index + 1}. [${row.source}] ${row.type} tx=${row.txHash || "-"} block=${row.blockNumber || "-"} student=${row.studentAddress || "-"} status=${row.auditStatus || "-"}`
        );
      if (doc.y > 760) {
        doc.addPage();
      }
    });

    doc.end();
  });
}

export { exportCsv, exportXlsx, exportPdf };
