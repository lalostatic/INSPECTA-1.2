import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { MATERIAL_UNITS, SIZE_CODES, TREATMENTS } from "@/lib/catalog";
import { formatContainer, lineCode, suggestNaviera } from "@/lib/iso6346";
import { createWarehouse } from "@/lib/server/warehouse";
import { todayISO } from "@/lib/utils";

export const Route = createFileRoute("/almacen/nuevo")({ component: Nuevo });

type Mat = { id: string; qty: string; unit: string; code: string; article: string };
type Unit = { id: string; containerNo: string; unitCode: string; sizeCode: string; naviera: string; treatment: string };

function Nuevo() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [folio, setFolio] = useState("");
  const [date, setDate] = useState(todayISO());
  const [location, setLocation] = useState("Cerlan");
  const [from, setFrom] = useState("");
  const [invoice, setInvoice] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [materials, setMaterials] = useState<Mat[]>([
    { id: crypto.randomUUID(), qty: "19", unit: "LTS", code: "9x15", article: "perla" },
  ]);
  const [units, setUnits] = useState<Unit[]>([
    { id: crypto.randomUUID(), containerNo: "", unitCode: "FX", sizeCode: "40HC", naviera: "HL", treatment: "Acond." },
  ]);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const ready = units.filter((u) => u.containerNo.trim().length >= 6);
    if (ready.length === 0) {
      toast.error("Agregue al menos una unidad acondicionada");
      return;
    }
    setBusy(true);
    try {
      const res = await createWarehouse({
        data: {
          folio,
          entryDate: date,
          locationName: location,
          receivedFrom: from,
          invoiceRef: invoice,
          receivedBy,
          notes: "",
          materials: materials
            .filter((m) => Number(m.qty) > 0 && m.article.trim())
            .map((m) => ({ qty: Number(m.qty), unit: m.unit, code: m.code, article: m.article })),
          units: ready,
        },
      });
      await qc.invalidateQueries({ queryKey: ["almacen"] });
      await qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Entrada de almacén guardada");
      await nav({ to: "/almacen/$id", params: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-steel">Pintura</p>
        <h1 className="font-display text-4xl tracking-wide text-navy">Entrada de almacén</h1>
        <p className="mt-1 text-sm text-steel">Folio, material y unidades acondicionadas.</p>
      </div>
      <section className="grid gap-3 rounded-lg border border-line bg-card p-5 shadow-card sm:grid-cols-2">
        <Field label="Folio">
          <Input value={folio} onChange={(e) => setFolio(e.target.value)} placeholder="5179" required className="font-mono" />
        </Field>
        <Field label="Fecha">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Ubicación">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="Recibido de">
          <Input value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="No. remisión / factura">
          <Input value={invoice} onChange={(e) => setInvoice(e.target.value)} />
        </Field>
        <Field label="Recibido por">
          <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Eduardo" />
        </Field>
      </section>

      <section>
        <h2 className="mb-2 font-display text-xl tracking-wide text-navy">Material</h2>
        {materials.map((mat) => (
          <div key={mat.id} className="mb-2 grid gap-2 rounded-lg border border-line bg-card p-3 sm:grid-cols-4">
            <Field label="Cantidad">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={mat.qty}
                onChange={(e) => setMaterials((ms) => ms.map((x) => (x.id === mat.id ? { ...x, qty: e.target.value } : x)))}
              />
            </Field>
            <Field label="Unidad">
              <NativeSelect
                value={mat.unit}
                onChange={(e) => setMaterials((ms) => ms.map((x) => (x.id === mat.id ? { ...x, unit: e.target.value } : x)))}
              >
                {MATERIAL_UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Código">
              <Input
                value={mat.code}
                onChange={(e) => setMaterials((ms) => ms.map((x) => (x.id === mat.id ? { ...x, code: e.target.value } : x)))}
                placeholder="9x15"
              />
            </Field>
            <Field label="Artículo">
              <Input
                value={mat.article}
                onChange={(e) => setMaterials((ms) => ms.map((x) => (x.id === mat.id ? { ...x, article: e.target.value } : x)))}
                placeholder="perla"
              />
            </Field>
          </div>
        ))}
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setMaterials((ms) => [...ms, { id: crypto.randomUUID(), qty: "", unit: "LTS", code: "", article: "" }])
          }
        >
          <Plus />
          Material
        </Button>
      </section>

      <section>
        <h2 className="mb-2 font-display text-xl tracking-wide text-navy">Unidades acondicionadas</h2>
        {units.map((unit) => (
          <div key={unit.id} className="mb-2 rounded-lg border border-line bg-card p-3">
            <div className="flex justify-end">
              {units.length > 1 ? (
                <button type="button" onClick={() => setUnits((us) => us.filter((x) => x.id !== unit.id))}>
                  <Trash2 className="size-4 text-rust" />
                </button>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Contenedor">
                <Input
                  value={formatContainer(unit.containerNo)}
                  onChange={(e) => {
                    const v = e.target.value;
                    const sug = suggestNaviera(v);
                    setUnits((us) =>
                      us.map((x) =>
                        x.id === unit.id ? { ...x, containerNo: v, naviera: sug ? lineCode(sug) : x.naviera } : x,
                      ),
                    );
                  }}
                  className="font-mono"
                  required
                />
              </Field>
              <Field label="Unidad">
                <Input
                  value={unit.unitCode}
                  onChange={(e) =>
                    setUnits((us) => us.map((x) => (x.id === unit.id ? { ...x, unitCode: e.target.value.toUpperCase() } : x)))
                  }
                />
              </Field>
              <Field label="Tamaño">
                <NativeSelect
                  value={unit.sizeCode}
                  onChange={(e) => setUnits((us) => us.map((x) => (x.id === unit.id ? { ...x, sizeCode: e.target.value } : x)))}
                >
                  {SIZE_CODES.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Naviera">
                <Input
                  value={unit.naviera}
                  onChange={(e) =>
                    setUnits((us) => us.map((x) => (x.id === unit.id ? { ...x, naviera: e.target.value.toUpperCase() } : x)))
                  }
                />
              </Field>
              <Field label="Tratamiento">
                <NativeSelect
                  value={unit.treatment}
                  onChange={(e) => setUnits((us) => us.map((x) => (x.id === unit.id ? { ...x, treatment: e.target.value } : x)))}
                >
                  {TREATMENTS.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </div>
        ))}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            setUnits((us) => [
              ...us,
              { id: crypto.randomUUID(), containerNo: "", unitCode: "FX", sizeCode: "40HC", naviera: "HL", treatment: "Acond." },
            ])
          }
        >
          <Plus />
          Unidad
        </Button>
      </section>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Guardando…" : "Guardar entrada"}
      </Button>
    </form>
  );
}
