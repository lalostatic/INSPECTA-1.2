import { RedirectToSignIn } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { skipStorageKey } from "@/lib/billing";
import { getSession } from "@/lib/server/tenant";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { AppShell } from "./app-shell";
import { Wordmark } from "./mark";
import { Button } from "./ui/button";

export function Protected({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
    enabled: Boolean(user),
  });

  if (isPending) {
    return (
      <div className="min-h-dvh bg-paper">
        <div className="h-14 bg-navy" />
        <div className="mx-auto max-w-7xl px-4 pt-10">
          <p className="font-display text-2xl tracking-wide text-navy">INSPECTA</p>
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;
  if (session.isPending) {
    return (
      <div className="min-h-dvh bg-paper">
        <div className="h-14 bg-navy" />
        <div className="mx-auto max-w-7xl px-4 pt-8">
          <div className="h-8 w-48 animate-pulse rounded-md bg-paper-2" />
        </div>
      </div>
    );
  }

  const developer = Boolean(session.data?.developer);
  const membership = session.data?.membership;

  if (developer && (path === "/autorizar" || !membership)) {
    if (path !== "/autorizar") return <Navigate to="/autorizar" />;
    return <>{children}</>;
  }

  if (!membership) return <Navigate to="/onboarding" />;
  if (!membership.authorized) return <PendingAuth name={membership.orgName} />;

  const billing = session.data?.billing;
  if (billing?.needsPaywall && path !== "/pago") {
    if (billing.status === "suspended") return <Navigate to="/pago" />;
    const skipped =
      typeof window !== "undefined" &&
      sessionStorage.getItem(skipStorageKey(membership.orgId, billing.periodEnd)) === "1";
    if (!skipped) return <Navigate to="/pago" />;
  }

  return (
    <AppShell membership={membership} billing={billing ?? null}>
      {children}
    </AppShell>
  );
}

function PendingAuth({ name }: { name: string }) {
  const [out, setOut] = useState(false);
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-5">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-line bg-card p-6 shadow-card">
        <Wordmark />
        <h1 className="font-display text-3xl tracking-wide text-navy">{name}</h1>
        <p className="text-sm text-steel">
          Este patio está dado de alta pero aún no está autorizado. El desarrollador de INSPECTA debe
          habilitarlo para operar.
        </p>
        <Button
          variant="secondary"
          className="w-full"
          disabled={out}
          onClick={() => {
            setOut(true);
            void signOut("/login").catch(() => setOut(false));
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </main>
  );
}
