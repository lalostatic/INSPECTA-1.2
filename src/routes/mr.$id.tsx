import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PrintBar, WorkReportSheet } from "@/components/paper-sheet";
import { Button } from "@/components/ui/button";
import { closeWorkReport, getWorkReport } from "@/lib/server/work-reports";
import { getSession } from "@/lib/server/tenant";

export const Route = createFileRoute("/mr/$id")({ component: Detail });

function Detail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const session = useQuery({ queryKey: ["session"], queryFn: () => getSession() });
  const q = useQuery({ queryKey: ["mr", id], queryFn: () => getWorkReport({ data: { id } }) });
  const report = q.data;
  if (q.isPending) return <p className="text-sm text-steel">Cargando…</p>;
  if (!report) return <p className="text-sm text-steel">Reporte no encontrado.</p>;
  const org = session.data?.membership?.orgName ?? "INSPECTA";
  return (
    <div>
      <PrintBar title="Formato de reparadores" />
      <WorkReportSheet report={report} orgName={org} />
      {report.status !== "cerrado" ? (
        <div className="mt-4 no-print">
          <Button
            variant="navy"
            onClick={() => {
              void closeWorkReport({ data: { id } })
                .then(async () => {
                  await qc.invalidateQueries({ queryKey: ["mr"] });
                  toast.success("Reporte cerrado");
                })
                .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Error"));
            }}
          >
            Cerrar y firmar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
