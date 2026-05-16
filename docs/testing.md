# Testing Architecture (Verified)

## Overview
Testing is implemented through npm scripts with layered scopes: unit, integration, system, backend, frontend, security, DB behavior, fullstack API.

## Responsibilities
- Unit/integration/system: contract behavior and workflow correctness.
- Backend/frontend: API and page structure behavior.
- Security: authorization boundary assertions.
- DB behavior: parser/input constraints tied to DB usage.
- Fullstack API: runtime/auth surface checks.

## Test Execution Graph
```mermaid
flowchart TD
  TestAll[test:all] --> Unit[test:unit]
  TestAll --> Integration[test:integration]
  TestAll --> Backend[test:backend]
  TestAll --> Frontend[test:frontend]
  TestAll --> System[test:system]

  Unit --> Approval[test:feature:approval]
  Unit --> Release[test:feature:release]
  Unit --> Claim[test:feature:claim]
  Unit --> Audit[test:feature:audit]
  Unit --> Recovery[test:feature:recovery]

  Extra[test:security/test:db/test:fullstack] --> Parallel[mocha --parallel --jobs 2]
```

### Diagram Explanation
- `test:all` orchestrates baseline quality gates.
- Security/DB/fullstack suites are additional targeted checks.
- Several suites run with Mocha parallel worker mode.

## Runtime Coverage
```mermaid
flowchart LR
  ContractTests[test/unit + integration + system] --> Hardhat[Hardhat runtime]
  ApiTests[test/backend + fullstack + security] --> Express[Express app]
  FrontTests[test/frontend] --> HtmlJs[Frontend files]
  DbBehavior[test/db] --> Validators[backend validators]
```

### Diagram Explanation
- Contract suites execute through hardhat wrapper command.
- Backend tests instantiate app and hit route handlers.
- Frontend tests assert static page structure content.

## External Dependencies
- Mocha/Chai/Supertest
- Hardhat wrapper script

## Failure/Error Flow
- DB unavailable path is asserted in backend tests as deterministic `503`.
- Authorization boundary denials are asserted in security tests.

## Security Considerations
- Explicit tests for non-admin export denial and protected API auth requirement.

## Scalability Considerations
- Parallel jobs configured for selected suites.

## Performance Considerations
- Parallel mode reduces latency for independent mocha groups.

## CI/CD Pipeline Diagram
**UNVERIFIED**: no CI pipeline config files detected in repository scan.

## Code References
- `package.json` scripts section
- `test/unit/*`
- `test/integration/workflow.integration.test.js`
- `test/system/system-wide.e2e.test.js`
- `test/backend/api.test.js`
- `test/frontend/pages.test.js`
- `test/security/authorization.security.test.js`
- `test/db/db.behavior.test.js`
- `test/fullstack/fullstack.api.test.js`

## Sequence Diagram
```mermaid
sequenceDiagram
  participant Reader
  participant Document
  Reader->>Document: Open and read
  Document-->>Reader: Render documented content
```
