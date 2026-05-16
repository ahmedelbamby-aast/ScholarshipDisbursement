# Lab 2 Workspace

This lab focuses on local Ethereum accounts, balances, nonces, and native ETH transfers on the Hardhat node.

## Main guide

- [Lab 2 master guide](../../docs/lab2/Lab2.md)

## Components

- `api/`: Node API for account snapshots, latest block data, and transfers
- `frontend/`: static UI for balances, nonce changes, and transaction flow

## Quick start

```bash
docker compose up -d chain lab2-api lab2-frontend
```

Open:

- Frontend: `http://localhost:8081`
- API health: `http://localhost:3001/api/health`

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
