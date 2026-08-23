import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { normalizeContainer } from "@/lib/iso6346";
import { canCreateInspection } from "@/lib/roles";
import type { Finding, InspectionDetail, InspectionListItem } from "@/lib/types";
import { requireMembership } from "@/lib/server/tenant";
import { tenantTables, type TenantTables } from "@/lib/server/tenant-schema";

type HeadRow = {
  id: string;
  user_id: string;
  container_no: string;
  naviera: string;
  size_code: string;
  class_code: string;
  ownership: string;
  inspector_name: string;
  status: string;
  inspected_at: string;
  inspection_type: string;
  location_name: string;
  work_order: string;
  notes: string;
  missing_label: boolean;
  finding_count: number;
  primary_damage: string | null;
};

function mapList(r: HeadRow): InspectionListItem {
  return {
    id: r.id,
    containerNo: r.container_no,
    naviera: r.naviera,
    sizeCode: r.size_code,
    classCode: r.class_code,
    ownership: r.ownership,
    inspectorName: r.inspector_name,
    status: r.status,
    inspectedAt: r.inspected_at,
    findingCount: Number(r.finding_count) || 0,
    primaryDamage: r.primary_damage ?? "",
    missingLabel: Boolean(r.missing_label),
  };
}

function listSql(T: TenantTables) {
  return `select i.id, i.user_id, i.container_no, i.naviera, i.size_code, i.class_code, i.ownership,
  i.inspector_name, i.status, i.inspected_at, i.inspection_type, i.location_name,
  i.work_order, i.notes, i.missing_label,
  (select count(*)::int from ${T.findings} f where f.inspection_id = i.id) as finding_count,
  (select f.damage from ${T.findings} f where f.inspection_id = i.id order by f.sort_order limit 1) as primary_damage
  from ${T.inspections} i`;
}

export const listInspections = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<InspectionListItem[]> => {
    const m = await requireMembership(context.userId);
    const T = tenantTables(m.dbSchema);
    const sql = await getSql();
    const mine = m.role === "inspector" ? context.userId : null;
    const rows = await sql.query<HeadRow>(
      `${listSql(T)}
       where ($1::text is null or i.user_id = $1)
       order by i.inspected_at desc limit 300`,
      [mine],
    );
    return rows.map(mapList);
  });

export const getInspection = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }): Promise<InspectionDetail | null> => {
    const m = await requireMembership(context.userId);
    const T = tenantTables(m.dbSchema);
    const sql = await getSql();
    const rows = await sql.query<HeadRow>(`${listSql(T)} where i.id = $1`, [data.id]);
    const head = rows[0];
    if (!head) return null;
    if (m.role === "inspector" && head.user_id !== context.userId) return null;
    const findings = await sql.query<{
      id: string;
      component: string;
      damage: string;
      repair: string;
      loc_code: string;
      point_id: string;
      side: string;
    }>(
      `select id, component, damage, repair, loc_code, point_id, side from ${T.findings}
       where inspection_id = $1 order by sort_order`,
      [data.id],
    );
    const photos = await sql.query<{ id: string; finding_id: string; data_url: string; caption: string }>(
      `select id, finding_id, data_url, caption from ${T.photos}
       where inspection_id = $1 order by sort_order`,
      [data.id],
    );
    const by: Record<string, Finding["photos"]> = {};
    for (const p of photos) {
      (by[p.finding_id] ??= []).push({ id: p.id, dataUrl: p.data_url, caption: p.caption });
    }
    return {
      ...mapList(head),
      inspectionType: head.inspection_type,
      locationName: head.location_name,
      workOrder: head.work_order,
      notes: head.notes,
      findings: findings.map((f) => ({
        id: f.id,
        pointId: f.point_id ?? "",
        side: f.side ?? "",
        component: f.component,
        damage: f.damage,
        repair: f.repair,
        locCode: f.loc_code,
        photos: by[f.id] ?? [],
      })),
    };
  });

const createIn = z.object({
  containerNo: z.string().min(6).max(15),
  naviera: z.string().min(1).max(40),
  sizeCode: z.string().min(1).max(12),
  classCode: z.string().max(4).default("C"),
  ownership: z.enum(["merchant", "carrier", "unknown"]).default("unknown"),
  inspectionType: z.string().max(40).default("Inspección Express"),
  locationName: z.string().max(40).default(""),
  workOrder: z.string().max(24).default(""),
  notes: z.string().max(600).default(""),
  missingLabel: z.boolean().default(false),
  findings: z
    .array(
      z.object({
        component: z.string().max(40).default(""),
        damage: z.string().max(40).default(""),
        repair: z.string().max(400).default(""),
        locCode: z.string().max(12).default(""),
        pointId: z.string().max(24).default(""),
        side: z.string().max(16).default(""),
        photos: z
          .array(z.object({ caption: z.string().max(120).default(""), dataUrl: z.string().min(8).max(520_000) }))
          .max(8),
      }),
    )
    .min(1)
    .max(20),
});

export const createInspection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => createIn.parse(input))
  .handler(async ({ context, data }) => {
    const m = await requireMembership(context.userId);
    if (!canCreateInspection(m.role)) throw new Error("Su perfil no registra inspecciones");
    const T = tenantTables(m.dbSchema);
    const sql = await getSql();
    const id = crypto.randomUUID();
    const container = normalizeContainer(data.containerNo);
    await sql.query(
      `insert into ${T.inspections} (
        id, user_id, inspector_name, container_no, naviera, size_code, class_code,
        ownership, inspection_type, location_name, work_order, status, notes, missing_label
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        id,
        context.userId,
        m.displayName || "Inspector",
        container,
        data.naviera,
        data.sizeCode,
        data.classCode,
        data.ownership,
        data.inspectionType,
        data.locationName,
        data.workOrder,
        "enviada",
        data.notes,
        data.missingLabel,
      ],
    );
    let fi = 0;
    for (const f of data.findings) {
      const fid = crypto.randomUUID();
      await sql.query(
        `insert into ${T.findings} (
          id, inspection_id, component, damage, repair, loc_code, point_id, side, sort_order
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [fid, id, f.component, f.damage, f.repair, f.locCode, f.pointId, f.side, fi],
      );
      let pi = 0;
      for (const p of f.photos) {
        if (!p.dataUrl.startsWith("data:image/")) throw new Error("Foto inválida");
        await sql.query(
          `insert into ${T.photos} (id, finding_id, inspection_id, caption, data_url, sort_order)
           values ($1,$2,$3,$4,$5,$6)`,
          [crypto.randomUUID(), fid, id, p.caption || f.damage, p.dataUrl, pi],
        );
        pi += 1;
      }
      fi += 1;
    }
    return { id };
  });
