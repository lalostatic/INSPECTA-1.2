-- Monthly subscription per patio. Status is computed from dates (no cron).
alter table organizations add column if not exists period_start date;
alter table organizations add column if not exists period_end date;
alter table organizations add column if not exists last_paid_at timestamptz;
alter table organizations add column if not exists monthly_amount_centavos integer not null default 199000;
alter table organizations add column if not exists billing_currency text not null default 'MXN';

create table if not exists org_payments (
  id                   text primary key,
  org_id               text not null references organizations(id) on delete cascade,
  kind                 text not null,
  amount_centavos      integer not null,
  currency             text not null default 'MXN',
  last4                text not null default '',
  brand                text not null default '',
  period_end_after     date,
  created_by           text not null,
  created_at           timestamptz not null default now()
);
create index if not exists org_payments_org_idx on org_payments (org_id, created_at desc);
