import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, XCircle, Save } from "lucide-react";
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
  notify,
} from "../../../components/mobigest/Experience";

export const Route = createFileRoute("/registos/rejeitado/$id")({
  component: DecisionPage,
});

type Registration = {
  id: string;
  reference: string | null;
  status: string;
  owner_id: string;
  vehicle_id: string | null;
};

function DecisionPage() {
  const { id } = Route.useParams();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [ownerName, setOwnerName] = useState("—");
  const [vehicleLabel, setVehicleLabel] = useState("Veículo");
  const [observation, setObservation] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const registrationResult = await supabase
        .from("registrations")
        .select("id, reference, status, owner_id, vehicle_id")
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

      const [ownerResult, vehicleResult] = await Promise.all([
        supabase
          .from("owners")
          .select("full_name")
          .eq("id", current.owner_id)
          .maybeSingle(),
        current.vehicle_id
          ? supabase
              .from("vehicles")
              .select("vehicle_type, make, model")
              .eq("id", current.vehicle_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!active) return;

      const error = ownerResult.error ?? vehicleResult.error;
      if (error) {
        console.error("Falha ao carregar dados relacionados:", error);
        setLoadError("Não foi possível carregar os dados relacionados.");
        setLoading(false);
        return;
      }

      setRegistration(current);
      setOwnerName(ownerResult.data?.full_name ?? "—");
      setVehicleLabel(
        [vehicleResult.data?.make, vehicleResult.data?.model]
          .filter(Boolean)
          .join(" ") || vehicleTypeLabel(vehicleResult.data?.vehicle_type),
      );
      setCompleted(current.status === "rejeitada");
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const submit = async () => {
    if (!registration || observation.trim().length < 4 || submitting) return;

    setSubmitting(true);
    setActionError(null);

    try {
      await decideRegistration({
        registrationId: registration.id,
        decision: "rejeitada",
        observation: observation.trim(),
      });

      setCompleted(true);
      notify.success(
        "Processo rejeitado",
        "A rejeição foi registada e associada ao histórico do processo.",
      );
    } catch (error) {
      console.error("Falha ao registar decisão:", error);
      const safeMessage = "Não foi possível registar a decisão.";
      setActionError(safeMessage);
      notify.error("Decisão não registada", safeMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobiGestShell title="Rejeitar registo" subtitle="Encerrar o processo com fundamentação obrigatória.">
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
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        </div>
      ) : completed ? (
        <Card className="mx-auto max-w-3xl p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <XCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-bold">Processo rejeitado</h2>
          <p className="mt-2 text-sm text-slate-500">
            {registration.reference || registration.id}
          </p>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-slate-600">
            A rejeição foi registada e associada ao histórico do processo.
          </p>
          <Link
            to="/registos/$id"
            params={{ id }}
            className="mt-7 inline-flex rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Voltar ao processo
          </Link>
        </Card>
      ) : (
        <div className="mx-auto max-w-3xl">
          <Card className="p-7">
            <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <XCircle />
              </div>
              <div>
                <p className="text-xs text-slate-400">Processo</p>
                <h2 className="text-xl font-bold">
                  {registration.reference || registration.id}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {vehicleLabel} · {ownerName}
                </p>
              </div>
            </div>

            <label className="mt-7 block text-sm font-medium">
              Fundamentação da rejeição
              <textarea
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-rose-500"
                placeholder="Indique o motivo da rejeição..."
              />
            </label>

            <div className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
              A decisão será gravada em <b>registration_decisions</b>, associada ao
              utilizador autenticado e registada também na auditoria.
            </div>

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
                disabled={observation.trim().length < 4}
                state={submitting ? "loading" : "idle"}
                idleLabel="Confirmar rejeição"
                loadingLabel="A rejeitar..."
                icon={<Save className="h-4 w-4" />}
                className="bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40"
              />
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !submitting) setConfirmOpen(false);
        }}
        title="Rejeitar este processo?"
        description="O processo será encerrado como rejeitado com a fundamentação informada. O histórico e os documentos serão preservados."
        confirmLabel="Confirmar rejeição"
        destructive={true}
        busy={submitting}
        onConfirm={async () => {
          await submit();
          setConfirmOpen(false);
        }}
      />

      <ProcessingOverlay
        open={submitting}
        message="A registar a rejeição do processo..."
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
