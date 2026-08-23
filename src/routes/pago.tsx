import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Lock, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  clearBillingSkip,
  formatCardNumber,
  formatExpiryInput,
  formatMoney,
  skipStorageKey,
  type BillingSnapshot,
} from "@/lib/billing";
import { payMonthly } from "@/lib/server/billing";
import { getSession } from "@/lib/server/tenant";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Wordmark } from "@/components/mark";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/pago")({ component: PagoPage });

function PagoPage() {
  const { user, isPending } = useCurrentUserState();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
    enabled: Boolean(user),
  });

  if (isPending || (user && session.isPending)) {
    return (
      <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-navy px-5">
        <img src="/login-hero.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-navy/70" />
        <div className="relative">
          <Wordmark light />
        </div>
      </main>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;
  if (!session.data?.membership) return <Navigate to="/onboarding" />;
  const billing = session.data.billing;
  if (!billing?.needsPaywall) return <Navigate to="/" />;
  return (
    <Checkout
      membershipName={session.data.membership.orgName}
      orgId={session.data.membership.orgId}
      billing={billing}
    />
  );
}

function Checkout({
  membershipName,
  orgId,
  billing,
}: {
  membershipName: string;
  orgId: string;
  billing: BillingSnapshot;
}) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(false);
  const [error, setError] = useState("");

  async function onPay(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await payMonthly({ data: { holder, number, expiry, cvc } });
      await qc.invalidateQueries({ queryKey: ["session"] });
      await nav({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cobrar");
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    if (!billing?.canSkip) return;
    sessionStorage.setItem(skipStorageKey(orgId, billing.periodEnd), "1");
    void nav({ to: "/" });
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-navy text-paper">
      <img src="/login-hero.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-deep/92 via-navy/78 to-navy/40" />

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10 pb-24">
        <div className="flex items-start justify-between gap-3">
          <Wordmark light />
          <button
            type="button"
            disabled={out}
            onClick={() => {
              setOut(true);
              clearBillingSkip();
              void signOut("/login").catch(() => setOut(false));
            }}
            className="grid size-11 place-items-center rounded-sm text-paper/70 hover:bg-paper/10 hover:text-paper"
            aria-label="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => void onPay(e)}
          className="mt-8 space-y-4 rounded-xl border border-line bg-card p-6 text-ink shadow-card"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-steel">Plan mensual</p>
            <h1 className="mt-1 font-display text-3xl tracking-wide text-navy">{membershipName}</h1>
            <p className="mt-1 text-sm text-steel">
              {billing.status === "suspended"
                ? "Los 7 días de gracia vencieron. El patio queda bloqueado hasta el pago."
                : `Venció el ${formatDate(billing.periodEnd)}. Quedan ${billing.daysLeftInGrace} día${billing.daysLeftInGrace === 1 ? "" : "s"} de gracia.`}
            </p>
          </div>

          <div className="flex items-end justify-between rounded-md bg-paper px-4 py-3">
            <span className="text-sm text-steel">INSPECTA · IVA incluido</span>
            <span className="font-display text-3xl tracking-wide text-navy">
              {formatMoney(billing.amountCentavos, billing.currency)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-steel">
            <Lock className="size-3.5" />
            Pago seguro · no se guarda el número completo de la tarjeta
          </div>

          <Field label="Nombre en la tarjeta">
            <Input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              autoComplete="cc-name"
              required
              placeholder="Como aparece en la tarjeta"
            />
          </Field>
          <Field label="Número de tarjeta">
            <div className="relative">
              <Input
                value={number}
                onChange={(e) => setNumber(formatCardNumber(e.target.value))}
                inputMode="numeric"
                autoComplete="cc-number"
                required
                placeholder="ACCT-000015"
                className="pr-10 font-mono"
              />
              <CreditCard className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-steel" />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vence">
              <Input
                value={expiry}
                onChange={(e) => setExpiry(formatExpiryInput(e.target.value))}
                inputMode="numeric"
                autoComplete="cc-exp"
                required
                placeholder="MM/AA"
                className="font-mono"
              />
            </Field>
            <Field label="CVC">
              <Input
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                autoComplete="cc-csc"
                required
                placeholder="123"
                className="font-mono"
              />
            </Field>
          </div>

          {error ? <p className="text-sm text-rust">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Procesando…" : `Pagar ${formatMoney(billing.amountCentavos, billing.currency)}`}
          </Button>

          {billing.canSkip ? (
            <button
              type="button"
              className="w-full min-h-11 text-center text-sm text-steel hover:text-navy"
              onClick={skip}
            >
              Omitir por ahora · {billing.daysLeftInGrace} día{billing.daysLeftInGrace === 1 ? "" : "s"} de gracia
            </button>
          ) : (
            <p className="text-center text-xs text-steel">Sin opción de omitir. El acceso se reanuda al pagar.</p>
          )}
        </form>
      </div>
    </main>
  );
}
