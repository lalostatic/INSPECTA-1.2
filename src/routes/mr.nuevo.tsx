import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { CLASS_CODES, SIZE_CODES } from "@/lib/catalog";
import { formatContainer, suggestNaviera, lineCode } from "@/lib/iso6346";
import { createWorkReport } from "@/lib/server/work-reports";
import { todayISO } from "@/lib/utils";

export const Route = createFileRoute("/mr/nuevo")({ component: Nuevo });

type Line = {
  id: string;
  containerNo: string;
  classCode: string;
  sizeCode: string;
  naviera: string;
  description: string;
  locCode: string;
  unknownOwnership: boolean;
  missingLabel: boolean;
};

function emptyLine(): Line {
  return {
    id: crypto.randomUUID(),
    containerNo: "",
    classCode: "C",
    sizeCode: "40HC",
    naviera: "HL",
    description: "Banda (Restos de carga)",
    locCode: "",
    unknownOwnership: false,
    missingLabel: false,
  };
}

function Nuevo() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const [tech, setTech] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [notes, setNotes] = useState(
    "Asterisco: contenedores que no dicen si son merchant o carrier; unos no traen etiqueta.",
  );
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [busy, setBusy] = useState(false);

  function patch(id: string, p: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const ready = lines.filter((l) => l.containerNo.trim().length >= 6 && l.description.trim());
    if (ready.length === 0) {
      toast.error("Agregue al menos una unidad");
      return;
    }
    setBusy(true);
    try {
      const res = await createWorkReport({
        data: {
          reportDate: date,
          area: "MR",
          technicians: tech,
          supervisor,
          notes,
          lines: ready,
        },
      });
      await qc.invalidateQueries({ queryKey: ["mr"] });
      await qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Reporte de trabajo guardado");
      await nav({ to: "/mr/$id", params: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-steel">Taller M&R</p>
        <h1 className="font-display text-4xl tracking-wide text-navy">Reporte de trabajo</h1>
        <p className="mt-1 text-sm text-steel">Fecha, contenedor y trabajo del día.</p>
      </div>
      <section className="grid gap-3 rounded-lg border border-line bg-card p-5 shadow-card sm:grid-cols-3">
        <Field label="Fecha">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Reparador(es)">
          <Input value={tech} onChange={(e) => setTech(e.target.value)} placeholder="Israel y Luis Angel" />
        </Field>
        <Field label="Supervisor">
          <Input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} />
        </Field>
      </section>

      <div className="space-y-3">
        {lines.map((line, i) => (
          <section key={line.id} className="rounded-lg border border-line bg-card p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-sm text-steel">#{i + 1}</p>
              {lines.length > 1 ? (
                <button type="button" className="text-rust" onClick={() => setLines((ls) => ls.filter((x) => x.id !== line.id))}>
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Contenedor">
                <Input
                  value={formatContainer(line.containerNo)}
                  onChange={(e) => {
                    const v = e.target.value;
                    const sug = suggestNaviera(v);
                    patch(line.id, { containerNo: v, naviera: sug ? lineCode(sug) : line.naviera });
                  }}
                  className="font-mono"
                  required
                />
              </Field>
              <Field label="Clase">
                <NativeSelect value={line.classCode} onChange={(e) => patch(line.id, { classCode: e.target.value })}>
                  {CLASS_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Tamaño">
                <NativeSelect value={line.sizeCode} onChange={(e) => patch(line.id, { sizeCode: e.target.value })}>
                  {SIZE_CODES.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Naviera">
                <Input value={line.naviera} onChange={(e) => patch(line.id, { naviera: e.target.value.toUpperCase() })} />
              </Field>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem]">
              <Field label="Descripción">
                <Input
                  value={line.description}
                  onChange={(e) => patch(line.id, { description: e.target.value })}
                  placeholder="Banda (Restos de carga) + End 2 Pl x 2 Pl"
                  required
                />
              </Field>
              <Field label="Loc.">
                <Input
                  value={line.locCode}
                  onChange={(e) => patch(line.id, { locCode: e.target.value.toUpperCase() })}
                  placeholder="RXEW"
                  className="font-mono"
                />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-teal"
                  checked={line.unknownOwnership}
                  onChange={(e) => patch(line.id, { unknownOwnership: e.target.checked })}
                />
                * No indica merchant/carrier
              </label>
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-teal"
                  checked={line.missingLabel}
                  onChange={(e) => patch(line.id, { missingLabel: e.target.checked })}
                />
                Sin etiqueta
              </label>
            </div>
          </section>
        ))}
      </div>
      <Button variant="secondary" className="w-full" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
        <Plus />
        Agregar unidad
      </Button>
      <Field label="Nota al pie">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Guardando…" : "Guardar reporte"}
      </Button>
    </form>
  );
}
