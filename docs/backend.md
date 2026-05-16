# Backend Architecture (Verified)

## Overview
Backend is an Express API exposing auth/user routes and scholarship/audit/export routes.

## Responsibilities
- Parse/validate requests.
- Enforce authentication and RBAC.
- Execute chain transactions for admin actions.
- Persist and query audit/user/session data in PostgreSQL.
- Provide telemetry and file exports.

## Internal Interactions
```mermaid
flowchart TD
  App[app.js] --> Health[health-routes.js]
  App --> Auth[auth-routes.js]
  App --> Scholarship[scholarship-routes.js]

  Scholarship --> Sess[requireSession]
  Scholarship --> Role[requireRole]
  Scholarship --> Svc[scholarship-service.js]
  Scholarship --> ExportSvc[export-service.js]

  Auth --> AuthSvc[auth-service.js]
  AuthSvc --> UserRepo[user-repository.js]

  Svc --> ContractSvc[contract-service.js]
  Svc --> AuditRepo[audit-repository.js]

  ContractSvc --> ContractAdapter[contract.js]
  AuditRepo --> Pg[postgres.js]
  UserRepo --> Pg
```

### Diagram Explanation
- Route handlers call service functions; services call repositories/contract adapter.
- `scholarshipRouter.use(requireSession)` applies auth before route-specific role checks.
- Export routes call export-service directly.
- Inputs: HTTP requests and params.
- Outputs: JSON or binary export responses.
- Error handling path converges through `errorHandler` middleware.

## Request Lifecycle
```mermaid
sequenceDiagram
  participant C as Client
  participant A as app.js
  participant S as requireSession
  participant R as requireRole
  participant H as Route Handler
  participant V as Validator
  participant SV as Service
  participant RP as Repository/Chain

  C->>A: HTTP request
  A->>S: requireSession (protected routers)
  S->>R: requireRole
  R->>H: enter handler
  H->>V: parse/validate payload
  V-->>H: normalized input
  H->>SV: business call
  SV->>RP: chain/db operations
  RP-->>SV: result
  SV-->>H: response payload
  H-->>C: HTTP response
```

### Diagram Explanation
- This sequence is implemented in `scholarship-routes.js` and validators/services modules.
- If any stage throws, `normalizeRouteError` and `errorHandler` return error JSON.

## External Dependencies
- `ethers` for chain provider/wallet/contract calls.
- `pg` for DB pool and queries.
- `pdfkit` and `xlsx` for export generation.

## Data Flow
- Approval/release: request -> chain tx -> tx hash -> audit insert.
- Audit history: query two audit tables -> merge by created_at in frontend.
- Session auth: Bearer token -> session lookup join with users.

## Failure/Error Flow
- Missing token and no legacy role header -> `Authentication required`.
- Expired/nonexistent session -> `Invalid or expired session`.
- DB unconfigured -> `PostgreSQL not configured` (`503`).
- Contract not configured -> dependency unavailable (`503`).

## Security Considerations
- RBAC roles: `admin`, `auditor`, `student`.
- Admin-only endpoints: approve/release/audit edit/export/student verify.
- Legacy `x-user-role` shortcut exists in `requireSession` for compatibility.

## Scalability Considerations
- Pagination cap in audit history query parser (`max 50`).
- Telemetry and movement lookback bounded by query parameter caps.

## Performance Considerations
- Contract transaction waits are timeout guarded.
- Uses cached contract client and pooled DB connections.

## Code References
- `backend/src/app.js`
- `backend/src/routes/auth-routes.js`
- `backend/src/routes/scholarship-routes.js`
- `backend/src/services/*.js`
- `backend/src/repositories/*.js`
- `backend/src/middleware/*.js`

## How this feature implemented ?

### 1. Feature Overview
Backend feature is implemented as an Express application in `backend/src/app.js` that mounts `healthRouter`, `authRouter`, and `scholarshipRouter`. Purpose: enforce authentication/RBAC, run admin blockchain actions, and persist off-chain audit/auth records.
Core files: `backend/src/app.js`, `backend/src/routes/*.js`, `backend/src/services/*.js`, `backend/src/repositories/*.js`, `backend/src/middleware/*.js`.

### 2. Entry Points
```mermaid
flowchart TD
  Http[HTTP Request] --> App[backend/src/app.js]
  App --> Health[/GET /api/health/]
  App --> Auth[/api/auth/* and /api/users*/]
  App --> Scholar[/api/scholarships/* /api/audits/* /api/exports/* /api/chain/*/]
```
#### Diagram Explanation
Represents real route registration in `app.js`. Inputs are HTTP requests. Outputs are JSON/binary responses. Failure path goes to `errorHandler` in `backend/src/middleware/error-handler.js`.

```mermaid
sequenceDiagram
  participant UI as Frontend
  participant APP as app.js
  participant SES as requireSession
  participant RBAC as requireRole
  participant RH as Route Handler
  UI->>APP: Request protected endpoint
  APP->>SES: Validate Bearer token
  SES->>RBAC: Check role
  RBAC->>RH: Continue
  RH-->>UI: JSON response
```
#### Diagram Explanation
Execution order is middleware-first then handler. Missing/expired session stops at `requireSession`. Unauthorized role stops at `requireRole`.

### 3. Internal Execution Flow
```mermaid
flowchart LR
  Route[scholarship-routes.js] --> Validate[validators/*]
  Validate --> Service[scholarship-service.js]
  Service --> Chain[contract-service.js]
  Service --> AuditRepo[audit-repository.js]
  Chain --> RPC[EVM RPC]
  AuditRepo --> PG[PostgreSQL]
```
#### Diagram Explanation
For approve/release, payload is parsed, chain tx executes first, then DB audit write occurs (`saveApprovalAudit`/`saveReleaseAudit`). If chain fails, no audit row is saved.

```mermaid
stateDiagram-v2
  [*] --> Received
  Received --> Validated
  Validated --> Authorized
  Authorized --> Executed
  Executed --> Responded
  Received --> Failed
  Validated --> Failed
  Authorized --> Failed
  Executed --> Failed
```
#### Diagram Explanation
State transitions model request lifecycle implemented by middleware + handlers. Failure can happen at parse, auth, RBAC, chain call, or DB call.

### 4. Architecture & Component Relationships
```mermaid
classDiagram
  class app_js
  class auth_routes
  class scholarship_routes
  class auth_service
  class scholarship_service
  class user_repository
  class audit_repository
  class contract_service
  app_js --> auth_routes
  app_js --> scholarship_routes
  auth_routes --> auth_service
  scholarship_routes --> scholarship_service
  scholarship_routes --> contract_service
  auth_service --> user_repository
  scholarship_service --> audit_repository
  scholarship_service --> contract_service
```
#### Diagram Explanation
This mirrors imports/calls in route/service files. Coupling: routes depend on service APIs; services depend on repositories and chain adapter.

### 5. Data Flow
```mermaid
erDiagram
  app_users ||--o{ app_sessions : owns
  scholarship_approvals {
    bigint id
    text tx_hash
  }
  scholarship_releases {
    bigint id
    text tx_hash
  }
```
#### Diagram Explanation
Auth data persists in `app_users/app_sessions`. Blockchain actions persist transaction hashes into audit tables.

### 6. Feature Lifecycle
Initialization in `app.js`: middleware -> routers -> error handler. Runtime handles per-request pipeline. Completion returns JSON or files. Cleanup is process-level only; no per-request custom shutdown logic found.

### 7. Interactions With Other Features/Services
Depends on frontend API callers, PostgreSQL (`postgres.js`), and contract adapter (`contract.js`). Exports combine telemetry from chain and DB audit rows in `export-service.js`.

### 8. Use Cases
Primary: admin approve/release; student/auditor/admin read audits/telemetry; admin export and verify users. Secondary: MetaMask nonce auth for students.

### 9. Edge Cases
Invalid payloads -> validator errors (`400`), expired sessions -> auth error, non-admin on admin endpoints -> forbidden, unavailable DB/RPC -> dependency failures.

### 10. Error Handling & Recovery
`normalizeError`/`normalizeRouteError` convert unknown errors to controlled `AppError`. No queue retries or circuit breaker implementation found.

### 11. Security Considerations
Bearer-token session auth via `app_sessions`; RBAC through `requireRole`; note legacy fallback header in `requireSession` remains implemented for compatibility.

### 12. Performance & Scalability
Pagination caps in query validators; bounded telemetry windows; pooled DB connections via `pg` pool.

### 13. Pros / Cons / Tradeoffs
Pros: clear route-service-repo split, explicit RBAC, audit persistence after confirmed tx. Cons: legacy role header path increases trust surface; no background worker for heavy exports.

### 14. Known Blockers / Risks
No message queue/dead-letter pattern implemented; localStorage token model (frontend) increases session theft risk if XSS happens.

```mermaid
gitGraph
  commit id:"init"
  branch auth
  checkout auth
  commit id:"sessions+rbac"
  checkout main
  merge auth
  branch telemetry
  checkout telemetry
  commit id:"funds+exports"
  checkout main
  merge telemetry
```
#### Diagram Explanation
Repository history concept for implemented features; exact commit IDs are not documented in current codebase.
