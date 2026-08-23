-- Control plane (public): identity, billing, members, modules.
-- Each patio gets its own Postgres schema — same structure, no shared operational rows.
alter table organizations add column if not exists db_schema text;
create unique index if not exists organizations_db_schema_uidx
  on organizations (db_schema)
  where db_schema is not null;

create table if not exists tenant_migrations (
  schema_name text not null,
  name        text not null,
  applied_at  timestamptz not null default now(),
  primary key (schema_name, name)
);
