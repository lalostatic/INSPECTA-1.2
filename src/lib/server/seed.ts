import { getSql } from "@/lib/db";

/** Sample rows transcribed from the 22-ago-2026 paper forms. Isolated per org. */
export async function seedOrgIfEmpty(
  orgId: string,
  userId: string,
  actorName: string,
  sample: "cerlan" | "contri" = "cerlan",
) {
  if (sample === "contri") {
    await seedContri(orgId, userId, actorName);
    return;
  }
  await seedCerlan(orgId, userId, actorName);
}

async function seedCerlan(orgId: string, userId: string, actorName: string) {
  const sql = await getSql();
  const existing = await sql<{ c: number }>`
    select count(*)::int as c from work_reports where org_id = ${orgId}
  `;
  if ((existing[0]?.c ?? 0) > 0) return;

  const reportId = crypto.randomUUID();
  await sql`
    insert into work_reports (
      id, org_id, report_date, area, technicians, supervisor, notes, status, created_by
    ) values (
      ${reportId}, ${orgId}, ${"2026-08-22"}, ${"MR"},
      ${"Israel y Luis Angel"}, ${""},
      ${"Asterisco: contenedores que no dicen si son merchant o carrier; unos no traen etiqueta."},
      ${"cerrado"}, ${userId}
    )
  `;

  const mrLines: {
    container: string;
    size: string;
    line: string;
    desc: string;
    loc: string;
    star: boolean;
  }[] = [
    { container: "HLBU2352490", size: "40HC", line: "HL", desc: "Banda (Restos de carga) + Limpieza (Se barrió piso completo)", loc: "", star: true },
    { container: "HAMU2333567", size: "40HC", line: "HL", desc: "End 2 Pl x 2 Pl de panel (RXEW)", loc: "RXEW", star: false },
    { container: "BEAU5371146", size: "40HC", line: "HL", desc: "Banda (Restos de carga) + End 1 Ruben de lona (DGAN)", loc: "DGAN", star: true },
    { container: "HAHU3892110", size: "40HC", line: "HL", desc: "Banda (Restos de carga) + Limpieza (Se barrió piso completo)", loc: "", star: true },
    { container: "HAMU1171743", size: "40HC", line: "HL", desc: "Banda (Restos de carga)", loc: "", star: true },
    { container: "HLBU2487483", size: "40HC", line: "HL", desc: "Banda (Restos de carga)", loc: "", star: true },
    { container: "HAMU1426459", size: "40HC", line: "HL", desc: "Banda (Restos de carga) + Limpieza (Se barrió piso completo)", loc: "", star: true },
    { container: "HLBU3217478", size: "40HC", line: "HL", desc: "Banda (Restos de carga)", loc: "", star: true },
    { container: "UETU3246520", size: "20DC", line: "MSC", desc: "Banda (Restos de carga) + End 1 Pl x 2 Pl de panel", loc: "", star: false },
    { container: "MSEU8541296", size: "20DC", line: "MSC", desc: "Banda (Restos de carga) + Se relimó cintas en panel", loc: "", star: false },
    { container: "MSEU3543112", size: "20DC", line: "MSC", desc: "Banda (Restos de carga) + Se relimó cintas en panel", loc: "", star: false },
    { container: "MSEU3543128", size: "20DC", line: "MSC", desc: "Banda (Restos de carga) + Se relimó cintas en panel", loc: "", star: false },
    { container: "MSEU3544510", size: "20DC", line: "MSC", desc: "Banda (Restos de carga) + Se relimó cintas en panel", loc: "", star: false },
    { container: "MEDU5440052", size: "20DC", line: "MSC", desc: "Banda (Restos de carga) + Se relimó llaves", loc: "", star: false },
  ];

  let seq = 1;
  for (const line of mrLines) {
    await sql`
      insert into work_report_lines (
        id, report_id, org_id, seq, container_no, class_code, size_code, naviera,
        description, loc_code, unknown_ownership, missing_label
      ) values (
        ${crypto.randomUUID()}, ${reportId}, ${orgId}, ${seq}, ${line.container},
        ${"C"}, ${line.size}, ${line.line}, ${line.desc}, ${line.loc},
        ${line.star}, ${line.star}
      )
    `;
    seq += 1;
  }

  const entryId = crypto.randomUUID();
  await sql`
    insert into warehouse_entries (
      id, org_id, folio, entry_date, location_name, received_from, invoice_ref,
      received_by, notes, created_by
    ) values (
      ${entryId}, ${orgId}, ${"5179"}, ${"2026-08-22"}, ${"Cerlan"}, ${""}, ${""},
      ${"Eduardo"}, ${"Formato de pintores — material + unidades acondicionadas."}, ${userId}
    )
  `;
  await sql`
    insert into warehouse_materials (
      id, entry_id, org_id, qty, unit, code, article, seq
    ) values (
      ${crypto.randomUUID()}, ${entryId}, ${orgId}, ${19}, ${"LTS"}, ${"9x15"}, ${"perla"}, ${1}
    )
  `;
  const paintUnits = [
    { no: "HAMU3742306", size: "40HC", line: "HL" },
    { no: "CAIU4809187", size: "40HC", line: "HL" },
    { no: "HAMU5060769", size: "40HC", line: "HL" },
    { no: "HAMU4964339", size: "40HC", line: "HL" },
    { no: "UETU6392657", size: "40HC", line: "HL" },
  ];
  let u = 1;
  for (const unit of paintUnits) {
    await sql`
      insert into warehouse_units (
        id, entry_id, org_id, container_no, unit_code, size_code, naviera, treatment, seq
      ) values (
        ${crypto.randomUUID()}, ${entryId}, ${orgId}, ${unit.no}, ${"FX"},
        ${unit.size}, ${unit.line}, ${"Acond."}, ${u}
      )
    `;
    u += 1;
  }

  const inspId = crypto.randomUUID();
  await sql`
    insert into inspections (
      id, org_id, user_id, inspector_name, container_no, naviera, size_code, class_code,
      ownership, inspection_type, location_name, status, notes, missing_label
    ) values (
      ${inspId}, ${orgId}, ${userId}, ${actorName || "Inspector"},
      ${"HAMU2333567"}, ${"Hapag-Lloyd"}, ${"40HC"}, ${"C"}, ${"carrier"},
      ${"Inspección Express"}, ${"Patio"}, ${"enviada"},
      ${"Folio de patio de ejemplo."},
      ${false}
    )
  `;
  const fid = crypto.randomUUID();
  await sql`
    insert into findings (
      id, inspection_id, org_id, component, damage, repair, loc_code, sort_order
    ) values (
      ${fid}, ${inspId}, ${orgId}, ${"LADO DERECHO"}, ${"ABOLLADO"},
      ${"ENDEREZAR PANEL"}, ${"RXEW"}, ${0}
    )
  `;
}

/** Distinct Contri sample so the two patios never share container numbers. */
async function seedContri(orgId: string, userId: string, actorName: string) {
  const sql = await getSql();
  const existing = await sql<{ c: number }>`
    select count(*)::int as c from work_reports where org_id = ${orgId}
  `;
  if ((existing[0]?.c ?? 0) > 0) return;

  const reportId = crypto.randomUUID();
  await sql`
    insert into work_reports (
      id, org_id, report_date, area, technicians, supervisor, notes, status, created_by
    ) values (
      ${reportId}, ${orgId}, ${"2026-08-21"}, ${"MR"},
      ${"Jorge y Martín"}, ${"Ana Herrera"},
      ${"Patio Contri — no comparte folios con Cerlan."},
      ${"cerrado"}, ${userId}
    )
  `;

  const mrLines = [
    { container: "MSKU2091450", size: "40HC", line: "MAEU", desc: "Banda (Restos de carga)", loc: "", star: false },
    { container: "TCLU8873216", size: "40HC", line: "OOLU", desc: "End 1 Pl x 1 Pl de panel (LXEW)", loc: "LXEW", star: false },
    { container: "TEMU4410983", size: "20DC", line: "MSCU", desc: "Se relimó cintas en panel", loc: "", star: false },
    { container: "CAIU7122048", size: "40HC", line: "HL", desc: "Banda (Restos de carga) + Limpieza", loc: "", star: true },
    { container: "FCIU3301987", size: "20DC", line: "MSCU", desc: "Cambio de goma de puerta", loc: "DGAN", star: false },
  ];
  let seq = 1;
  for (const line of mrLines) {
    await sql`
      insert into work_report_lines (
        id, report_id, org_id, seq, container_no, class_code, size_code, naviera,
        description, loc_code, unknown_ownership, missing_label
      ) values (
        ${crypto.randomUUID()}, ${reportId}, ${orgId}, ${seq}, ${line.container},
        ${"C"}, ${line.size}, ${line.line}, ${line.desc}, ${line.loc},
        ${line.star}, ${line.star}
      )
    `;
    seq += 1;
  }

  const entryId = crypto.randomUUID();
  await sql`
    insert into warehouse_entries (
      id, org_id, folio, entry_date, location_name, received_from, invoice_ref,
      received_by, notes, created_by
    ) values (
      ${entryId}, ${orgId}, ${"2204"}, ${"2026-08-21"}, ${"Contri"}, ${""}, ${""},
      ${"Carmen Ortiz"}, ${"Entrada de almacén Contri."}, ${userId}
    )
  `;
  await sql`
    insert into warehouse_materials (
      id, entry_id, org_id, qty, unit, code, article, seq
    ) values (
      ${crypto.randomUUID()}, ${entryId}, ${orgId}, ${12}, ${"LTS"}, ${"8x12"}, ${"blanco"}, ${1}
    )
  `;
  const paintUnits = [
    { no: "MSKU7742210", size: "40HC", line: "MAEU" },
    { no: "TCLU1198004", size: "40HC", line: "OOLU" },
    { no: "TEMU9088112", size: "20DC", line: "MSCU" },
  ];
  let u = 1;
  for (const unit of paintUnits) {
    await sql`
      insert into warehouse_units (
        id, entry_id, org_id, container_no, unit_code, size_code, naviera, treatment, seq
      ) values (
        ${crypto.randomUUID()}, ${entryId}, ${orgId}, ${unit.no}, ${"FX"},
        ${unit.size}, ${unit.line}, ${"Acond."}, ${u}
      )
    `;
    u += 1;
  }

  const inspId = crypto.randomUUID();
  await sql`
    insert into inspections (
      id, org_id, user_id, inspector_name, container_no, naviera, size_code, class_code,
      ownership, inspection_type, location_name, status, notes, missing_label
    ) values (
      ${inspId}, ${orgId}, ${userId}, ${actorName || "Inspector"},
      ${"TCLU8873216"}, ${"OOCL"}, ${"40HC"}, ${"C"}, ${"merchant"},
      ${"Inspección Express"}, ${"Patio Norte"}, ${"enviada"},
      ${"Folio de patio Contri. Aislado de Cerlan."},
      ${false}
    )
  `;
  await sql`
    insert into findings (
      id, inspection_id, org_id, component, damage, repair, loc_code, sort_order
    ) values (
      ${crypto.randomUUID()}, ${inspId}, ${orgId}, ${"LADO IZQUIERDO"}, ${"ABOLLADO"},
      ${"ENDEREZAR PANEL"}, ${"LXEW"}, ${0}
    )
  `;
}
