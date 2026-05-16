# Diagram Title
API Interaction from scholarship-routes.js

## Diagram Type
API Interaction Diagram

## Scope
All scholarship/audit/telemetry/export routes and middleware guards.

## Verification Summary
All nodes and edges are from route handlers, requireSession, and requireRole usage.

## Evidence Sources
- backend/src/routes/scholarship-routes.js:20-131
- backend/src/middleware/auth-session.js:15-47
- backend/src/middleware/role-auth.js:16-25
- backend/src/services/scholarship-service.js:16-79
- backend/src/services/export-service.js:6-100

## Mermaid Diagram
```mermaid
flowchart TD
  Client[Client Request] --> Sess[requireSession]
  Sess --> Role[requireRole]

  Role --> Approve[POST /api/scholarships/approve]
  Role --> Release[POST /api/scholarships/release]
  Role --> Approved[GET /api/scholarships/approved]
  Role --> Hist[GET /api/audits/history]
  Role --> Edit[PATCH /api/audits/:type/:id]
  Role --> Funds[GET /api/audits/funds-movement]
  Role --> Telemetry[GET /api/chain/telemetry]
  Role --> Csv[GET /api/exports/transactions.csv]
  Role --> Xlsx[GET /api/exports/transactions.xlsx]
  Role --> Pdf[GET /api/exports/transactions.pdf]

  Approve --> ScholarshipService[approveScholarship]
  Release --> ScholarshipService
  Approved --> ScholarshipService
  Hist --> ScholarshipService
  Edit --> ScholarshipService
  Funds --> ScholarshipService
  Telemetry --> ScholarshipService

  Csv --> ExportService[exportCsv]
  Xlsx --> ExportService[exportXlsx]
  Pdf --> ExportService[exportPdf]
```

## Confidence Level
High

## Unverified/Missing Areas
- No queue/event-bus handlers in this route file.
