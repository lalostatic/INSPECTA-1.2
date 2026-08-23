-- A patio only operates after the INSPECTA developer authorizes the company.
alter table organizations add column if not exists authorized boolean not null default false;
alter table organizations add column if not exists authorized_at timestamptz;
alter table organizations add column if not exists authorized_by text not null default '';
