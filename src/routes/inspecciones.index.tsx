import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { listInspections } from "@/lib/server/inspections";
import { formatContainer } from "@/lib/iso6346";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/inspecciones/")({ component: List });

function List() {
  const q = useQuery({ queryKey: ["inspections"], queryFn: () => listInspections() });
  const rows = q.data ?? [];
  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-steel">Patio</p>
          <h1 className="font-display text-4xl tracking-wide text-navy">Inspecciones</h1>
          <p className="mt-1 text-sm text-steel">Número, fotos y daño si lo hay.</p>
        </div>
        <Link to="/nueva" className="text-sm font-medium text-teal-dark">
          Nueva
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-card shadow-card">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-steel">Aún no hay folios de patio.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id}>
                <Link to="/inspecciones/$id" params={{ id: r.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-paper">
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-sm">{formatContainer(r.containerNo)}</span>
                    <span className="text-xs text-steel">
                      {r.sizeCode} · {r.naviera} · {r.inspectorName}
                    </span>
                  </span>
                  {r.missingLabel ? <Badge tone="warn">Sin etiqueta</Badge> : null}
                  {r.primaryDamage ? <Badge>{r.primaryDamage}</Badge> : null}
                  <span className="text-xs text-steel">{formatDate(r.inspectedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
