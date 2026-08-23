import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { normalizeContainer } from "@/lib/iso6346";
import { canWorkPaint } from "@/lib/roles";
import type { WarehouseDetail, WarehouseListItem } from "@/lib/types";
import { requireMembership } from "@/lib/server/tenant";
import { tenantTables } from "@/lib/server/tenant-schema";

type HeadRow = {
  id: string;
  folio: string;
  entry_date: string;
  location_name: string;
  received_from: string;
  invoice_ref: string;
  received_by: string;
  notes: string;
  created_at: string;
  unit_count: number;
};

function mapHead(r: HeadRow): WarehouseListItem {
  return {
    id: r.id,
    folio: r.folio,
    entryDate: String(r.entry_date).slice(0, 10),
    locationName: r.location_name,
    receivedBy: r.received_by,
    unitCount: Number(r.unit_count) || 0,
    createdAt: r.created_at,
  };
}

export const listWarehouse = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<WarehouseListItem[]> => {
    const m = await requireMembership(context.userId);
    const T = tenantTables(m.dbSchema);
    const sql = await getSql();
    const rows = await sql.query<HeadRow>(
      `select e.id, e.folio, e.entry_date, e.location_name, e.received_from, e.invoice_ref,
              e.received_by, e.notes, e.created_at,
              (select count(*)::int from ${T.warehouse_units} u where u.entry_id = e.id) as unit_count
       from ${T.warehouse_entries} e
       order by e.entry_date desc, e.created_at desc
       limit 200`,
    );
    return rows.map(mapHead);
  });

export const getWarehouse = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }): Promise<WarehouseDetail | null> => {
    const m = await requireMembership(context.userId);
    const T = tenantTables(m.dbSchema);
    const sql = await getSql();
    const heads = await sql.query<HeadRow>(
      `select e.id, e.folio, e.entry_date, e.location_name, e.received_from, e.invoice_ref,
              e.received_by, e.notes, e.created_at,
              (select count(*)::int from ${T.warehouse_units} u where u.entry_id = e.id) as unit_count
       from ${T.warehouse_entries} e
       where e.id = $1`,
      [data.id],
    );
    const head = heads[0];
    if (!head) return null;
    const materials = await sql.query<{
      id: string;
      qty: string | number;
      unit: string;
      code: string;
      article: string;
    }>(
      `select id, qty, unit, code, article from ${T.warehouse_materials}
       where entry_id = $1 order by seq`,
      [data.id],
    );
    const units = await sql.query<{
      id: string;
      container_no: string;
      unit_code: string;
      size_code: string;
      naviera: string;
      treatment: string;
    }>(
      `select id, container_no, unit_code, size_code, naviera, treatment
       from ${T.warehouse_units}
       where entry_id = $1 order by seq`,
      [data.id],
    );
    return {
      ...mapHead(head),
      receivedFrom: head.received_from,
      invoiceRef: head.invoice_ref,
      notes: head.notes,
      materials: materials.map((x) => ({
        id: x.id,
        qty: Number(x.qty),
        unit: x.unit,
        code: x.code,
        article: x.article,
      })),
      units: units.map((x) => ({
        id: x.id,
        containerNo: x.container_no,
        unitCode: x.unit_code,
        sizeCode: x.size_code,
        naviera: x.naviera,
        treatment: x.treatment,
      })),
    };
  });

const createIn = z.object({
  folio: z.string().min(1).max(20),
  entryDate: z.string().min(8).max(10),
  locationName: z.string().max(80).default(""),
  receivedFrom: z.string().max(80).default(""),
  invoiceRef: z.string().max(40).default(""),
  receivedBy: z.string().max(80).default(""),
  notes: z.string().max(400).default(""),
  materials: z
    .array(
      z.object({
        qty: z.number().positive(),
        unit: z.string().min(1).max(8),
        code: z.string().max(24).default(""),
        article: z.string().min(1).max(80),
      }),
    )
    .max(20),
  units: z
    .array(
      z.object({
        containerNo: z.string().min(6).max(15),
        unitCode: z.string().max(8).default("FX"),
        sizeCode: z.string().min(1).max(12),
        naviera: z.string().min(1).max(40),
        treatment: z.string().max(40).default("Acond."),
      }),
    )
    .min(1)
    .max(80),
});

export const createWarehouse = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => createIn.parse(input))
  .handler(async ({ context, data }) => {
    const m = await requireMembership(context.userId);
    if (!canWorkPaint(m.role)) throw new Error("Su perfil no captura entradas de almacén");
    const T = tenantTables(m.dbSchema);
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql.query(
      `insert into ${T.warehouse_entries} (
        id, folio, entry_date, location_name, received_from, invoice_ref,
        received_by, notes, created_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        data.folio,
        data.entryDate,
        data.locationName,
        data.receivedFrom,
        data.invoiceRef,
        data.receivedBy || m.displayName,
        data.notes,
        context.userId,
      ],
    );
    let si = 1;
    for (const mat of data.materials) {
      await sql.query(
        `insert into ${T.warehouse_materials} (id, entry_id, qty, unit, code, article, seq)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [crypto.randomUUID(), id, mat.qty, mat.unit, mat.code, mat.article, si],
      );
      si += 1;
    }
    let ui = 1;
    for (const unit of data.units) {
      await sql.query(
        `insert into ${T.warehouse_units} (
          id, entry_id, container_no, unit_code, size_code, naviera, treatment, seq
        ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          crypto.randomUUID(),
          id,
          normalizeContainer(unit.containerNo),
          unit.unitCode,
          unit.sizeCode,
          unit.naviera,
          unit.treatment,
          ui,
        ],
      );
      ui += 1;
    }
    return { id };
  });
