create table if not exists scholarship_approvals (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  student_address text not null,
  amount_wei text not null,
  installments integer not null,
  claim_window_seconds integer not null,
  tx_hash text not null,
  audit_status text not null default 'recorded',
  audit_note text not null default ''
);

create table if not exists scholarship_releases (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  student_address text not null,
  installment_number integer not null,
  tx_hash text not null,
  audit_status text not null default 'recorded',
  audit_note text not null default ''
);

alter table scholarship_approvals
  add column if not exists audit_status text not null default 'recorded';
alter table scholarship_approvals
  add column if not exists audit_note text not null default '';

alter table scholarship_releases
  add column if not exists audit_status text not null default 'recorded';
alter table scholarship_releases
  add column if not exists audit_note text not null default '';

create index if not exists idx_scholarship_approvals_student_address
  on scholarship_approvals (student_address);

create index if not exists idx_scholarship_approvals_created_at
  on scholarship_approvals (created_at desc);

create unique index if not exists uq_scholarship_approvals_tx_hash
  on scholarship_approvals (tx_hash);

create index if not exists idx_scholarship_releases_student_address
  on scholarship_releases (student_address);

create index if not exists idx_scholarship_releases_created_at
  on scholarship_releases (created_at desc);

create unique index if not exists uq_scholarship_releases_tx_hash
  on scholarship_releases (tx_hash);

create table if not exists app_users (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin','student','auditor')),
  wallet_address text,
  is_verified boolean not null default false,
  verified_at timestamp with time zone
);

create table if not exists app_sessions (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  user_id bigint not null references app_users(id) on delete cascade,
  session_token text not null unique,
  expires_at timestamp with time zone not null
);

create table if not exists app_wallet_nonces (
  wallet_address text primary key,
  nonce text not null,
  expires_at timestamp with time zone not null
);

insert into app_users (full_name, email, password_hash, role, is_verified)
values ('Initial Admin', 'admin@scholar.local', 'plain:admin123', 'admin', true)
on conflict (email) do nothing;
