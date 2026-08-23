import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PrintBar, WarehouseSheet } from "@/components/paper-sheet";
import { getWarehouse } from "@/lib/server/warehouse";
import { getSession } from "@/lib/server/tenant";

export const Route = createFileRoute("/almacen/$id")({ component: Detail });

function Detail() {
  const { id } = Route.useParams();
  const session = useQuery({ queryKey: ["session"], queryFn: () => getSession() });
  const q = useQuery({ queryKey: ["almacen", id], queryFn: () => getWarehouse({ data: { id } }) });
  const entry = q.data;
  if (q.isPending) return <p className="text-sm text-steel">Cargando…</p>;
  if (!entry) return <p className="text-sm text-steel">Entrada no encontrada.</p>;
  const org = session.data?.membership?.orgName ?? "INSPECTA";
  return (
    <div>
      <PrintBar title="Formato de pintores" />
      <WarehouseSheet entry={entry} orgName={org} />
    </div>
  );
}
