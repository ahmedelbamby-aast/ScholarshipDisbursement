# Diagram Title
Frontend Hierarchy from admin-dashboard.js

## Diagram Type
Frontend Component Hierarchy (Script/DOM)

## Scope
DOM sections and API interactions orchestrated by admin dashboard script.

## Verification Summary
Based on direct `getElementById`, fetch calls, and event listeners.

## Evidence Sources
- frontend/js/admin-dashboard.js:3-31
- frontend/js/admin-dashboard.js:202-434
- frontend/admin.html (IDs consumed by script)

## Mermaid Diagram
```mermaid
flowchart TD
  AdminPage[frontend/admin.html]
  Script[frontend/js/admin-dashboard.js]
  Utils[frontend/js/common.js]
  Api[backend API]

  AdminPage --> Script
  Script --> Utils

  Script -->|GET /api/users/students| Api
  Script -->|PATCH /api/users/students/:id/verify| Api
  Script -->|POST /api/scholarships/approve| Api
  Script -->|POST /api/scholarships/release| Api
  Script -->|GET /api/audits/history| Api
  Script -->|PATCH /api/audits/:type/:id| Api
  Script -->|GET /api/audits/funds-movement| Api
  Script -->|GET /api/chain/telemetry| Api
  Script -->|GET /api/exports/transactions.csv| Api
  Script -->|GET /api/exports/transactions.xlsx| Api
  Script -->|GET /api/exports/transactions.pdf| Api
```

## Confidence Level
High

## Unverified/Missing Areas
- No framework component tree (React/Vue) exists.

## Sequence Diagram
```mermaid
sequenceDiagram
  participant Reader
  participant Document
  Reader->>Document: Open and read
  Document-->>Reader: Render documented content
```
