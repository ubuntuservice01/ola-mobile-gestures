import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CarFront,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  RotateCcw,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { resubmitRegistration } from "../../lib/vehicles";
import { supabase } from "../../lib/supabase";
import {
  LoadingButton,
  NetworkErrorState,
  ProcessingOverlay,
  SkeletonCard,
  StatusBadge,
  notify,
} from "../../components/mobigest/Experience";
import { formatDateTime } from "../../lib/format";

export const Route = createFileRoute("/registos/$id")({
  component: RegistoDetalhe,
});

type Registration = {
  id: string;
  reference: string | null;
  registration_type: string;
  status: string;
  owner_id: string;
  previous_owner_id: string | null;
  vehicle_id: string | null;
  submitted_at: string | null;
  validated_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  correction_requested_at: string | null;
  decision_observation: string | null;
  created_at: string;
};

type Owner = {
  id: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
};

type Vehicle = {
  id: string;
  mobigest_number: string | null;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  chassis_number: string | null;
  frame_number: string | null;
  plate_number: string | null;
  administrative_post_id: string | null;
  locality_id: string | null;
  status: string;
};

type DocumentRow = {
  id: string;
  document_type: string;
  document_number: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
};

type DecisionRow = {
  id: string;
  decision: string;
  observation: string | null;
  decided_at: string;
};

function RegistoDetalhe() {
  const { id } = Route.useParams();

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [previousOwner, setPreviousOwner] = useState<Owner | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [postName, setPostName] = useState("—");
  const [localityName, setLocalityName] = useState("—");
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resubmitNote, setResubmitNote] = useState("");
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const registrationResult = await supabase
        .from("registrations")
        .select(
          "id, reference, registration_type, status, owner_id, previous_owner_id, vehicle_id, submitted_at, validated_at, approved_at, rejected_at, correction_requested_at, decision_observation, created_at",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (registrationResult.error || !registrationResult.data) {
        console.error("Falha ao carregar processo:", registrationResult.error);
        setLoadError("Processo não encontrado ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      const current = registrationResult.data as Registration;

      const [
        ownerResult,
        previousOwnerResult,
        vehicleResult,
        documentsResult,
        decisionsResult,
      ] = await Promise.all([
        supabase
          .from("owners")
          .select("id, full_name, document_type, document_number, phone")
          .eq("id", current.owner_id)
          .maybeSingle(),
        current.previous_owner_id
          ? supabase
              .from("owners")
              .select("id, full_name, document_type, document_number, phone")
              .eq("id", current.previous_owner_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        current.vehicle_id
          ? supabase
              .from("vehicles")
              .select(
                "id, mobigest_number, vehicle_type, make, model, chassis_number, frame_number, plate_number, administrative_post_id, locality_id, status",
              )
              .eq("id", current.vehicle_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("documents")
          .select(
            "id, document_type, document_number, status, rejection_reason, created_at",
          )
          .eq("registration_id", current.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("registration_decisions")
          .select("id, decision, observation, decided_at")
          .eq("registration_id", current.id)
          .order("decided_at", { ascending: false }),
      ]);

      if (!active) return;

      const relationError =
        ownerResult.error ??
        previousOwnerResult.error ??
        vehicleResult.error ??
        documentsResult.error ??
        decisionsResult.error;

      if (relationError) {
        console.error("Falha ao carregar detalhe do processo:", relationError);
        setLoadError(
          "O processo foi encontrado, mas os dados relacionados não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      const currentVehicle = vehicleResult.data as Vehicle | null;

      const [postResult, localityResult] = await Promise.all([
        currentVehicle?.administrative_post_id
          ? supabase
              .from("administrative_posts")
              .select("name")
              .eq("id", currentVehicle.administrative_post_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        currentVehicle?.locality_id
          ? supabase
              .from("localities")
              .select("name")
              .eq("id", currentVehicle.locality_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!active) return;

      const territoryError = postResult.error ?? localityResult.error;
      if (territoryError) {
        console.error("Falha ao carregar território do processo:", territoryError);
        setLoadError("O processo existe, mas o território não pôde ser carregado.");
        setLoading(false);
        return;
      }

      setRegistration(current);
      setOwner(ownerResult.data as Owner | null);
      setPreviousOwner(previousOwnerResult.data as Owner | null);
      setVehicle(currentVehicle);
      setDocuments((documentsResult.data ?? []) as DocumentRow[]);
      setDecisions((decisionsResult.data ?? []) as DecisionRow[]);
      setPostName(postResult.data?.name ?? "—");
      setLocalityName(localityResult.data?.name ?? "—");
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, refreshToken]);

  const submitCorrection = async () => {
    if (!registration || registration.status !== "correccao" || resubmitting) {
      return;
    }

    setResubmitting(true);
    setResubmitError(null);

    try {
      await resubmitRegistration({
        registrationId: registration.id,
        observation: resubmitNote.trim() || null,
      });

      setResubmitNote("");
      notify.success(
        "Processo reenviado",
        "O processo voltou para validação.",
      );
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao reenviar processo:", error);
      const safeMessage = "Não foi possível reenviar o processo.";
      setResubmitError(safeMessage);
      notify.error("Reenvio não concluído", safeMessage);
    } finally {
      setResubmitting(false);
    }
  };

  const openForDecision =
    registration &&
    ["pendente", "em_validacao"].includes(registration.status);

  return (
    <MobiGestShell
      title="Detalhe do registo"
      subtitle="Processo, documentos e histórico de decisão."
    >
      <div className="mx-auto max-w-6xl">
        <Link
          to="/registos"
          className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos registos
        </Link>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : loadError || !registration ? (
          <NetworkErrorState
            message={loadError ?? "Processo não encontrado."}
            onRetry={() => setRefreshToken((value) => value + 1)}
          />
        ) : (
          <>
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm text-slate-500">
                  {registrationTypeLabel(registration.registration_type)}
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  {registration.reference || registration.id}
                </h2>
              </div>
              <StatusBadge status={registration.status} />
            </div>

            {openForDecision && (
              <Card className="mb-6 p-6">
                <h3 className="font-semibold">Decisão do processo</h3>
                <p className="mt-1 text-sm text-slate-500">
                  A decisão é executada no servidor e fica registada no histórico.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Link
                    to="/registos/aprovado/$id"
                    params={{ id: registration.id }}
                    className="mobigest-card-interactive rounded-xl border border-emerald-200 bg-emerald-50 p-4 hover:border-emerald-400"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <p className="mt-2 text-sm font-semibold">Aprovar</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Valida requisitos e conclui o processo.
                    </p>
                  </Link>

                  <Link
                    to="/registos/correcao/$id"
                    params={{ id: registration.id }}
                    className="mobigest-card-interactive rounded-xl border border-amber-200 bg-amber-50 p-4 hover:border-amber-400"
                  >
                    <FileCheck2 className="h-5 w-5 text-amber-600" />
                    <p className="mt-2 text-sm font-semibold">
                      Solicitar correcção
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Devolve o processo com orientação.
                    </p>
                  </Link>

                  <Link
                    to="/registos/rejeitado/$id"
                    params={{ id: registration.id }}
                    className="mobigest-card-interactive rounded-xl border border-rose-200 bg-rose-50 p-4 hover:border-rose-400"
                  >
                    <XCircle className="h-5 w-5 text-rose-600" />
                    <p className="mt-2 text-sm font-semibold">Rejeitar</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Encerra o processo com fundamentação.
                    </p>
                  </Link>
                </div>
              </Card>
            )}

            {registration.status === "correccao" && (
              <Card className="mb-6 border-amber-200 p-6">
                <h3 className="font-semibold">Processo em correcção</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {registration.decision_observation ||
                    "Foi solicitada correcção deste processo."}
                </p>

                <label className="mt-4 block text-sm font-medium">
                  Nota do reenvio
                  <textarea
                    value={resubmitNote}
                    onChange={(event) => setResubmitNote(event.target.value)}
                    rows={3}
                    placeholder="Descreva o que foi corrigido..."
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>

                {resubmitError && (
                  <p className="mt-3 text-sm font-medium text-red-700">
                    {resubmitError}
                  </p>
                )}

                <LoadingButton
                  onClick={submitCorrection}
                  state={resubmitting ? "loading" : "idle"}
                  idleLabel="Reenviar para validação"
                  loadingLabel="A reenviar..."
                  icon={<RotateCcw className="h-4 w-4" />}
                  className="mt-4 bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40"
                />
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-6 lg:col-span-2">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <FileText />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Processo
                    </p>
                    <h3 className="mt-1 text-xl font-bold">
                      {registration.reference || registration.id}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Submetido em{" "}
                      {formatDateTime(
                        registration.submitted_at ?? registration.created_at,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-7 grid gap-4 md:grid-cols-2">
                  <Info
                    label="Tipo de processo"
                    value={registrationTypeLabel(
                      registration.registration_type,
                    )}
                  />
                  <Info
                    label="Estado"
                    value={statusLabel(registration.status)}
                  />
                  <Info
                    label="Proprietário"
                    value={owner?.full_name ?? "—"}
                  />
                  <Info
                    label="Proprietário anterior"
                    value={previousOwner?.full_name ?? "Não aplicável"}
                  />
                  <Info
                    label="Veículo"
                    value={
                      [vehicle?.make, vehicle?.model]
                        .filter(Boolean)
                        .join(" ") || vehicleTypeLabel(vehicle?.vehicle_type)
                    }
                  />
                  <Info
                    label="Número MobiGest"
                    value={vehicle?.mobigest_number ?? "Ainda não atribuído"}
                  />
                  <Info label="Posto administrativo" value={postName} />
                  <Info label="Localidade / bairro" value={localityName} />
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold">Linha temporal</h3>
                <div className="mt-5 space-y-5">
                  <Timeline
                    icon={<Clock3 />}
                    title="Processo submetido"
                    time={registration.submitted_at ?? registration.created_at}
                  />
                  {registration.correction_requested_at && (
                    <Timeline
                      icon={<FileCheck2 />}
                      title="Correcção solicitada"
                      time={registration.correction_requested_at}
                    />
                  )}
                  {registration.approved_at && (
                    <Timeline
                      icon={<CheckCircle2 />}
                      title="Processo aprovado"
                      time={registration.approved_at}
                    />
                  )}
                  {registration.rejected_at && (
                    <Timeline
                      icon={<XCircle />}
                      title="Processo rejeitado"
                      time={registration.rejected_at}
                    />
                  )}
                </div>
              </Card>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <h3 className="font-semibold">Entidades relacionadas</h3>
                <div className="mt-4 space-y-3">
                  {vehicle && (
                    <Link
                      to="/veiculos/$id"
                      params={{ id: vehicle.id }}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-sky-300"
                    >
                      <CarFront className="h-5 w-5 text-sky-600" />
                      <div>
                        <p className="text-sm font-semibold">Veículo</p>
                        <p className="text-xs text-slate-500">
                          {vehicle.mobigest_number ||
                            "Aguardando número MobiGest"}
                        </p>
                      </div>
                    </Link>
                  )}

                  {owner && (
                    <Link
                      to="/proprietarios/$id"
                      params={{ id: owner.id }}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-sky-300"
                    >
                      <UserRound className="h-5 w-5 text-sky-600" />
                      <div>
                        <p className="text-sm font-semibold">
                          {owner.full_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {owner.document_number
                            ? [owner.document_type, owner.document_number]
                                .filter(Boolean)
                                .join(" · ")
                            : owner.phone || "Proprietário"}
                        </p>
                      </div>
                    </Link>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold">Documentos do processo</h3>

                <div className="mt-4 space-y-2">
                  {documents.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                      Ainda não existem documentos associados a este processo.
                    </p>
                  ) : (
                    documents.map((document) => (
                      <div
                        key={document.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              {document.document_type}
                            </p>
                            <p className="text-xs text-slate-500">
                              {document.document_number || "Sem número"}
                            </p>
                          </div>
                          <StatusBadge status={document.status} />
                        </div>
                        {document.rejection_reason && (
                          <p className="mt-2 text-xs text-rose-700">
                            {document.rejection_reason}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  A gestão de ficheiros e validação documental será feita no
                  módulo seguro de documentos/Storage.
                </p>
              </Card>
            </div>

            <Card className="mt-6 p-6">
              <h3 className="font-semibold">Histórico de decisões</h3>

              <div className="mt-4 space-y-3">
                {decisions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Ainda não existe decisão registada.
                  </p>
                ) : (
                  decisions.map((decision) => (
                    <div
                      key={decision.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {decisionLabel(decision.decision)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(decision.decided_at).toLocaleString("pt-MZ")}
                        </span>
                      </div>
                      {decision.observation && (
                        <p className="mt-2 text-sm text-slate-600">
                          {decision.observation}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      <ProcessingOverlay
        open={resubmitting}
        message="A reenviar o processo para validação..."
      />
    </MobiGestShell>
  );
}

function registrationTypeLabel(type: string) {
  return type === "transferencia" ? "Transferência" : "Registo inicial";
}

function vehicleTypeLabel(type?: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return "Veículo";
}

function statusLabel(status: string) {
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

function decisionLabel(decision: string) {
  if (decision === "aprovada") return "Aprovado";
  if (decision === "correccao") return "Correcção solicitada";
  if (decision === "rejeitada") return "Rejeitado";
  return decision;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function Timeline({
  icon,
  title,
  time,
}: {
  icon: React.ReactNode;
  title: string;
  time: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="text-sky-600">{icon}</span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-slate-500">
          {formatDateTime(time)}
        </p>
      </div>
    </div>
  );
}
