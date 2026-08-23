/** Stable Postgres schema name for a patio. One schema = one company database. */
const UUID_HEX = /^[a-f0-9]{32}$/;
export const TENANT_SCHEMA_RE = /^t_[a-f0-9]{32}$/;

const TABLES = [
  "inspections",
  "findings",
  "photos",
  "work_reports",
  "work_report_lines",
  "warehouse_entries",
  "warehouse_materials",
  "warehouse_units",
] as const;

export type TenantTable = (typeof TABLES)[number];

export type TenantTables = Record<TenantTable, string>;

export function schemaNameFromOrgId(orgId: string): string {
  const hex = orgId.trim().toLowerCase().replace(/-/g, "");
  if (!UUID_HEX.test(hex)) throw new Error("Identificador de empresa no válido");
  return `t_${hex}`;
}

export function assertTenantSchema(schema: string): string {
  const value = schema.trim().toLowerCase();
  if (!TENANT_SCHEMA_RE.test(value)) throw new Error("Esquema de patio no válido");
  return value;
}

/** Qualified table names. Identifiers are allowlisted — never interpolating user text. */
export function tenantTables(schema: string): TenantTables {
  const s = assertTenantSchema(schema);
  const out = {} as TenantTables;
  for (const table of TABLES) {
    out[table] = `"${s}".${table}`;
  }
  return out;
}
