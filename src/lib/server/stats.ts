import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { YardStats } from "@/lib/types";
import { requireMembership } from "@/lib/server/tenant";

export const getYardStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<YardStats> => {
    const m = await requireMembership(context.userId);
    const sql = await getSql();
    const [insp] = await sql<{ c: number }>`
      select count(*)::int as c from inspections
      where org_id = ${m.orgId} and inspected_at >= date_trunc('day', now())
    `;
    const [mr] = await sql<{ c: number }>`
      select count(*)::int as c
      from work_report_lines l
      join work_reports r on r.id = l.report_id
      where r.org_id = ${m.orgId} and r.report_date = current_date
    `;
    const [paint] = await sql<{ c: number }>`
      select count(*)::int as c
      from warehouse_units u
      join warehouse_entries e on e.id = u.entry_id
      where e.org_id = ${m.orgId} and e.entry_date = current_date
    `;
    const [unk] = await sql<{ c: number }>`
      select count(*)::int as c from work_report_lines
      where org_id = ${m.orgId} and unknown_ownership = true
    `;
    const [open] = await sql<{ c: number }>`
      select count(*)::int as c from work_reports
      where org_id = ${m.orgId} and status = 'abierto'
    `;
    return {
      inspectionsToday: insp?.c ?? 0,
      mrToday: mr?.c ?? 0,
      paintToday: paint?.c ?? 0,
      unknownOwnership: unk?.c ?? 0,
      openMr: open?.c ?? 0,
    };
  });
