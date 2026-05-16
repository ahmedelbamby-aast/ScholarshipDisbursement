# Diagram Title
Security Flow from auth-session.js

## Diagram Type
Security Flow Diagram

## Scope
Authentication extraction and role authorization pipeline.

## Verification Summary
Covers bearer session lookup path and legacy x-user-role path.

## Evidence Sources
- backend/src/middleware/auth-session.js:15-47
- backend/src/middleware/role-auth.js:16-25
- backend/src/routes/scholarship-routes.js:21-24,63-64,94-95

## Mermaid Diagram
```mermaid
flowchart LR
  Req[Request] --> Sess[requireSession]
  Sess -->|authorization bearer| SessionLookup[getSessionByToken]
  Sess -->|x-user-role header| LegacyRole[legacy authUser role]
  SessionLookup --> RoleCheck[requireRole]
  LegacyRole --> RoleCheck
  RoleCheck --> RouteHandler[Protected handler]
  RouteHandler -->|admin only| EditExport[Audit edit + exports]
  RouteHandler -->|role-based read| ReadAPIs[audits/telemetry/approved]
```

## Confidence Level
High

## Unverified/Missing Areas
- JWT generation/verification is not implemented.

## Sequence Diagram
```mermaid
sequenceDiagram
  participant Reader
  participant Document
  Reader->>Document: Open and read
  Document-->>Reader: Render documented content
```
