import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";
import { supabase } from "../../../lib/supabase";
import {
  AnimatedNumber,
  EmptyState,
  NetworkErrorState,
  SkeletonCard,
  StatusBadge,
} from "../../../components/mobigest/Experience";
import { formatDateTime } from "../../../lib/format";

export const Route = createFileRoute("/veiculos/$id/historico")({
  component: Historico,
});

type TimelineEvent = {
  id: string;
  at: string;
  kind: "status" | "ownership" | "registration";
  title: string;
  value: string;
  description: string;
};

type Vehicle = {
  id: string;
  mobigest_number: string | null;
  status: string;
  commercial_status: string;
  make: string | null;
  model: string | null;
  created_at: string;
};

function Historico() {
  const { id } = Route.useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [
        vehicleResult,
        statusResult,
        ownershipResult,
        registrationResult,
      ] = await Promise.all([
        supabase
          .from("vehicles")
          .select(
            "id, mobigest_number, status, commercial_status, make, model, created_at",
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("vehicle_status_history")
          .select(
            "id, previous_status, new_status, reason, occurrence_reference, changed_at",
          )
          .eq("vehicle_id", id)
          .order("changed_at", { ascending: false }),
        supabase
          .from("ownership_history")
          .select(
            "id, previous_owner_id, new_owner_id, registration_id, operation, reason, effective_at",
          )
          .eq("vehicle_id", id)
          .order("effective_at", { ascending: false }),
        supabase
          .from("registrations")
          .select(
            "id, reference, registration_type, status, decision_observation, created_at, submitted_at, approved_at, rejected_at, correction_requested_at",
          )
          .eq("vehicle_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      const error =
        vehicleResult.error ??
        statusResult.error ??
        ownershipResult.error ??
        registrationResult.error;

      if (error || !vehicleResult.data) {
        console.error("Falha ao carregar histórico do veículo:", error);
        setLoadError("Não foi possível carregar o histórico deste veículo.");
        setLoading(false);
        return;
      }

      const ownerIds = [
        ...new Set(
          (ownershipResult.data ?? [])
            .flatMap((item) => [item.previous_owner_id, item.new_owner_id])
            .filter(Boolean),
        ),
      ] as string[];

      const ownersResult = ownerIds.length
        ? await supabase.from("owners").select("id, full_name").in("id", ownerIds)
        : { data: [], error: null };

      if (!active) return;

      if (ownersResult.error) {
        console.error("Falha ao carregar nomes de proprietários:", ownersResult.error);
        setLoadError("Não foi possível carregar o histórico de propriedade.");
        setLoading(false);
        return;
      }

      const ownerMap = new Map(
        (ownersResult.data ?? []).map((owner) => [owner.id, owner.full_name]),
      );

      const timeline: TimelineEvent[] = [];

      for (const item of statusResult.data ?? []) {
        timeline.push({
          id: "status-" + item.id,
          at: item.changed_at,
          kind: "status",
          title: "Alteração de estado",
          value:
            statusLabel(item.previous_status) +
            " → " +
            statusLabel(item.new_status),
          description:
            item.reason +
            (item.occurrence_reference
              ? " · Ref.: " + item.occurrence_reference
              : ""),
        });
      }

      for (const item of ownershipResult.data ?? []) {
        const previous = item.previous_owner_id
          ? ownerMap.get(item.previous_owner_id) ?? "Proprietário anterior"
          : "Sem proprietário anterior";
        const next =
          ownerMap.get(item.new_owner_id) ?? "Novo proprietário";

        timeline.push({
          id: "ownership-" + item.id,
          at: item.effective_at,
          kind: "ownership",
          title:
            item.operation === "transferencia"
              ? "Transferência de propriedade"
              : "Proprietário associado",
          value:
            item.operation === "transferencia"
              ? previous + " → " + next
              : next,
          description: item.reason || "Operação de propriedade concluída.",
        });
      }

      for (const item of registrationResult.data ?? []) {
        timeline.push({
          id: "registration-created-" + item.id,
          at: item.submitted_at ?? item.created_at,
          kind: "registration",
          title:
            item.registration_type === "transferencia"
              ? "Transferência submetida"
              : "Registo inicial submetido",
          value: item.reference || item.id,
          description: "Estado inicial: " + registrationStatusLabel("pendente"),
        });

        if (item.correction_requested_at) {
          timeline.push({
            id: "registration-correction-" + item.id,
            at: item.correction_requested_at,
            kind: "registration",
            title: "Correcção solicitada",
            value: item.reference || item.id,
            description:
              item.decision_observation || "Foram solicitadas correcções.",
          });
        }

        if (item.approved_at) {
          timeline.push({
            id: "registration-approved-" + item.id,
            at: item.approved_at,
            kind: "registration",
            title: "Processo aprovado",
            value: item.reference || item.id,
            description:
              item.registration_type === "transferencia"
                ? "Transferência concluída."
                : "Registo inicial aprovado.",
          });
        }

        if (item.rejected_at) {
          timeline.push({
            id: "registration-rejected-" + item.id,
            at: item.rejected_at,
            kind: "registration",
            title: "Processo rejeitado",
            value: item.reference || item.id,
            description:
              item.decision_observation || "Processo rejeitado.",
          });
        }
      }

      timeline.sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      );

      setVehicle(vehicleResult.data as Vehicle);
      setEvents(timeline);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const lastUpdate = useMemo(
    () => events[0]?.at ?? vehicle?.created_at ?? null,
    [events, vehicle],
  );

  return (
    <MobiGestShell
      title="Histórico do veículo"
      subtitle="Linha temporal de estados, propriedade e processos."
    >
      <Link
        to="/veiculos/$id"
        params={{ id }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao veículo
      </Link>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : loadError || !vehicle ? (
        <NetworkErrorState
          message={loadError ?? "Veículo não encontrado."}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">Veículo</p>
                <h2 className="text-xl font-bold">
                  {vehicle.mobigest_number ||
                    [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
                    vehicle.id}
                </h2>
              </div>
              <StatusBadge
                status={
                  vehicle.commercial_status === "a_venda"
                    ? "a_venda"
                    : vehicle.status
                }
              />
            </div>

            {events.length === 0 ? (
              <div className="mt-8">
                <EmptyState
                  title="Ainda não existem eventos históricos"
                  description="Alterações de estado, propriedade e processos aparecerão aqui quando ocorrerem."
                />
              </div>
            ) : (
              <div className="relative mt-8 space-y-7 before:absolute before:left-5 before:top-2 before:h-[calc(100%-12px)] before:w-px before:bg-slate-200">
                {events.map((event) => (
                  <div className="relative flex gap-4" key={event.id}>
                    <div
                      className={
                        "z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white " +
                        (event.kind === "status"
                          ? "bg-amber-100 text-amber-600"
                          : event.kind === "ownership"
                            ? "bg-sky-100 text-sky-600"
                            : "bg-emerald-100 text-emerald-600")
                      }
                    >
                      {event.kind === "status" ? (
                        <ShieldAlert className="h-4 w-4" />
                      ) : event.kind === "ownership" ? (
                        <UserRound className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap justify-between gap-2">
                        <p className="font-semibold">{event.title}</p>
                        <span className="text-xs text-slate-400">
                          {formatDateTime(event.at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-600">
                        {event.value}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-sky-600" />
                <div>
                  <p className="text-xs text-slate-400">Última actualização</p>
                  <p className="text-sm font-semibold">
                    {lastUpdate ? formatDateTime(lastUpdate) : "—"}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-sky-600" />
                <div>
                  <p className="text-xs text-slate-400">Eventos registados</p>
                  <p className="text-sm font-semibold">
                    <AnimatedNumber value={events.length} />
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-xs text-slate-400">Estado actual</p>
                  <p className="text-sm font-semibold">
                    {statusLabel(vehicle.status)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {vehicle.commercial_status === "a_venda"
                      ? "À venda"
                      : "Situação comercial normal"}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </MobiGestShell>
  );
}

function statusLabel(status: string | null) {
  const labels: Record<string, string> = {
    activa: "Activa",
    suspensa: "Suspensa",
    roubada: "Roubada",
    apreendida: "Apreendida",
    cancelada: "Cancelada",
  };
  return status ? labels[status] ?? status : "Sem estado anterior";
}

function registrationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_validacao: "Em validação",
    correccao: "Correcção",
    aprovada: "Aprovada",
    rejeitada: "Rejeitada",
    cancelada: "Cancelada",
  };
  return labels[status] ?? status;
}
