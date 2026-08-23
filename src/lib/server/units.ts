import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { formatContainer, normalizeContainer } from "@/lib/iso6346";
import type { UnitEvent } from "@/lib/types";
import { requireMembership } from "@/lib/server/tenant";
import { tenantTables } from "@/lib/server/tenant-schema";

export const getUnitTimeline = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ no: z.string().min(4) }).parse(input))
  .handler(async ({ context, data }): Promise<{ containerNo: string; events: UnitEvent[] }> => {
    const m = await requireMembership(context.userId);
    const T = tenantTables(m.dbSchema);
    const no = normalizeContainer(data.no);
    const sql = await getSql();
    const events: UnitEvent[] = [];

    const insps = await sql.query<{
      id: string;
      inspected_at: string;
      inspector_name: string;
      primary_damage: string | null;
    }>(
      `select i.id, i.inspected_at, i.inspector_name,
        (select f.damage from ${T.findings} f where f.inspection_id = i.id order by f.sort_order limit 1) as primary_damage
       from ${T.inspections} i
       where i.container_no = $1
       order by i.inspected_at desc`,
      [no],
    );
    for (const r of insps) {
      events.push({
        kind: "inspeccion",
        at: String(r.inspected_at),
        title: "Inspección de patio",
        body: `${r.inspector_name}${r.primary_damage ? ` · ${r.primary_damage}` : ""}`,
        id: r.id,
      });
    }

    const mr = await sql.query<{ id: string; report_date: string; description: string; technicians: string }>(
      `select r.id, r.report_date, l.description, r.technicians
       from ${T.work_report_lines} l
       join ${T.work_reports} r on r.id = l.report_id
       where l.container_no = $1
       order by r.report_date desc`,
      [no],
    );
    for (const r of mr) {
      events.push({
        kind: "mr",
        at: `${String(r.report_date).slice(0, 10)}T12:00:00.000Z`,
        title: "Reporte de trabajo M&R",
        body: `${r.description}${r.technicians ? ` · ${r.technicians}` : ""}`,
        id: r.id,
      });
    }

    const paint = await sql.query<{ id: string; entry_date: string; treatment: string; folio: string }>(
      `select e.id, e.entry_date, u.treatment, e.folio
       from ${T.warehouse_units} u
       join ${T.warehouse_entries} e on e.id = u.entry_id
       where u.container_no = $1
       order by e.entry_date desc`,
      [no],
    );
    for (const r of paint) {
      events.push({
        kind: "pintura",
        at: `${String(r.entry_date).slice(0, 10)}T12:00:00.000Z`,
        title: `Almacén · folio ${r.folio}`,
        body: r.treatment,
        id: r.id,
      });
    }

    events.sort((a, b) => (a.at < b.at ? 1 : -1));
    return { containerNo: formatContainer(no), events };
  });
