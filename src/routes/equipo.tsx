import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { ALL_ROLES, MODULES, ROLE_LABEL, type Role } from "@/lib/catalog";
import { formatMoney, type BillingSnapshot } from "@/lib/billing";
import { getSession, listTeam, setModules, updateMemberRole, updateOrg, addTeamUser } from "@/lib/server/tenant";
import { formatDate } from "@/lib/utils";
import type { Membership } from "@/lib/types";

export const Route = createFileRoute("/equipo")({ component: Page });

function Page() {
  return (
    <Protected>
      <Equipo />
    </Protected>
  );
}

function Equipo() {
  const session = useQuery({ queryKey: ["session"], queryFn: () => getSession() });
  const m = session.data?.membership;
  if (!m) return null;
  return <EquipoForm key={m.orgId} membership={m} billing={session.data?.billing ?? null} />;
}

function EquipoForm({
  membership,
  billing,
}: {
  membership: Membership;
  billing: BillingSnapshot | null;
}) {
  const qc = useQueryClient();
  const team = useQuery({ queryKey: ["team"], queryFn: () => listTeam() });
  const [name, setName] = useState(membership.orgName);
  const [depot, setDepot] = useState(membership.depot);
  const [city, setCity] = useState(membership.city);
  const [mods, setMods] = useState(membership.modules);
  const domain = membership.emailDomain;
  const [personName, setPersonName] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [personPassword, setPersonPassword] = useState("");
  const [personRole, setPersonRole] = useState<Role>("inspector");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-steel">Empresa</p>
        <h1 className="font-display text-4xl tracking-wide text-navy">Equipo y módulos</h1>
        <p className="mt-1 text-sm text-steel">
          El correo decide el patio: admin@{domain || "empresa.mx"} no se mezcla con otra empresa.
        </p>
      </div>

      <section className="rounded-lg border border-line bg-card p-5 shadow-card">
        <p className="text-xs font-medium uppercase tracking-wider text-steel">Dominio de la empresa</p>
        <p className="mt-1 font-mono text-3xl tracking-wide text-navy">
          {domain ? `@${domain}` : "Sin dominio"}
        </p>
        <p className="mt-1 text-xs text-steel">
          {domain
            ? `Quien entra con correo @${domain} llega a este patio. La operación vive en su propia base; el administrador da de alta a cada persona.`
            : "Asigne correos de la empresa (admin@su-patio.mx) para aislar el patio por usuario."}
        </p>
      </section>

      {billing ? (
        <section className="rounded-lg border border-line bg-card p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-steel">Plan mensual</p>
          <p className="mt-1 font-display text-3xl tracking-wide text-navy">
            {formatMoney(billing.amountCentavos, billing.currency)}
          </p>
          <p className="mt-1 text-sm text-steel">
            {billing.status === "active"
              ? `Vigente hasta ${formatDate(billing.periodEnd)}.`
              : billing.status === "due"
                ? `Venció el ${formatDate(billing.periodEnd)}. Quedan ${billing.daysLeftInGrace} día${billing.daysLeftInGrace === 1 ? "" : "s"} de gracia.`
                : `Suspendido desde ${formatDate(billing.graceUntil)}. El patio se reanuda al pagar.`}
          </p>
          {billing.status !== "active" ? (
            <Link
              to="/pago"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-teal-dark hover:underline"
            >
              Pagar ahora
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3 rounded-lg border border-line bg-card p-5 shadow-card">
        <Field label="Empresa">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Depósito">
          <Input value={depot} onChange={(e) => setDepot(e.target.value)} />
        </Field>
        <Field label="Ciudad">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Button
          variant="navy"
          onClick={() => {
            void updateOrg({ data: { name, depot, city } })
              .then(async () => {
                await qc.invalidateQueries({ queryKey: ["session"] });
                toast.success("Empresa actualizada");
              })
              .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Error"));
          }}
        >
          Guardar empresa
        </Button>
      </section>

      <section className="rounded-lg border border-line bg-card p-5 shadow-card">
        <h2 className="font-display text-xl tracking-wide text-navy">Módulos activos</h2>
        <ul className="mt-3 space-y-3">
          {MODULES.map((mod) => (
            <li key={mod.key} className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-teal"
                checked={mods[mod.key]}
                onChange={(e) => setMods((x) => ({ ...x, [mod.key]: e.target.checked }))}
              />
              <span>
                <span className="block font-medium text-navy">{mod.label}</span>
                <span className="text-xs text-steel">{mod.blurb}</span>
              </span>
            </li>
          ))}
        </ul>
        <Button
          className="mt-4"
          onClick={() => {
            void setModules({ data: mods })
              .then(async () => {
                await qc.invalidateQueries({ queryKey: ["session"] });
                toast.success("Módulos actualizados");
              })
              .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Error"));
          }}
        >
          Guardar módulos
        </Button>
      </section>

      <section className="rounded-lg border border-line bg-card p-5 shadow-card">
        <h2 className="font-display text-xl tracking-wide text-navy">Personas</h2>
        <p className="mt-1 text-sm text-steel">Alta interna. No hay registro público.</p>
        {membership.role === "admin" ? (
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void addTeamUser({
                data: {
                  name: personName,
                  email: personEmail,
                  password: personPassword,
                  role: personRole,
                },
              })
                .then(async () => {
                  await qc.invalidateQueries({ queryKey: ["team"] });
                  toast.success("Persona dada de alta");
                  setPersonName("");
                  setPersonEmail("");
                  setPersonPassword("");
                })
                .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Error"));
            }}
          >
            <Field label="Nombre">
              <Input value={personName} onChange={(e) => setPersonName(e.target.value)} required />
            </Field>
            <Field label="Correo">
              <Input
                type="email"
                value={personEmail}
                onChange={(e) => setPersonEmail(e.target.value)}
                required
                placeholder={domain ? `nombre@${domain}` : "correo"}
                className="font-mono"
              />
            </Field>
            <Field label="Contraseña">
              <Input
                type="password"
                value={personPassword}
                onChange={(e) => setPersonPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <Field label="Rol">
              <NativeSelect value={personRole} onChange={(e) => setPersonRole(e.target.value as Role)}>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit">Dar de alta</Button>
            </div>
          </form>
        ) : null}
        <ul className="mt-3 divide-y divide-line">
          {(team.data ?? []).map((row) => (
            <li key={row.userId} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{row.displayName || "Sin nombre"}</span>
                {row.email ? <span className="block font-mono text-xs text-steel">{row.email}</span> : null}
              </span>
              <NativeSelect
                value={row.role}
                className="max-w-48"
                onChange={(e) => {
                  void updateMemberRole({ data: { userId: row.userId, role: e.target.value as Role } })
                    .then(async () => {
                      await qc.invalidateQueries({ queryKey: ["team"] });
                      toast.success("Rol actualizado");
                    })
                    .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Error"));
                }}
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </NativeSelect>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
