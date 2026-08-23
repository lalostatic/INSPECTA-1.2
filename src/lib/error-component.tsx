import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-6 text-center text-ink">
      <span className="text-rust" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-2xl tracking-wide text-navy">Algo salió mal</h1>
      <p className="max-w-md text-sm break-words text-steel">
        {error.message || "Ocurrió un error inesperado. Recargue la página."}
      </p>
    </main>
  );
}
