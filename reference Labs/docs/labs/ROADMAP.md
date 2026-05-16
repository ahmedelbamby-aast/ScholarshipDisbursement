# Remaining Labs Roadmap

## Planned sequence

1. Lab 2: local Ethereum accounts and transactions.
2. Lab 3: deploy and use a classroom voting smart contract.
3. Lab 4: build the certificate registry contract and compare proof mechanisms.
4. Lab 5: add access control, security checks, and tests.
5. Lab 6: mini-project demos and presentations.

Each lab should reuse the same structure:

- concept repair
- live demo
- your reproduction
- one required modification
- short reflection

## Sequence Diagram
```mermaid
sequenceDiagram
  participant FE as Frontend
  participant API as Express API
  participant MW as Session+RBAC Middleware
  participant SVC as Service Layer
  participant DB as PostgreSQL
  participant CH as Smart Contract
  FE->>API: HTTP request
  API->>MW: requireSession/requireRole (protected routes)
  MW->>SVC: validated authorized request
  alt DB-backed flow
    SVC->>DB: query/insert/update
    DB-->>SVC: rows/result
  else Chain-backed flow
    SVC->>CH: call/send transaction
    CH-->>SVC: read result / tx receipt
  end
  SVC-->>API: response payload
  API-->>FE: JSON/file response
```
