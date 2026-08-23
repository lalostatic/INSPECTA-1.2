import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, ChevronRight, PaintBucket, Search, Wrench } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MODULES } from "@/lib/catalog";
import { getSession } from "@/lib/server/tenant";
import { getYardStats } from "@/lib/server/stats";
import { formatContainer, normalizeContainer } from "@/lib/iso6346";
import { canCreateInspection, canSeeModule, canWorkMr, canWorkPaint } from "@/lib/roles";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <Protected>
      <Dashboard />
    </Protected>
  );
}

function Dashboard() {
  const nav = useNavigate();
  const session = useQuery({ queryKey: ["session"], queryFn: () => getSession() });
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => getYardStats() });
  const m = session.data?.membership;
  const [q, setQ] = useState("");

  function lookup(e: FormEvent) {
    e.preventDefault();
    const no = normalizeContainer(q);
    if (no.length < 6) return;
    void nav({ to: "/unidad/$no", params: { no } });
  }

  if (!m) return null;
  const s = stats.data;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-steel">{m.orgName}</p>
        <h1 className="font-display text-4xl tracking-wide text-navy">Operación del patio</h1>
        <p className="mt-1 max-w-2xl text-sm text-steel">Inspección, M&R y pintura de su empresa.</p>
      </div>

      <form onSubmit={lookup} className="flex gap-2">
        <Input
          value={formatContainer(q)}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar contenedor · HLBU 235249 0"
          className="font-mono"
        />
        <Button type="submit" variant="navy">
          <Search />
          Expediente
        </Button>
      </form>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Inspecciones hoy" value={s?.inspectionsToday ?? 0} />
        <Stat label="Unidades en M&R hoy" value={s?.mrToday ?? 0} />
        <Stat label="Acondicionadas hoy" value={s?.paintToday ?? 0} />
      </section>
      {(s?.unknownOwnership ?? 0) > 0 ? (
        <p className="text-sm text-warn">
          {s?.unknownOwnership} unidades sin merchant/carrier o sin etiqueta.
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {MODULES.map((mod) => {
          const on = m.modules[mod.key] && canSeeModule(m.role, mod.key);
          if (!m.modules[mod.key]) return null;
          const href: "/nueva" | "/inspecciones" | "/mr/nuevo" | "/mr" | "/almacen/nuevo" | "/almacen" =
            mod.key === "inspeccion"
              ? canCreateInspection(m.role)
                ? "/nueva"
                : "/inspecciones"
              : mod.key === "mr"
                ? canWorkMr(m.role)
                  ? "/mr/nuevo"
                  : "/mr"
                : canWorkPaint(m.role)
                  ? "/almacen/nuevo"
                  : "/almacen";
          const Icon = mod.key === "inspeccion" ? Camera : mod.key === "mr" ? Wrench : PaintBucket;
          return (
            <Link
              key={mod.key}
              to={href}
              className="group rounded-lg border border-line bg-card p-5 shadow-card transition-colors hover:border-teal/40"
            >
              <Icon className="size-5 text-teal" />
              <h2 className="mt-3 font-display text-2xl tracking-wide text-navy">{mod.label}</h2>
              <p className="mt-1 text-sm text-steel">{mod.blurb}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal-dark">
                {on ? "Abrir" : "Consulta"}
                <ChevronRight className="size-4" />
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-card p-4 shadow-card">
      <p className="text-[11px] font-medium uppercase tracking-wider text-steel">{label}</p>
      <p className="mt-1 font-display text-4xl tabular tracking-wide text-navy">{value}</p>
    </div>
  );
}
