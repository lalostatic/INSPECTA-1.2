import type { ReactNode } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatContainer } from "@/lib/iso6346";
import type { WarehouseDetail, WorkReportDetail } from "@/lib/types";

export function PrintBar({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center justify-between no-print">
      <p className="text-sm text-steel">{title}</p>
      <Button variant="secondary" size="sm" onClick={() => window.print()}>
        <Printer />
        Imprimir formato
      </Button>
    </div>
  );
}

function Sheet({ children }: { children: ReactNode }) {
  return (
    <div className="paper-sheet overflow-x-auto rounded-md border border-navy/20 bg-card p-4 shadow-card sm:p-6">
      {children}
    </div>
  );
}

export function WorkReportSheet({ report, orgName }: { report: WorkReportDetail; orgName: string }) {
  return (
    <Sheet>
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-navy/30 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-steel">Reporte de trabajo</p>
          <h2 className="font-display text-3xl tracking-wide text-navy">{orgName}</h2>
        </div>
        <div className="text-right">
          <p className="font-display text-4xl font-semibold tracking-widest text-navy">{report.area}</p>
          <p className="font-mono text-sm">{formatDate(report.reportDate)}</p>
        </div>
      </div>
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-navy/40 text-[10px] uppercase tracking-wider text-steel">
            <th className="py-1.5 pr-2">No.</th>
            <th className="py-1.5 pr-2">Contenedor</th>
            <th className="py-1.5 pr-2">Clase</th>
            <th className="py-1.5 pr-2">Tamaño</th>
            <th className="py-1.5 pr-2">Naviera</th>
            <th className="py-1.5">Descripción</th>
          </tr>
        </thead>
        <tbody>
          {report.lines.map((line) => (
            <tr key={line.id} className="border-b border-line">
              <td className="py-2 pr-2 font-mono tabular">
                {line.unknownOwnership ? "*" : ""}
                {line.seq}
              </td>
              <td className="py-2 pr-2 font-mono">{formatContainer(line.containerNo)}</td>
              <td className="py-2 pr-2">{line.classCode}</td>
              <td className="py-2 pr-2">{line.sizeCode}</td>
              <td className="py-2 pr-2">{line.naviera}</td>
              <td className="py-2">
                {line.description}
                {line.locCode ? ` (${line.locCode})` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div className="border-t border-navy/30 pt-2 text-sm">
          <p className="font-medium">{report.technicians || "—"}</p>
          <p className="text-[11px] uppercase tracking-wider text-steel">Reparador</p>
        </div>
        <div className="border-t border-navy/30 pt-2 text-sm">
          <p className="font-medium">{report.supervisor || " "}</p>
          <p className="text-[11px] uppercase tracking-wider text-steel">Supervisor</p>
        </div>
      </div>
      {report.notes ? (
        <p className="mt-4 text-xs text-steel">
          * {report.notes}
        </p>
      ) : (
        <p className="mt-4 text-xs text-steel">* Contenedores que no indican merchant o carrier, o no traen etiqueta.</p>
      )}
    </Sheet>
  );
}

export function WarehouseSheet({ entry, orgName }: { entry: WarehouseDetail; orgName: string }) {
  return (
    <Sheet>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-4 border-b border-navy/30 pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-steel">Entrada de almacén</p>
          <p className="font-display text-3xl tracking-wide text-navy">{orgName}</p>
        </div>
        <div className="text-sm">
          <p className="text-[10px] uppercase tracking-wider text-steel">Ubicación</p>
          <p className="font-medium">{entry.locationName || "—"}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-steel">Fecha</p>
          <p className="font-mono">{formatDate(entry.entryDate)}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] uppercase tracking-wider text-steel">Nº</p>
          <p className="font-display text-4xl tracking-wider text-rust">{entry.folio}</p>
        </div>
      </div>
      <p className="mb-2 text-[10px] uppercase tracking-wider text-steel">
        Recibido de: {entry.receivedFrom || "—"} · Remisión: {entry.invoiceRef || "—"}
      </p>
      <table className="w-full min-w-[560px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-navy/40 text-[10px] uppercase tracking-wider text-steel">
            <th className="py-1.5 pr-2">Cantidad</th>
            <th className="py-1.5 pr-2">Unidad</th>
            <th className="py-1.5 pr-2">Código</th>
            <th className="py-1.5">Artículo</th>
          </tr>
        </thead>
        <tbody>
          {entry.materials.map((mat) => (
            <tr key={mat.id} className="border-b border-line">
              <td className="py-2 pr-2 font-mono tabular">{mat.qty}</td>
              <td className="py-2 pr-2">{mat.unit}</td>
              <td className="py-2 pr-2 font-mono">{mat.code}</td>
              <td className="py-2">{mat.article}</td>
            </tr>
          ))}
          {entry.units.map((unit) => (
            <tr key={unit.id} className="border-b border-line">
              <td className="py-2 pr-2 font-mono" colSpan={1}>
                {formatContainer(unit.containerNo)}
              </td>
              <td className="py-2 pr-2">{unit.unitCode}</td>
              <td className="py-2 pr-2">{unit.sizeCode}</td>
              <td className="py-2">
                {unit.naviera} {unit.treatment}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div className="border-t border-navy/30 pt-2 text-sm">
          <p className="text-[11px] uppercase tracking-wider text-steel">Observaciones</p>
          <p>{entry.notes || " "}</p>
        </div>
        <div className="border-t border-navy/30 pt-2 text-sm">
          <p className="font-medium">{entry.receivedBy || "—"}</p>
          <p className="text-[11px] uppercase tracking-wider text-steel">Recibido por</p>
        </div>
      </div>
    </Sheet>
  );
}
