import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { normalizeContainer } from "@/lib/iso6346";
import { canWorkMr } from "@/lib/roles";
import type { WorkReportDetail, WorkReportLine, WorkReportListItem } from "@/lib/types";
import { requireMembership } from "@/lib/server/tenant";

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
    const sql = await getSql();
    const rows = await sql<HeadRow>`
      select r.id, r.report_date, r.area, r.technicians, r.supervisor, r.status,
             r.notes, r.created_at,
             (select count(*)::int from work_report_lines l where l.report_id = r.id) as line_count
      from work_reports r
      where r.org_id = ${m.orgId}
      order by r.report_date desc, r.created_at desc
      limit 200
    `;
    return rows.map(mapHead);
  });

export const getWorkReport = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }): Promise<WorkReportDetail | null> => {
    const m = await requireMembership(context.userId);
    const sql = await getSql();
    const heads = await sql<HeadRow>`
      select r.id, r.report_date, r.area, r.technicians, r.supervisor, r.status,
             r.notes, r.created_at,
             (select count(*)::int from work_report_lines l where l.report_id = r.id) as line_count
      from work_reports r
      where r.id = ${data.id} and r.org_id = ${m.orgId}
    `;
    const head = heads[0];
    if (!head) return null;
    const lines = await sql<LineRow>`
      select id, seq, container_no, class_code, size_code, naviera, description,
             loc_code, unknown_ownership, missing_label
      from work_report_lines
      where report_id = ${data.id} and org_id = ${m.orgId}
      order by seq
    `;
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
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`
      insert into work_reports (
        id, org_id, report_date, area, technicians, supervisor, notes, status, created_by
      ) values (
        ${id}, ${m.orgId}, ${data.reportDate}, ${data.area}, ${data.technicians},
        ${data.supervisor}, ${data.notes}, ${"abierto"}, ${context.userId}
      )
    `;
    let seq = 1;
    for (const line of data.lines) {
      await sql`
        insert into work_report_lines (
          id, report_id, org_id, seq, container_no, class_code, size_code, naviera,
          description, loc_code, unknown_ownership, missing_label
        ) values (
          ${crypto.randomUUID()}, ${id}, ${m.orgId}, ${seq},
          ${normalizeContainer(line.containerNo)}, ${line.classCode}, ${line.sizeCode},
          ${line.naviera}, ${line.description}, ${line.locCode},
          ${line.unknownOwnership}, ${line.missingLabel}
        )
      `;
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
    const sql = await getSql();
    await sql`
      update work_reports
      set status = ${"cerrado"},
          supervisor = case when ${data.supervisor ?? ""} = '' then supervisor else ${data.supervisor ?? ""} end
      where id = ${data.id} and org_id = ${m.orgId}
    `;
    return { ok: true };
  });
