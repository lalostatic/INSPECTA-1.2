-- Operational records are always scoped by org_id. Never share rows across companies.

create table if not exists inspections (
  id               text primary key,
  org_id           text not null references organizations(id) on delete cascade,
  user_id          text not null,
  inspector_name   text not null default '',
  container_no     text not null,
  naviera          text not null default '',
  size_code        text not null default '',
  class_code       text not null default 'C',
  ownership        text not null default 'unknown',
  inspection_type  text not null default 'Inspección Express',
  location_name    text not null default '',
  work_order       text not null default '',
  status           text not null default 'enviada',
  notes            text not null default '',
  missing_label    boolean not null default false,
  inspected_at     timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index if not exists inspections_org_idx on inspections (org_id, inspected_at desc);
create index if not exists inspections_org_container_idx on inspections (org_id, container_no);

create table if not exists findings (
  id             text primary key,
  inspection_id  text not null references inspections(id) on delete cascade,
  org_id         text not null,
  component      text not null default '',
  damage         text not null,
  repair         text not null default '',
  loc_code       text not null default '',
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists findings_insp_idx on findings (inspection_id);

create table if not exists photos (
  id             text primary key,
  finding_id     text not null references findings(id) on delete cascade,
  inspection_id  text not null,
  org_id         text not null,
  caption        text not null default '',
  data_url       text not null,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists photos_insp_idx on photos (inspection_id);

create table if not exists work_reports (
  id           text primary key,
  org_id       text not null references organizations(id) on delete cascade,
  report_date  date not null,
  area         text not null default 'MR',
  technicians  text not null default '',
  supervisor   text not null default '',
  notes        text not null default '',
  status       text not null default 'abierto',
  created_by   text not null,
  created_at   timestamptz not null default now()
);
create index if not exists work_reports_org_idx on work_reports (org_id, report_date desc);

create table if not exists work_report_lines (
  id                  text primary key,
  report_id           text not null references work_reports(id) on delete cascade,
  org_id              text not null,
  seq                 integer not null,
  container_no        text not null,
  class_code          text not null default 'C',
  size_code           text not null,
  naviera             text not null,
  description         text not null,
  loc_code            text not null default '',
  unknown_ownership   boolean not null default false,
  missing_label       boolean not null default false,
  created_at          timestamptz not null default now()
);
create index if not exists work_lines_report_idx on work_report_lines (report_id, seq);
create index if not exists work_lines_container_idx on work_report_lines (org_id, container_no);

create table if not exists warehouse_entries (
  id             text primary key,
  org_id         text not null references organizations(id) on delete cascade,
  folio          text not null,
  entry_date     date not null,
  location_name  text not null default '',
  received_from  text not null default '',
  invoice_ref    text not null default '',
  received_by    text not null default '',
  notes          text not null default '',
  created_by     text not null,
  created_at     timestamptz not null default now()
);
create index if not exists warehouse_org_idx on warehouse_entries (org_id, entry_date desc);

create table if not exists warehouse_materials (
  id         text primary key,
  entry_id   text not null references warehouse_entries(id) on delete cascade,
  org_id     text not null,
  qty        numeric not null,
  unit       text not null,
  code       text not null default '',
  article    text not null,
  seq        integer not null
);
create index if not exists warehouse_mat_idx on warehouse_materials (entry_id, seq);

create table if not exists warehouse_units (
  id            text primary key,
  entry_id      text not null references warehouse_entries(id) on delete cascade,
  org_id        text not null,
  container_no  text not null,
  unit_code     text not null default 'FX',
  size_code     text not null,
  naviera       text not null,
  treatment     text not null default 'Acond.',
  seq           integer not null
);
create index if not exists warehouse_units_idx on warehouse_units (entry_id, seq);
create index if not exists warehouse_units_container_idx on warehouse_units (org_id, container_no);
