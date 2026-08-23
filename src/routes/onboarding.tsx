import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getSession } from "@/lib/server/tenant";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/mark";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
  const { user, isPending } = useCurrentUserState();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
    enabled: Boolean(user),
  });
  const [out, setOut] = useState(false);

  if (isPending || (user && session.isPending)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-paper">
        <p className="font-display text-2xl tracking-wide text-navy">INSPECTA</p>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;
  if (session.data?.developer) return <Navigate to="/autorizar" />;
  if (session.data?.membership?.authorized) return <Navigate to="/" />;
  if (session.data?.membership && !session.data.membership.authorized) {
    return <Navigate to="/" />;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <Wordmark />
      <h1 className="mt-6 font-display text-4xl tracking-wide text-navy">Sin patio asignado</h1>
      <p className="mt-2 text-sm text-steel">
        No se crean cuentas ni empresas desde aquí. El desarrollador autoriza el patio y el
        administrador da de alta a cada persona.
      </p>
      <Button
        className="mt-6"
        variant="secondary"
        disabled={out}
        onClick={() => {
          setOut(true);
          void signOut("/login").catch(() => setOut(false));
        }}
      >
        Cerrar sesión
      </Button>
    </main>
  );
}
