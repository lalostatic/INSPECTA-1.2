import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { listWorkReports } from "@/lib/server/work-reports";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/mr/")({ component: List });

function List() {
  const q = useQuery({ queryKey: ["mr"], queryFn: () => listWorkReports() });
  const rows = q.data ?? [];
  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-steel">Taller</p>
          <h1 className="font-display text-4xl tracking-wide text-navy">Reportes de trabajo</h1>
          <p className="mt-1 text-sm text-steel">Fecha, unidades y trabajo del día.</p>
        </div>
        <Link to="/mr/nuevo" className="text-sm font-medium text-teal-dark">
          Nuevo reporte
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-card shadow-card">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-steel">Sin reportes aún.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id}>
                <Link to="/mr/$id" params={{ id: r.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-paper">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-navy">
                      {r.area} · {formatDate(r.reportDate)}
                    </span>
                    <span className="text-xs text-steel">
                      {r.technicians || "Sin firmar"} · {r.lineCount} unidades
                    </span>
                  </span>
                  <Badge tone={r.status === "cerrado" ? "ok" : "warn"}>{r.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
