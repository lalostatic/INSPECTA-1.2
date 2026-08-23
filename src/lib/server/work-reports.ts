import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { normalizeContainer } from "@/lib/iso6346";
import { canWorkMr } from "@/lib/roles";
import type { WorkReportDetail, WorkReportLine, WorkReportListItem } from "@/lib/types";
import { requireMembership } from "@/lib/server/tenant";
import { tenantTables } from "@/lib/server/tenant-schema";

type HeadRow = {
  id: string;
  report_date: string;
  area: string;
  technicians: string;
  supervisor: string;
  status: string;
  notes: string;
  created_at: string;
  line_count: number;
};

function mapHead(r: HeadRow): WorkReportListItem {
  return {
    id: r.id,
    reportDate: String(r.report_date).slice(0, 10),
    area: r.area,
    technicians: r.technicians,
    supervisor: r.supervisor,
    status: r.status,
    lineCount: Number(r.line_count) || 0,
    createdAt: r.created_at,
  };
}

type LineRow = {
  id: string;
  seq: number;
  container_no: string;
  class_code: string;
  size_code: string;
  naviera: string;
  description: string;
  loc_code: string;
  unknown_ownership: boolean;
  missing_label: boolean;
};

function mapLine(r: LineRow): WorkReportLine {
  return {
    id: r.id,
    seq: r.seq,
    containerNo: r.container_no,
    classCode: r.class_code,
    sizeCode: r.size_code,
    naviera: r.naviera,
    description: r.description,
    locCode: r.loc_code,
    unknownOwnership: Boolean(r.unknown_ownership),
    missingLabel: Boolean(r.missing_label),
  };
}

export const listWorkReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<WorkReportListItem[]> => {
    const m = await requireMembership(context.userId);
    const T = tenantTables(m.dbSchema);
    const sql = await getSql();
    const rows = await sql.query<HeadRow>(
      `select r.id, r.report_date, r.area, r.technicians, r.supervisor, r.status,
              r.notes, r.created_at,
              (select count(*)::int from ${T.work_report_lines} l where l.report_id = r.id) as line_count
       from ${T.work_reports} r
       order by r.report_date desc, r.created_at desc
       limit 200`,
    );
    return rows.map(mapHead);
  });

export const getWorkReport = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }): Promise<WorkReportDetail | null> => {
    const m = await requireMembership(context.userId);
    const T = tenantTables(m.dbSchema);
    const sql = await getSql();
    const heads = await sql.query<HeadRow>(
      `select r.id, r.report_date, r.area, r.technicians, r.supervisor, r.status,
              r.notes, r.created_at,
              (select count(*)::int from ${T.work_report_lines} l where l.report_id = r.id) as line_count
       from ${T.work_reports} r
       where r.id = $1`,
      [data.id],
    );
    const head = heads[0];
    if (!head) return null;
    const lines = await sql.query<LineRow>(
      `select id, seq, container_no, class_code, size_code, naviera, description,
              loc_code, unknown_ownership, missing_label
       from ${T.work_report_lines}
       where report_id = $1
       order by seq`,
      [data.id],
    );
    return { ...mapHead(head), notes: head.notes, lines: lines.map(mapLine) };
  });

const lineIn = z.object({
  containerNo: z.string().min(6).max(15),
  classCode: z.string().max(4).default("C"),
  sizeCode: z.string().min(1).max(12),
  naviera: z.string().min(1).max(40),
  description: z.string().min(1).max(400),
  locCode: z.string().max(12).default(""),
  unknownOwnership: z.boolean().default(false),
  missingLabel: z.boolean().default(false),
});

const createIn = z.object({
  reportDate: z.string().min(8).max(10),
  area: z.string().max(12).default("MR"),
  technicians: z.string().max(120).default(""),
  supervisor: z.string().max(80).default(""),
  notes: z.string().max(600).default(""),
  lines: z.array(lineIn).min(1).max(80),
});

export const createWorkReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => createIn.parse(input))
  .handler(async ({ context, data }) => {
    const m = await requireMembership(context.userId);
    if (!canWorkMr(m.role)) throw new Error("Su perfil no captura reportes de taller");
    const T = tenantTables(m.dbSchema);
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql.query(
      `insert into ${T.work_reports} (
        id, report_date, area, technicians, supervisor, notes, status, created_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, data.reportDate, data.area, data.technicians, data.supervisor, data.notes, "abierto", context.userId],
    );
    let seq = 1;
    for (const line of data.lines) {
      await sql.query(
        `insert into ${T.work_report_lines} (
          id, report_id, seq, container_no, class_code, size_code, naviera,
          description, loc_code, unknown_ownership, missing_label
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          crypto.randomUUID(),
          id,
          seq,
          normalizeContainer(line.containerNo),
          line.classCode,
          line.sizeCode,
          line.naviera,
          line.description,
          line.locCode,
          line.unknownOwnership,
          line.missingLabel,
        ],
      );
      seq += 1;
    }
    return { id };
  });

export const closeWorkReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ id: z.string(), supervisor: z.string().max(80).optional() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const m = await requireMembership(context.userId);
    if (!canWorkMr(m.role) && m.role !== "office") throw new Error("Sin permiso");
    const T = tenantTables(m.dbSchema);
    const sql = await getSql();
    await sql.query(
      `update ${T.work_reports}
       set status = $1,
           supervisor = case when $2 = '' then supervisor else $2 end
       where id = $3`,
      ["cerrado", data.supervisor ?? "", data.id],
    );
    return { ok: true };
  });
