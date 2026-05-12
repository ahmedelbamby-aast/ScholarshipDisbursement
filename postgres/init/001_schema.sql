create table if not exists scholarship_approvals (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  student_address text not null,
  amount_wei text not null,
  installments integer not null,
  claim_window_seconds integer not null,
  tx_hash text not null
);

create table if not exists scholarship_releases (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  student_address text not null,
  installment_number integer not null,
  tx_hash text not null
);

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
