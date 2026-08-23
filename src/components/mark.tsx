import { cn } from "@/lib/utils";

export function InspectaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="7" className="fill-navy" />
      <rect x="6" y="6" width="20" height="6" className="fill-teal" />
      <rect x="6" y="13" width="20" height="6" className="fill-paper" />
      <rect x="6" y="20" width="20" height="6" className="fill-rust" />
      <rect x="22" y="7.5" width="2" height="3" className="fill-navy" />
      <rect x="22" y="14.5" width="2" height="3" className="fill-navy" />
      <rect x="22" y="21.5" width="2" height="3" className="fill-navy" />
    </svg>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <InspectaMark />
      <span
        className={cn(
          "font-display block text-xl font-semibold tracking-[0.16em]",
          light ? "text-paper" : "text-navy",
        )}
      >
        INSPECTA
      </span>
    </span>
  );
}
