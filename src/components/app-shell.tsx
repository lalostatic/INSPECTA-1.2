import { Link, useRouterState } from "@tanstack/react-router";
import { Camera, ClipboardList, LayoutDashboard, LogOut, PaintBucket, Users, Wrench } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import type { BillingSnapshot } from "@/lib/billing";
import { clearBillingSkip } from "@/lib/billing";
import { ROLE_LABEL } from "@/lib/catalog";
import { canSeeModule } from "@/lib/roles";
import type { Membership } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { Wordmark } from "./mark";

export function AppShell({
  membership,
  billing,
  children,
}: {
  membership: Membership;
  billing?: BillingSnapshot | null;
  children: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const user = useCurrentUser();
  const [out, setOut] = useState(false);
  const name = membership.displayName || user?.displayName || user?.primaryEmail || "Cuenta";

  const nav = useMemo(() => {
    const items: { to: string; label: string; icon: typeof LayoutDashboard; match: (p: string) => boolean }[] = [
      { to: "/", label: "Inicio", icon: LayoutDashboard, match: (p) => p === "/" },
    ];
    if (membership.modules.inspeccion && canSeeModule(membership.role, "inspeccion")) {
      items.push({
        to: "/nueva",
        label: "Inspección",
        icon: Camera,
        match: (p) => p.startsWith("/nueva") || p.startsWith("/inspecciones"),
      });
    }
    if (membership.modules.mr && canSeeModule(membership.role, "mr")) {
      items.push({ to: "/mr", label: "M&R", icon: Wrench, match: (p) => p.startsWith("/mr") });
    }
    if (membership.modules.pintura && canSeeModule(membership.role, "pintura")) {
      items.push({
        to: "/almacen",
        label: "Pintura",
        icon: PaintBucket,
        match: (p) => p.startsWith("/almacen"),
      });
    }
    if (membership.role === "office" || membership.role === "admin") {
      if (!items.some((i) => i.to === "/inspecciones") && membership.modules.inspeccion) {
        items.push({
          to: "/inspecciones",
          label: "Folios",
          icon: ClipboardList,
          match: (p) => p.startsWith("/inspecciones"),
        });
      }
    }
    if (membership.role === "admin") {
      items.push({ to: "/equipo", label: "Equipo", icon: Users, match: (p) => p.startsWith("/equipo") });
    }
    return items.slice(0, 5);
  }, [membership]);

  const cols =
    nav.length <= 2 ? "grid-cols-2" : nav.length === 3 ? "grid-cols-3" : nav.length === 4 ? "grid-cols-4" : "grid-cols-5";

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-navy-deep bg-navy text-paper no-print">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <Link to="/" className="shrink-0">
            <Wordmark light />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors",
                  item.match(path) ? "bg-paper/10 text-paper" : "text-paper/70 hover:bg-paper/5 hover:text-paper",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <div className="max-lg:hidden text-right">
              <div className="text-xs font-medium leading-tight">{name}</div>
              <div className="text-[10px] uppercase tracking-wider text-paper/55">
                {ROLE_LABEL[membership.role]} · {membership.orgName}
              </div>
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-teal text-xs font-semibold text-paper">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="" className="size-9 rounded-full object-cover" />
              ) : (
                initials(name)
              )}
            </div>
            <button
              type="button"
              disabled={out}
              onClick={() => {
                setOut(true);
                clearBillingSkip();
                void signOut("/login").catch(() => setOut(false));
              }}
              className="grid size-9 place-items-center rounded-sm text-paper/70 hover:bg-paper/10 hover:text-paper"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {billing?.status === "due" ? (
        <div className="border-b border-warn/25 bg-warn-soft text-ink no-print">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
            <p>
              Mensualidad vencida. Quedan {billing.daysLeftInGrace} día
              {billing.daysLeftInGrace === 1 ? "" : "s"} de gracia.
            </p>
            <Link to="/pago" className="font-medium text-navy underline-offset-2 hover:underline">
              Pagar ahora
            </Link>
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 md:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur md:hidden no-print">
        <div className={cn("mx-auto grid max-w-lg px-1 pb-[env(safe-area-inset-bottom)]", cols)}>
          {nav.map((item) => {
            const active = item.match(path);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-teal-dark" : "text-steel",
                )}
              >
                <item.icon className={cn("size-5", active && "text-teal")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
