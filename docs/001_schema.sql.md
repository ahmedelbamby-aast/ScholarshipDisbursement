# Diagram Title
Database ER from 001_schema.sql

## Diagram Type
Database ER Diagram

## Scope
PostgreSQL tables, keys, and explicit FK constraints from initialization SQL.

## Verification Summary
Only SQL-defined entities/constraints included.

## Evidence Sources
- postgres/init/001_schema.sql:1-79

## Mermaid Diagram
```mermaid
erDiagram
  scholarship_approvals {
    bigint id PK
    timestamptz created_at
    text student_address
    text amount_wei
    int installments
    int claim_window_seconds
    text tx_hash
    text audit_status
    text audit_note
  }

  scholarship_releases {
    bigint id PK
    timestamptz created_at
    text student_address
    int installment_number
    text tx_hash
    text audit_status
    text audit_note
  }

  app_users {
    bigint id PK
    timestamptz created_at
    text full_name
    text email
    text password_hash
    text role
    text wallet_address
    bool is_verified
    timestamptz verified_at
  }

  app_sessions {
    bigint id PK
    timestamptz created_at
    bigint user_id FK
    text session_token
    timestamptz expires_at
  }

  app_wallet_nonces {
    text wallet_address PK
    text nonce
    timestamptz expires_at
  }

  app_users ||--o{ app_sessions : user_id
```

## Confidence Level
High

## Unverified/Missing Areas
- No FK from app_wallet_nonces.wallet_address to app_users.wallet_address is defined.

## Sequence Diagram
```mermaid
sequenceDiagram
  participant Reader
  participant Document
  Reader->>Document: Open and read
  Document-->>Reader: Render documented content
```
