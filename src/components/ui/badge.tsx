import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "steel",
  className,
}: {
  children: ReactNode;
  tone?: "steel" | "teal" | "ok" | "warn" | "navy" | "rust";
  className?: string;
}) {
  const tones: Record<string, string> = {
    steel: "bg-paper-2 text-steel",
    teal: "bg-teal-soft text-teal-dark",
    navy: "bg-navy/10 text-navy",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    rust: "bg-rust-soft text-rust",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
