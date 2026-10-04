import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Printer,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";
import { decideRegistration } from "../../../lib/vehicles";
import { supabase } from "../../../lib/supabase";
import {
  ConfirmDialog,
  LoadingButton,
  NetworkErrorState,
  ProcessingOverlay,
  SkeletonCard,
  StatusBadge,
  notify,
} from "../../../components/mobigest/Experience";
import { formatDateTime } from "../../../lib/format";

export const Route = createFileRoute("/registos/aprovado/$id")({
  component: RegistoAprovado,
});

type Registration = {
  id: string;
  reference: string | null;
  registration_type: string;
  status: string;
  owner_id: string;
  vehicle_id: string | null;
  decision_observation: string | null;
  approved_at: string | null;
};

type Vehicle = {
  id: string;
  mobigest_number: string | null;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  chassis_number: string | null;
  frame_number: string | null;
};

function RegistoAprovado() {
  const { id } = Route.useParams();

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [ownerName, setOwnerName] = useState("—");
  const [observation, setObservation] = useState("");
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const registrationResult = await supabase
        .from("registrations")
        .select(
          "id, reference, registration_type, status, owner_id, vehicle_id, decision_observation, approved_at",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (registrationResult.error || !registrationResult.data) {
        console.error("Falha ao carregar processo para aprovação:", registrationResult.error);
        setLoadError("Processo não encontrado ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      const current = registrationResult.data as Registration;

      const [ownerResult, vehicleResult] = await Promise.all([
        supabase
          .from("owners")
          .select("full_name")
          .eq("id", current.owner_id)
          .maybeSingle(),
        current.vehicle_id
          ? supabase
              .from("vehicles")
              .select(
                "id, mobigest_number, vehicle_type, make, model, chassis_number, frame_number",
              )
              .eq("id", current.vehicle_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!active) return;

      const error = ownerResult.error ?? vehicleResult.error;
      if (error) {
        console.error("Falha ao carregar dados de aprovação:", error);
        setLoadError("O processo existe, mas os dados relacionados não puderam ser carregados.");
        setLoading(false);
        return;
      }

      setRegistration(current);
      setVehicle(vehicleResult.data as Vehicle | null);
      setOwnerName(ownerResult.data?.full_name ?? "—");
      setObservation(current.decision_observation ?? "");
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, refreshToken]);

  const approve = async () => {
    if (!registration || approving) return;

    setApproving(true);
    setActionError(null);

    try {
      await decideRegistration({
        registrationId: registration.id,
        decision: "aprovada",
        observation: observation.trim() || null,
      });

      notify.success(
        "Processo aprovado",
        registration.registration_type === "transferencia"
          ? "A transferência foi consolidada com sucesso."
          : "O registo foi aprovado e o número MobiGest foi atribuído.",
      );
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao aprovar processo:", error);
      const safeMessage = "Não foi possível aprovar o processo.";
      setActionError(safeMessage);
      notify.error("Aprovação não concluída", safeMessage);
    } finally {
      setApproving(false);
    }
  };

  const approved = registration?.status === "aprovada";
  const code = vehicle?.mobigest_number ?? null;
  const qrValue =
    code && typeof window !== "undefined"
      ? window.location.origin + "/q/" + encodeURIComponent(code)
      : code
        ? "/q/" + encodeURIComponent(code)
        : "";

  return (
    <MobiGestShell
      title="Aprovação de registo"
      subtitle="Validar e concluir o processo de forma auditada."
    >
      <Link
        to="/registos/$id"
        params={{ id }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao processo
      </Link>

      {loading ? (
        <div className="mx-auto max-w-3xl">
          <SkeletonCard />
        </div>
      ) : loadError || !registration ? (
        <div className="mx-auto max-w-3xl">
          <NetworkErrorState
            message={loadError ?? "Processo não encontrado."}
            onRetry={() => setRefreshToken((value) => value + 1)}
          />
        </div>
      ) : !approved ? (
        <div className="mx-auto max-w-3xl">
          <Card className="p-7">
            <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Processo
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {registration.reference || registration.id}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {registration.registration_type === "transferencia"
                    ? "Transferência de propriedade"
                    : "Registo inicial"}{" "}
                  · {ownerName}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              Ao confirmar, o servidor verifica requisitos documentais obrigatórios.
              No registo inicial gera o número MobiGest; numa transferência consolida
              o novo proprietário. A operação é atómica e auditada.
            </div>

            <label className="mt-5 block text-sm font-medium">
              Observação da aprovação
              <textarea
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                rows={3}
                placeholder="Observação opcional..."
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            {actionError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {actionError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Link
                to="/registos/$id"
                params={{ id }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
              >
                Cancelar
              </Link>
              <LoadingButton
                onClick={() => setConfirmOpen(true)}
                state={approving ? "loading" : "idle"}
                idleLabel="Confirmar aprovação"
                loadingLabel="A aprovar..."
                icon={<CheckCircle2 className="h-4 w-4" />}
                className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
              />
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card className="p-7">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-semibold">
                      Processo aprovado
                    </span>
                  </div>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {code || "Processo aprovado"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {registration.reference || registration.id}
                  </p>
                </div>
                <StatusBadge status="aprovada" />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info
                  label="Tipo de processo"
                  value={
                    registration.registration_type === "transferencia"
                      ? "Transferência"
                      : "Registo inicial"
                  }
                />
                <Info label="Proprietário" value={ownerName} />
                <Info
                  label="Veículo"
                  value={
                    [vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ||
                    vehicleTypeLabel(vehicle?.vehicle_type)
                  }
                />
                <Info
                  label="Chassis / quadro"
                  value={
                    vehicle?.chassis_number ||
                    vehicle?.frame_number ||
                    "Não informado"
                  }
                />
                <Info
                  label="Número MobiGest"
                  value={code || "Não aplicável"}
                />
                <Info
                  label="Data de aprovação"
                  value={
                    registration.approved_at
                      ? formatDateTime(registration.approved_at)
                      : "—"
                  }
                />
              </div>

              {vehicle && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/veiculos/$id"
                    params={{ id: vehicle.id }}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"
                  >
                    Abrir veículo
                  </Link>

                  {code && (
                    <>
                      <Link
                        to="/imprimir/qr/$id"
                        params={{ id: vehicle.id }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
                      >
                        <Printer className="h-4 w-4" /> Imprimir QR
                      </Link>
                      <Link
                        to="/consulta/$codigo"
                        params={{ codigo: code }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
                      >
                        <ExternalLink className="h-4 w-4" /> Consulta pública
                      </Link>
                    </>
                  )}
                </div>
              )}
            </Card>

            {code && (
              <Card className="p-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold">QR Code do veículo</h3>
                    <p className="text-sm text-slate-500">
                      Abre a consulta pública do número MobiGest.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
                  <div className="flex aspect-square items-center justify-center rounded-2xl border-2 border-slate-200 bg-white p-5">
                    <QRCodeSVG value={qrValue} size={180} level="M" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Código
                    </p>
                    <p className="mt-1 text-xl font-bold">{code}</p>
                    <p className="mt-4 text-sm leading-6 text-slate-500">
                      A página pública deve expor apenas os dados estritamente
                      necessários para confirmar a autenticidade do registo.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <Card className="p-6">
            <h3 className="font-bold">Fluxo concluído</h3>
            <div className="mt-5 space-y-4">
              {[
                "Processo submetido",
                "Requisitos verificados",
                "Decisão auditada",
                registration.registration_type === "transferencia"
                  ? "Propriedade transferida"
                  : "Número MobiGest atribuído",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold">{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !approving) setConfirmOpen(false);
        }}
        title={
          registration?.registration_type === "transferencia"
            ? "Aprovar esta transferência?"
            : "Aprovar este registo?"
        }
        description={
          registration?.registration_type === "transferencia"
            ? "O servidor validará os requisitos e consolidará o novo proprietário. A alteração de propriedade ficará preservada no histórico."
            : "O servidor validará os documentos obrigatórios e, se estiver tudo correcto, atribuirá o número MobiGest ao veículo."
        }
        confirmLabel="Aprovar processo"
        busy={approving}
        onConfirm={async () => {
          await approve();
          setConfirmOpen(false);
        }}
      />

      <ProcessingOverlay
        open={approving}
        message={
          registration?.registration_type === "transferencia"
            ? "A concluir a transferência de propriedade..."
            : "A validar o processo e gerar o número MobiGest..."
        }
      />
    </MobiGestShell>
  );
}

function vehicleTypeLabel(type?: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return "Veículo";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}
