import { pendingMigrations } from "../../../scripts/migration-plan.mjs";
import { getSql, type Sql } from "@/lib/db";
import { schemaNameFromOrgId, tenantTables, type TenantTables } from "@/lib/tenant-name";

export type { TenantTables };
export { schemaNameFromOrgId, tenantTables } from "@/lib/tenant-name";

const tenantFiles = import.meta.glob("/migrations/tenant/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const ready = new Set<string>();

function splitStatements(script: string): string[] {
  const withoutComments = script
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("--")) return "";
      const idx = line.indexOf("--");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");
  return withoutComments
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

async function publicTableExists(sql: Sql, table: string): Promise<boolean> {
  const rows = await sql.query<{ ok: boolean }>(
    `select true as ok from information_schema.tables
     where table_schema = 'public' and table_name = $1 limit 1`,
    [table],
  );
  return Boolean(rows[0]?.ok);
}

async function applyTenantDdl(sql: Sql, schema: string) {
  await sql.query(`create schema if not exists "${schema}"`);
  const doneRows = await sql.query<{ name: string }>(
    `select name from tenant_migrations where schema_name = $1`,
    [schema],
  );
  const done = doneRows.map((r) => r.name);
  const pending = pendingMigrations(Object.keys(tenantFiles), done);
  if (pending.length === 0 && Object.keys(tenantFiles).length === 0) {
    throw new Error("No hay estructura de patio para aplicar");
  }
  for (const { name, path } of pending) {
    const raw = tenantFiles[path];
    if (!raw) throw new Error(`Falta la estructura ${name}`);
    const body = raw.replaceAll("__SCHEMA__", `"${schema}"`);
    for (const stmt of splitStatements(body)) {
      await sql.query(stmt);
    }
    await sql.query(`insert into tenant_migrations (schema_name, name) values ($1, $2)`, [
      schema,
      name,
    ]);
  }
}

async function copyLegacyPublicOps(sql: Sql, orgId: string, schema: string) {
  if (!(await publicTableExists(sql, "inspections"))) return;
  const T = tenantTables(schema);

  await sql.query(
    `insert into ${T.inspections} (
       id, user_id, inspector_name, container_no, naviera, size_code, class_code, ownership,
       inspection_type, location_name, work_order, status, notes, missing_label, inspected_at, created_at
     )
     select id, user_id, inspector_name, container_no, naviera, size_code, class_code, ownership,
            inspection_type, location_name, work_order, status, notes, missing_label, inspected_at, created_at
     from public.inspections where org_id = $1
     on conflict (id) do nothing`,
    [orgId],
  );
  await sql.query(
    `insert into ${T.findings} (
       id, inspection_id, component, damage, repair, loc_code, point_id, side, sort_order, created_at
     )
     select id, inspection_id, component, damage, repair, loc_code, point_id, side, sort_order, created_at
     from public.findings where org_id = $1
     on conflict (id) do nothing`,
    [orgId],
  );
  await sql.query(
    `insert into ${T.photos} (
       id, finding_id, inspection_id, caption, data_url, sort_order, created_at
     )
     select id, finding_id, inspection_id, caption, data_url, sort_order, created_at
     from public.photos where org_id = $1
     on conflict (id) do nothing`,
    [orgId],
  );
  await sql.query(
    `insert into ${T.work_reports} (
       id, report_date, area, technicians, supervisor, notes, status, created_by, created_at
     )
     select id, report_date, area, technicians, supervisor, notes, status, created_by, created_at
     from public.work_reports where org_id = $1
     on conflict (id) do nothing`,
    [orgId],
  );
  await sql.query(
    `insert into ${T.work_report_lines} (
       id, report_id, seq, container_no, class_code, size_code, naviera, description,
       loc_code, unknown_ownership, missing_label, created_at
     )
     select id, report_id, seq, container_no, class_code, size_code, naviera, description,
            loc_code, unknown_ownership, missing_label, created_at
     from public.work_report_lines where org_id = $1
     on conflict (id) do nothing`,
    [orgId],
  );
  await sql.query(
    `insert into ${T.warehouse_entries} (
       id, folio, entry_date, location_name, received_from, invoice_ref, received_by, notes, created_by, created_at
     )
     select id, folio, entry_date, location_name, received_from, invoice_ref, received_by, notes, created_by, created_at
     from public.warehouse_entries where org_id = $1
     on conflict (id) do nothing`,
    [orgId],
  );
  await sql.query(
    `insert into ${T.warehouse_materials} (id, entry_id, qty, unit, code, article, seq)
     select id, entry_id, qty, unit, code, article, seq
     from public.warehouse_materials where org_id = $1
     on conflict (id) do nothing`,
    [orgId],
  );
  await sql.query(
    `insert into ${T.warehouse_units} (
       id, entry_id, container_no, unit_code, size_code, naviera, treatment, seq
     )
     select id, entry_id, container_no, unit_code, size_code, naviera, treatment, seq
     from public.warehouse_units where org_id = $1
     on conflict (id) do nothing`,
    [orgId],
  );

  await sql.query(`delete from public.photos where org_id = $1`, [orgId]);
  await sql.query(`delete from public.findings where org_id = $1`, [orgId]);
  await sql.query(`delete from public.inspections where org_id = $1`, [orgId]);
  await sql.query(`delete from public.work_report_lines where org_id = $1`, [orgId]);
  await sql.query(`delete from public.work_reports where org_id = $1`, [orgId]);
  await sql.query(`delete from public.warehouse_materials where org_id = $1`, [orgId]);
  await sql.query(`delete from public.warehouse_units where org_id = $1`, [orgId]);
  await sql.query(`delete from public.warehouse_entries where org_id = $1`, [orgId]);
}

async function dropPublicOpsIfEmpty(sql: Sql) {
  if (!(await publicTableExists(sql, "inspections"))) return;
  const leftover = await sql.query<{ c: number }>(
    `select (
       (select count(*)::int from public.inspections) +
       (select count(*)::int from public.work_reports) +
       (select count(*)::int from public.warehouse_entries)
     ) as c`,
  );
  if ((leftover[0]?.c ?? 0) > 0) return;
  await sql.query(`
    drop table if exists
      public.photos,
      public.findings,
      public.inspections,
      public.work_report_lines,
      public.work_reports,
      public.warehouse_materials,
      public.warehouse_units,
      public.warehouse_entries
    cascade
  `);
}

/** Create (or migrate) the patio's own database schema. Idempotent. */
export async function ensureOrgTenant(orgId: string): Promise<string> {
  const schema = schemaNameFromOrgId(orgId);
  if (ready.has(schema)) return schema;
  const sql = await getSql();
  await sql`
    update organizations
    set db_schema = coalesce(nullif(db_schema, ''), ${schema})
    where id = ${orgId}
  `;
  await applyTenantDdl(sql, schema);
  await copyLegacyPublicOps(sql, orgId, schema);
  await dropPublicOpsIfEmpty(sql);
  ready.add(schema);
  return schema;
}

export async function ensureAllTenants(): Promise<void> {
  const sql = await getSql();
  const orgs = await sql<{ id: string }>`select id from organizations`;
  for (const org of orgs) {
    await ensureOrgTenant(org.id);
  }
  await dropPublicOpsIfEmpty(sql);
}
