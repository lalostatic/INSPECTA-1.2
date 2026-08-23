import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { ContainerMap } from "@/components/container-map";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { CLASS_CODES, DAMAGES, NAVIERAS, OWNERSHIP, SIZE_CODES } from "@/lib/catalog";
import { compressImage } from "@/lib/compress-image";
import {
  captureKey,
  pointById,
  withLateralSide,
  type InspectPoint,
  type InspectViewId,
  type LateralSide,
} from "@/lib/inspect-points";
import { formatContainer, isValidContainer, normalizeContainer, suggestNaviera } from "@/lib/iso6346";
import { createInspection } from "@/lib/server/inspections";

export const Route = createFileRoute("/nueva")({
  component: NuevaPage,
});

function NuevaPage() {
  return (
    <Protected>
      <NuevaForm />
    </Protected>
  );
}

type DraftPhoto = { id: string; dataUrl: string; caption: string };
type DraftFinding = {
  id: string;
  pointId: string;
  side: string;
  component: string;
  damage: string;
  locCode: string;
  photos: DraftPhoto[];
};

function NuevaForm() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const raw = useRouterState({ select: (s) => s.location.search });
  const search = (typeof raw === "object" && raw ? raw : {}) as {
    punto?: string;
    vista?: InspectViewId;
    lado?: LateralSide;
  };
  const [container, setContainer] = useState("");
  const [naviera, setNaviera] = useState("Hapag-Lloyd");
  const [size, setSize] = useState("40HC");
  const [klass, setKlass] = useState("C");
  const [own, setOwn] = useState<"merchant" | "carrier" | "unknown">("unknown");
  const [missing, setMissing] = useState(false);
  const [findings, setFindings] = useState<DraftFinding[]>([]);
  const [busy, setBusy] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const startPoint = search.punto ? pointById(search.punto) : undefined;
  const [mapView, setMapView] = useState<InspectViewId>(search.vista ?? startPoint?.view ?? "puertas");
  const [lateralSide, setLateralSide] = useState<LateralSide>(
    search.lado === "izquierdo" ? "izquierdo" : "derecho",
  );
  const camRef = useRef<HTMLInputElement>(null);
  const pendingPoint = useRef<InspectPoint | null>(null);
  const armed = useRef(false);

  const valid = isValidContainer(container);
  const sheet = findings.find((f) => f.id === sheetId) ?? null;
  const captured = Object.fromEntries(
    findings
      .filter((f) => f.pointId && f.photos[0])
      .map((f) => [f.side ? captureKey(f.pointId, f.side) : f.pointId, { thumb: f.photos[0].dataUrl }]),
  );

  useEffect(() => {
    if (armed.current) return;
    const id = search.punto;
    if (!id) return;
    const point = pointById(id);
    if (!point) return;
    armed.current = true;
    setMapView(point.view);
    const t = window.setTimeout(() => openCamera(point), 400);
    return () => window.clearTimeout(t);
  }, [search.punto]);

  function openCamera(point: InspectPoint) {
    pendingPoint.current = point;
    setMapView(point.view);
    camRef.current?.click();
  }

  function pickPoint(point: InspectPoint, side: LateralSide) {
    setLateralSide(side);
    const existing = findings.find((f) => {
      if (f.pointId !== point.id) return false;
      if (point.view === "lateral") return f.side === side;
      return true;
    });
    if (existing) {
      setSheetId(existing.id);
      setMapView(point.view);
      return;
    }
    openCamera(point);
  }

  async function onCamChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const point = pendingPoint.current;
    if (!file || !file.type.startsWith("image/")) return;
    let dataUrl: string;
    try {
      dataUrl = await compressImage(file);
    } catch {
      toast.error("No se pudo leer la foto");
      return;
    }
    const side = point?.view === "lateral" ? lateralSide : "derecho";
    const applied = point ? withLateralSide(point, side) : null;
    const photo: DraftPhoto = {
      id: crypto.randomUUID(),
      dataUrl,
      caption: applied?.label ?? "",
    };
    if (!point) {
      if (sheetId) {
        setFindings((fs) =>
          fs.map((f) => (f.id === sheetId ? { ...f, photos: [...f.photos, photo].slice(0, 8) } : f)),
        );
      }
      return;
    }
    const existing = findings.find((f) => {
      if (f.pointId !== point.id) return false;
      if (point.view === "lateral") return f.side === side;
      return true;
    });
    if (existing) {
      setFindings((fs) =>
        fs.map((f) =>
          f.id === existing.id ? { ...f, photos: [...f.photos, { ...photo, caption: applied?.label ?? "" }].slice(0, 8) } : f,
        ),
      );
      setSheetId(existing.id);
    } else {
      const created: DraftFinding = {
        id: crypto.randomUUID(),
        pointId: point.id,
        side: point.view === "lateral" ? side : "",
        component: applied?.component ?? point.component,
        locCode: applied?.locCode ?? point.locCode,
        damage: "",
        photos: [photo],
      };
      setFindings((fs) => [...fs, created]);
      setSheetId(created.id);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (normalizeContainer(container).length < 6) {
      toast.error("Capture el número de contenedor");
      return;
    }
    if (findings.length === 0) {
      toast.error("Tome al menos una foto en el mapa");
      return;
    }
    setBusy(true);
    try {
      const res = await createInspection({
        data: {
          containerNo: container,
          naviera,
          sizeCode: size,
          classCode: klass,
          ownership: own,
          inspectionType: "Inspección Express",
          locationName: "Patio",
          workOrder: "",
          notes: "",
          missingLabel: missing,
          findings: findings.map((f) => ({
            pointId: f.pointId,
            side: f.side,
            component: f.component,
            damage: f.damage,
            repair: "",
            locCode: f.locCode,
            photos: f.photos.map((p) => ({ caption: p.caption, dataUrl: p.dataUrl })),
          })),
        },
      });
      await qc.invalidateQueries({ queryKey: ["inspections"] });
      await qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Inspección registrada");
      await nav({ to: "/inspecciones/$id", params: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mx-auto max-w-3xl space-y-6" onSubmit={(e) => void onSubmit(e)}>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-steel">Patio</p>
        <h1 className="font-display text-4xl tracking-wide text-navy">Nueva inspección</h1>
        <p className="mt-1 text-sm text-steel">Número de la unidad. Toca un punto para fotografiar.</p>
      </div>

      <section className="rounded-lg border border-line bg-card p-5 shadow-card">
        <Field
          label="Número de contenedor"
          hint={
            normalizeContainer(container).length === 11
              ? valid
                ? "Dígito ISO correcto"
                : "El dígito verificador no cuadra — se puede guardar igual"
              : "4 letras + 7 dígitos"
          }
        >
          <Input
            value={formatContainer(container)}
            onChange={(e) => {
              setContainer(e.target.value);
              const line = suggestNaviera(e.target.value);
              if (line) setNaviera(line);
            }}
            className="font-mono text-lg tracking-wider"
            autoCapitalize="characters"
            required
          />
        </Field>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Naviera">
            <NativeSelect value={naviera} onChange={(e) => setNaviera(e.target.value)}>
              {NAVIERAS.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Tamaño">
            <NativeSelect value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZE_CODES.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Clase">
            <NativeSelect value={klass} onChange={(e) => setKlass(e.target.value)}>
              {CLASS_CODES.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Merchant / carrier">
            <NativeSelect value={own} onChange={(e) => setOwn(e.target.value as typeof own)}>
              {OWNERSHIP.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <label className="mt-4 flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-teal" checked={missing} onChange={(e) => setMissing(e.target.checked)} />
          No trae etiqueta
        </label>
      </section>

      <section className="rounded-lg border border-line bg-card p-5 shadow-card">
        <h2 className="font-display text-xl tracking-wide text-navy">Mapa de puntos</h2>
        <p className="mt-1 mb-4 text-sm text-steel">Foto de la zona. El daño es opcional.</p>
        <ContainerMap
          captured={captured}
          selectedId={sheet?.pointId}
          view={mapView}
          onViewChange={setMapView}
          side={lateralSide}
          onSideChange={setLateralSide}
          onPick={pickPoint}
        />
      </section>

      {findings.length > 0 ? (
        <section className="space-y-2">
          {findings.map((f) => {
            const point = f.pointId ? pointById(f.pointId) : undefined;
            const title = point
              ? `${point.n}. ${f.side ? withLateralSide(point, f.side as LateralSide).label : point.label}`
              : f.component;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSheetId(f.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-line bg-card p-3 text-left shadow-card hover:border-teal/40"
              >
                {f.photos[0] ? (
                  <img src={f.photos[0].dataUrl} alt="" className="size-14 shrink-0 rounded-sm object-cover" />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-navy">{title}</span>
                  <span className="text-xs text-steel">{f.damage || "Sin detalle de daño"}</span>
                </span>
              </button>
            );
          })}
        </section>
      ) : null}

      <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-lg border border-line bg-card/95 p-3 shadow-card backdrop-blur md:bottom-4">
        <div className="text-xs text-steel">
          {findings.length} foto{findings.length === 1 ? "" : "s"}
        </div>
        <Button type="submit" disabled={busy}>
          <Upload />
          {busy ? "Registrando…" : "Registrar"}
        </Button>
      </div>

      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => void onCamChange(e)}
      />

      {sheet ? (
        <PointSheet
          finding={sheet}
          onPatch={(patch) => setFindings((fs) => fs.map((f) => (f.id === sheet.id ? { ...f, ...patch } : f)))}
          onCamera={() => {
            const point = sheet.pointId ? pointById(sheet.pointId) : undefined;
            if (point) openCamera(point);
            else {
              pendingPoint.current = null;
              camRef.current?.click();
            }
          }}
          onRemove={() => {
            setFindings((fs) => fs.filter((f) => f.id !== sheet.id));
            setSheetId(null);
          }}
          onClose={() => setSheetId(null)}
        />
      ) : null}
    </form>
  );
}

function PointSheet({
  finding,
  onPatch,
  onCamera,
  onRemove,
  onClose,
}: {
  finding: DraftFinding;
  onPatch: (p: Partial<DraftFinding>) => void;
  onCamera: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const point = finding.pointId ? pointById(finding.pointId) : undefined;
  const title = point
    ? finding.side
      ? withLateralSide(point, finding.side as LateralSide).label
      : point.label
    : finding.component;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-navy-deep/50" aria-label="Cerrar" onClick={onClose} />
      <div className="relative z-10 max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-line bg-card p-5 shadow-card sm:rounded-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-steel">
              {point ? `Punto ${point.n}` : "Foto"}
            </p>
            <h3 className="font-display text-2xl tracking-wide text-navy">{title}</h3>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Cerrar">
            <X />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {finding.photos.map((p) => (
            <div key={p.id} className="relative">
              <img src={p.dataUrl} alt="" className="aspect-[4/3] rounded-sm object-cover" />
              <button
                type="button"
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-sm bg-navy/80 text-paper"
                onClick={() => onPatch({ photos: finding.photos.filter((x) => x.id !== p.id) })}
                aria-label="Quitar foto"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {finding.photos.length < 8 ? (
            <button
              type="button"
              onClick={onCamera}
              className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line bg-paper text-steel hover:border-teal hover:text-teal-dark"
            >
              <Camera className="size-5" />
              <span className="text-[11px] font-medium">Cámara</span>
            </button>
          ) : null}
        </div>

        <div className="mt-4">
          <Field label="Daño (opcional)">
            <NativeSelect value={finding.damage} onChange={(e) => onPatch({ damage: e.target.value })}>
              <option value="">Sin detalle</option>
              {DAMAGES.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button variant="ghost" className="text-rust" onClick={onRemove}>
            <Trash2 />
            Quitar
          </Button>
          <Button onClick={onClose}>Listo</Button>
        </div>
      </div>
    </div>
  );
}
