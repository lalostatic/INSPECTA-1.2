import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { YardStats } from "@/lib/types";
import { requireMembership } from "@/lib/server/tenant";
import { tenantTables } from "@/lib/server/tenant-schema";

export const getYardStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<YardStats> => {
    const m = await requireMembership(context.userId);
    const T = tenantTables(m.dbSchema);
    const sql = await getSql();
    const [insp] = await sql.query<{ c: number }>(
      `select count(*)::int as c from ${T.inspections}
       where inspected_at >= date_trunc('day', now())`,
    );
    const [mr] = await sql.query<{ c: number }>(
      `select count(*)::int as c
       from ${T.work_report_lines} l
       join ${T.work_reports} r on r.id = l.report_id
       where r.report_date = current_date`,
    );
    const [paint] = await sql.query<{ c: number }>(
      `select count(*)::int as c
       from ${T.warehouse_units} u
       join ${T.warehouse_entries} e on e.id = u.entry_id
       where e.entry_date = current_date`,
    );
    const [unk] = await sql.query<{ c: number }>(
      `select count(*)::int as c from ${T.work_report_lines}
       where unknown_ownership = true`,
    );
    const [open] = await sql.query<{ c: number }>(
      `select count(*)::int as c from ${T.work_reports}
       where status = 'abierto'`,
    );
    return {
      inspectionsToday: insp?.c ?? 0,
      mrToday: mr?.c ?? 0,
      paintToday: paint?.c ?? 0,
      unknownOwnership: unk?.c ?? 0,
      openMr: open?.c ?? 0,
    };
  });
