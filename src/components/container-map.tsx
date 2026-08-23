import { Camera, Check } from "lucide-react";
import { useState } from "react";
import {
  INSPECT_VIEWS,
  captureKey,
  pointsForView,
  withLateralSide,
  type InspectPoint,
  type InspectViewId,
  type LateralSide,
} from "@/lib/inspect-points";
import { cn } from "@/lib/utils";

export type CapturedPoint = {
  thumb?: string;
};

function capOf(
  p: InspectPoint,
  captured: Record<string, CapturedPoint>,
  view: InspectViewId,
  side: LateralSide,
) {
  if (view === "lateral") {
    return captured[captureKey(p.id, side)] ?? captured[p.id];
  }
  return captured[p.id];
}

function capturedCount(view: InspectViewId, captured: Record<string, CapturedPoint>) {
  const pts = pointsForView(view);
  if (view === "lateral") {
    return pts.filter(
      (p) =>
        captured[captureKey(p.id, "izquierdo")]?.thumb ||
        captured[captureKey(p.id, "derecho")]?.thumb ||
        captured[p.id]?.thumb,
    ).length;
  }
  return pts.filter((p) => captured[p.id]?.thumb).length;
}

export function ContainerMap({
  captured = {},
  selectedId,
  onPick,
  view: viewProp,
  onViewChange,
  initialView,
  side: sideProp,
  onSideChange,
}: {
  captured?: Record<string, CapturedPoint>;
  selectedId?: string;
  onPick: (point: InspectPoint, side: LateralSide) => void;
  view?: InspectViewId;
  onViewChange?: (view: InspectViewId) => void;
  initialView?: InspectViewId;
  side?: LateralSide;
  onSideChange?: (side: LateralSide) => void;
}) {
  const [inner, setInner] = useState<InspectViewId>(viewProp ?? initialView ?? "puertas");
  const [innerSide, setInnerSide] = useState<LateralSide>(sideProp ?? "derecho");
  const view = viewProp ?? inner;
  const side = sideProp ?? innerSide;
  const meta = INSPECT_VIEWS.find((v) => v.id === view) ?? INSPECT_VIEWS[0];
  const points = pointsForView(view);

  function setView(next: InspectViewId) {
    setInner(next);
    onViewChange?.(next);
  }

  function setSide(next: LateralSide) {
    setInnerSide(next);
    onSideChange?.(next);
  }

  function labelOf(p: InspectPoint) {
    return view === "lateral" ? withLateralSide(p, side).label : p.label;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-md bg-paper-2 p-1">
        {INSPECT_VIEWS.map((v) => {
          const n = capturedCount(v.id, captured);
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn(
                "flex min-h-11 flex-1 flex-col items-center justify-center rounded-sm px-2 py-1.5 text-xs font-medium transition-colors",
                view === v.id ? "bg-card text-navy shadow-card" : "text-steel hover:text-navy",
              )}
            >
              {v.title}
              {n > 0 ? (
                <span className="text-[10px] font-semibold text-teal-dark">
                  {n} foto{n === 1 ? "" : "s"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {view === "lateral" ? (
        <div className="flex gap-1 rounded-md border border-line bg-card p-1">
          {(["izquierdo", "derecho"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={cn(
                "min-h-11 flex-1 rounded-sm text-sm font-medium capitalize",
                side === s ? "bg-navy text-paper" : "text-steel hover:text-navy",
              )}
            >
              Lado {s}
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border border-line bg-navy-deep">
        <div className="relative mx-auto w-full">
          <img src={meta.src} alt={meta.title} className="block h-auto w-full select-none" />
          {points.map((p) => {
            const cap = capOf(p, captured, view, side);
            const active = selectedId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p, side)}
                title={`${p.n}. ${labelOf(p)}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                className={cn(
                  "absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center touch-manipulation",
                  active && "z-20",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-[11px] font-bold leading-none text-paper shadow-[0_0_0_2px_var(--color-card),0_2px_8px_rgba(8,21,31,0.45)]",
                    cap?.thumb ? "bg-teal" : "bg-rust",
                    active && "size-8 text-xs ring-2 ring-teal ring-offset-2 ring-offset-navy",
                  )}
                >
                  {cap?.thumb ? <Check className="size-3.5" strokeWidth={3} /> : p.n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {points.map((p) => {
          const cap = capOf(p, captured, view, side);
          const active = selectedId === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p, side)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
                  active
                    ? "border-teal bg-teal-soft"
                    : cap?.thumb
                      ? "border-line bg-ok-soft/40 hover:border-teal/50"
                      : "border-line bg-card hover:border-teal/50",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-paper",
                    cap?.thumb ? "bg-teal" : "bg-rust",
                  )}
                >
                  {p.n}
                </span>
                {cap?.thumb ? (
                  <img src={cap.thumb} alt="" className="size-8 shrink-0 rounded-sm object-cover" />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-sm border border-dashed border-line text-steel">
                    <Camera className="size-3.5" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy">{labelOf(p)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
