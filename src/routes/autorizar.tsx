import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listPatios, provisionPatio, setPatioAuthorized } from "@/lib/server/developer";
import { getSession } from "@/lib/server/tenant";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Wordmark } from "@/components/mark";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/autorizar")({ component: Page });

function Page() {
  const { user, isPending } = useCurrentUserState();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
    enabled: Boolean(user),
  });

  if (isPending || (user && session.isPending)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-paper">
        <p className="font-display text-2xl tracking-wide text-navy">INSPECTA</p>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;
  if (!session.data?.developer) return <Navigate to="/" />;
  return <Console />;
}

function Console() {
  const qc = useQueryClient();
  const patios = useQuery({ queryKey: ["patios"], queryFn: () => listPatios() });
  const [out, setOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [depot, setDepot] = useState("");
  const [city, setCity] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await provisionPatio({
        data: { name, domain, depot, city, adminName, adminEmail, adminPassword },
      });
      await qc.invalidateQueries({ queryKey: ["patios"] });
      toast.success("Patio autorizado");
      setName("");
      setDomain("");
      setDepot("");
      setCity("");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo autorizar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-paper">
      <header className="border-b border-navy-deep bg-navy text-paper">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Wordmark light />
          <button
            type="button"
            disabled={out}
            onClick={() => {
              setOut(true);
              void signOut("/login").catch(() => setOut(false));
            }}
            className="text-sm text-paper/80 hover:text-paper"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-steel">Desarrollador</p>
          <h1 className="font-display text-4xl tracking-wide text-navy">Autorizar patios</h1>
          <p className="mt-1 text-sm text-steel">
            Alta de empresa, administrador y habilitación. Cada patio recibe su propia base, con la misma
            estructura; lo que cambia se activa por módulos.
          </p>
        </div>

        <form onSubmit={(e) => void onCreate(e)} className="space-y-3 rounded-lg border border-line bg-card p-5 shadow-card">
          <h2 className="font-display text-xl tracking-wide text-navy">Nueva empresa</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Empresa">
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Cerlan" />
            </Field>
            <Field label="Dominio">
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value.toLowerCase())}
                required
                placeholder="cerlan.mx"
                className="font-mono"
              />
            </Field>
            <Field label="Depósito">
              <Input value={depot} onChange={(e) => setDepot(e.target.value)} />
            </Field>
            <Field label="Ciudad">
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field label="Administrador">
              <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
            </Field>
            <Field label="Correo del admin">
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                placeholder="admin@cerlan.mx"
                className="font-mono"
              />
            </Field>
            <Field label="Contraseña del admin">
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando…" : "Autorizar patio"}
          </Button>
        </form>

        <section className="overflow-hidden rounded-lg border border-line bg-card shadow-card">
          <div className="border-b border-line px-5 py-3">
            <h2 className="font-display text-xl tracking-wide text-navy">Patios</h2>
          </div>
          {(patios.data ?? []).length === 0 ? (
            <p className="p-5 text-sm text-steel">Ninguno aún.</p>
          ) : (
            <ul className="divide-y divide-line">
              {(patios.data ?? []).map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-navy">{row.name}</span>
                    <span className="font-mono text-xs text-steel">
                      {row.domain ? `@${row.domain}` : "sin dominio"} · {row.memberCount} persona
                      {row.memberCount === 1 ? "" : "s"}
                    </span>
                  </span>
                  <Badge tone={row.authorized ? "ok" : "warn"}>
                    {row.authorized ? "Autorizado" : "Pendiente"}
                  </Badge>
                  <Button
                    size="sm"
                    variant={row.authorized ? "secondary" : "primary"}
                    onClick={() => {
                      void setPatioAuthorized({ data: { orgId: row.id, authorized: !row.authorized } })
                        .then(async () => {
                          await qc.invalidateQueries({ queryKey: ["patios"] });
                          toast.success(row.authorized ? "Patio deshabilitado" : "Patio autorizado");
                        })
                        .catch((err: unknown) =>
                          toast.error(err instanceof Error ? err.message : "Error"),
                        );
                    }}
                  >
                    {row.authorized ? "Revocar" : "Autorizar"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
