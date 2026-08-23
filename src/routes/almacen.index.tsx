import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listWarehouse } from "@/lib/server/warehouse";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/almacen/")({ component: List });

function List() {
  const q = useQuery({ queryKey: ["almacen"], queryFn: () => listWarehouse() });
  const rows = q.data ?? [];
  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-steel">Pintura</p>
          <h1 className="font-display text-4xl tracking-wide text-navy">Entradas de almacén</h1>
          <p className="mt-1 text-sm text-steel">Folio, material y unidades acondicionadas.</p>
        </div>
        <Link to="/almacen/nuevo" className="text-sm font-medium text-teal-dark">
          Nueva entrada
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-card shadow-card">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-steel">Sin entradas aún.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id}>
                <Link to="/almacen/$id" params={{ id: r.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-paper">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-navy">Folio {r.folio}</span>
                    <span className="text-xs text-steel">
                      {r.locationName || "Almacén"} · {r.receivedBy} · {r.unitCount} unidades
                    </span>
                  </span>
                  <span className="font-mono text-xs text-steel">{formatDate(r.entryDate)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
