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
