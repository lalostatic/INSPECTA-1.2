-- Multi-tenant: each company (patio) is an isolated organization.
create table if not exists organizations (
  id           text primary key,
  slug         text not null unique,
  name         text not null,
  depot        text not null default '',
  city         text not null default '',
  invite_code  text not null unique,
  created_by   text not null,
  created_at   timestamptz not null default now()
);

create table if not exists org_members (
  org_id       text not null references organizations(id) on delete cascade,
  user_id      text not null,
  display_name text not null default '',
  role         text not null default 'inspector',
  created_at   timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists org_members_user_idx on org_members (user_id);

create table if not exists org_modules (
  org_id     text not null references organizations(id) on delete cascade,
  module_key text not null,
  enabled    boolean not null default true,
  primary key (org_id, module_key)
);
