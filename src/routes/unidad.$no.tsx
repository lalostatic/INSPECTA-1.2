import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Protected } from "@/components/protected";
import { Badge } from "@/components/ui/badge";
import { getUnitTimeline } from "@/lib/server/units";
import type { UnitEvent } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/unidad/$no")({ component: Page });

function Page() {
  return (
    <Protected>
      <Timeline />
    </Protected>
  );
}

function Timeline() {
  const { no } = Route.useParams();
  const q = useQuery({ queryKey: ["unit", no], queryFn: () => getUnitTimeline({ data: { no } }) });
  const data = q.data;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-steel">Expediente</p>
      <h1 className="font-display text-4xl tracking-wide text-navy">{data?.containerNo ?? no}</h1>
      <p className="mt-1 text-sm text-steel">Historial de esta unidad.</p>
      <ol className="mt-6 space-y-3">
        {(data?.events ?? []).length === 0 && !q.isPending ? (
          <li className="rounded-lg border border-line bg-card p-5 text-sm text-steel">Sin movimientos registrados.</li>
        ) : null}
        {(data?.events ?? []).map((ev) => (
          <li key={`${ev.kind}-${ev.id}`}>
            <EventCard ev={ev} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function EventCard({ ev }: { ev: UnitEvent }) {
  const inner = (
    <>
      <div className="flex items-center gap-2">
        <Badge tone={ev.kind === "mr" ? "warn" : ev.kind === "pintura" ? "teal" : "navy"}>
          {ev.kind === "mr" ? "M&R" : ev.kind === "pintura" ? "Pintura" : "Inspección"}
        </Badge>
        <span className="text-xs text-steel">{formatDate(ev.at)}</span>
      </div>
      <p className="mt-2 font-medium text-navy">{ev.title}</p>
      <p className="text-sm text-steel">{ev.body}</p>
    </>
  );
  const cls = "block rounded-lg border border-line bg-card p-4 shadow-card hover:border-teal/40";
  if (ev.kind === "inspeccion") {
    return (
      <Link to="/inspecciones/$id" params={{ id: ev.id }} className={cls}>
        {inner}
      </Link>
    );
  }
  if (ev.kind === "mr") {
    return (
      <Link to="/mr/$id" params={{ id: ev.id }} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <Link to="/almacen/$id" params={{ id: ev.id }} className={cls}>
      {inner}
    </Link>
  );
}
