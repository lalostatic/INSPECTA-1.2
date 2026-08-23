import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState, type AppUser } from "@/lib/auth/use-current-user";
import { createOrg, getSession, joinOrg } from "@/lib/server/tenant";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Wordmark } from "@/components/mark";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
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
  if (session.data?.membership) return <Navigate to="/" />;
  return <OnboardingForm user={user} />;
}

function OnboardingForm({ user }: { user: AppUser }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [depot, setDepot] = useState("Bahía Principal");
  const [city, setCity] = useState("");
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "create") {
        await createOrg({
          data: { name, depot, city, displayName: displayName || user.displayName || "Admin" },
        });
      } else {
        await joinOrg({
          data: { code, displayName: displayName || user.displayName || "Inspector" },
        });
      }
      await qc.invalidateQueries({ queryKey: ["session"] });
      toast.success("Empresa lista");
      await nav({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo continuar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <Wordmark />
      <h1 className="mt-6 font-display text-4xl tracking-wide text-navy">Su patio en INSPECTA</h1>
      <p className="mt-2 text-sm text-steel">
        Con correo de empresa entra directo: admin@cerlan.mx y admin@contri.mx son patios distintos. Esta
        pantalla es para Gmail y correos personales.
      </p>
      <div className="mt-6 flex gap-2">
        <Button variant={tab === "create" ? "navy" : "secondary"} size="sm" onClick={() => setTab("create")}>
          Crear empresa
        </Button>
        <Button variant={tab === "join" ? "navy" : "secondary"} size="sm" onClick={() => setTab("join")}>
          Unirme con código
        </Button>
      </div>
      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-3 rounded-lg border border-line bg-card p-5 shadow-card">
        <Field label="Su nombre">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="María Solís" required />
        </Field>
        {tab === "create" ? (
          <>
            <Field label="Nombre de la empresa / patio">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cerlan" required />
            </Field>
            <Field label="Depósito">
              <Input value={depot} onChange={(e) => setDepot(e.target.value)} />
            </Field>
            <Field label="Ciudad">
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="CDMX" />
            </Field>
          </>
        ) : (
          <Field label="Código de invitación">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono tracking-widest"
              placeholder="K7M2PQ"
              required
            />
          </Field>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Guardando…" : tab === "create" ? "Abrir patio" : "Unirme"}
        </Button>
      </form>
    </main>
  );
}
