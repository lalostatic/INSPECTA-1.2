import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { skipStorageKey } from "@/lib/billing";
import { getSession } from "@/lib/server/tenant";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "./app-shell";

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
  const membership = session.data?.membership;
  if (!membership) return <Navigate to="/onboarding" />;

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
