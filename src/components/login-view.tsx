import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { clearBillingSkip } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Wordmark } from "@/components/mark";

const DEV_HANDLE = "@lalostatic";
const DEV_GITHUB = "https://github.com/lalostatic";
const DEV_WHATSAPP = "https://wa.me/525526594919";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12.04 2c-5.46 0-9.91 4.43-9.91 9.9 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9C21.95 6.44 17.5 2 12.04 2zm5.79 14.13c-.24.68-1.4 1.3-1.94 1.34-.5.04-1.12.06-1.81-.11-.42-.11-.95-.31-1.63-.61-2.86-1.24-4.72-4.12-4.86-4.31-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07.99-2.35.26-.28.57-.35.76-.35h.54c.17 0 .4-.02.62.48.24.54.8 1.96.87 2.1.07.14.12.31.02.5-.1.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.56.16.28.7 1.16 1.5 1.88 1.04.93 1.91 1.22 2.18 1.36.27.14.43.12.59-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.61-.13.25.09 1.57.74 1.84.88.27.13.45.2.51.31.07.11.07.64-.17 1.32z"
      />
    </svg>
  );
}

export function LoginView() {
  const { user, isPending } = useCurrentUserState();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) throw new Error(res.error.message || "Correo o contraseña incorrectos");
      clearBillingSkip();
      await nav({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
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
  if (user) return <Navigate to="/" />;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-navy text-paper">
      <img src="/login-hero.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-deep/92 via-navy/78 to-navy/40" />

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10 pb-28">
        <Wordmark light />

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="mt-8 space-y-3 rounded-xl border border-line bg-card p-6 text-ink shadow-card"
        >
          <h1 className="font-display text-3xl tracking-wide text-navy">Iniciar sesión</h1>
          <Field label="Correo">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="admin@su-empresa.mx"
            />
          </Field>
          <Field label="Contraseña">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              minLength={8}
            />
          </Field>
          {error ? <p className="text-sm text-rust">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>

      <p className="absolute bottom-5 right-5 z-10 flex items-center gap-2 text-xs text-paper/80">
        <span>desarrollado por {DEV_HANDLE}</span>
        <a
          href={DEV_GITHUB}
          target="_blank"
          rel="noreferrer"
          className="grid size-8 place-items-center rounded-sm text-paper/80 hover:bg-paper/10 hover:text-paper"
          aria-label="GitHub de lalostatic"
        >
          <Github className="size-4" />
        </a>
        <a
          href={DEV_WHATSAPP}
          target="_blank"
          rel="noreferrer"
          className="grid size-8 place-items-center rounded-sm text-paper/80 hover:bg-paper/10 hover:text-paper"
          aria-label="WhatsApp de lalostatic"
        >
          <WhatsAppIcon className="size-4" />
        </a>
      </p>
    </main>
  );
}
