import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";
import {
  setVehicleCommercialStatus,
  setVehicleOperationalStatus,
  type VehicleOperationalStatus,
} from "../../../lib/vehicles";
import { supabase } from "../../../lib/supabase";
import { useSessionDraft } from "../../../hooks/use-session-draft";
import { notify } from "../../../components/mobigest/Experience";

export const Route = createFileRoute("/veiculos/$id/estado")({
  component: AlterarEstado,
});

const STATE_INFO: Array<{
  value: VehicleOperationalStatus;
  label: string;
  description: string;
}> = [
  {
    value: "activa",
    label: "Activa",
    description: "Veículo regularmente registado e operacional.",
  },
  {
    value: "suspensa",
    label: "Suspensa",
    description: "Registo temporariamente suspenso por decisão administrativa.",
  },
  {
    value: "roubada",
    label: "Roubada",
    description: "Veículo declarado como roubado.",
  },
  {
    value: "apreendida",
    label: "Apreendida",
    description: "Veículo retido pelas autoridades competentes.",
  },
  {
    value: "cancelada",
    label: "Cancelada",
    description: "Registo cancelado administrativamente.",
  },
];

const TRANSITIONS: Record<VehicleOperationalStatus, VehicleOperationalStatus[]> = {
  activa: ["suspensa", "roubada", "apreendida", "cancelada"],
  suspensa: ["activa", "cancelada"],
  roubada: ["activa", "cancelada"],
  apreendida: ["activa", "cancelada"],
  cancelada: [],
};

function AlterarEstado() {
  const { id } = Route.useParams();
  const [vehicleNumber, setVehicleNumber] = useState("—");
  const [currentStatus, setCurrentStatus] =
    useState<VehicleOperationalStatus>("activa");
  const [commercialStatus, setCommercialStatus] = useState<"normal" | "a_venda">(
    "normal",
  );
  const [newStatus, setNewStatus] = useState<VehicleOperationalStatus | "">("");
  const [reason, setReason] = useState("");
  const [occurrenceReference, setOccurrenceReference] = useState("");
  const [commercialReason, setCommercialReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingCommercial, setSavingCommercial] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const operationalDraft = useSessionDraft({
    key: "veiculos:" + id + ":estado-operacional",
    value: { newStatus, reason, occurrenceReference },
    restore: (draft) => {
      setNewStatus(draft.newStatus ?? "");
      setReason(draft.reason ?? "");
      setOccurrenceReference(draft.occurrenceReference ?? "");
      notify.info("Rascunho operacional recuperado automaticamente.");
    },
    isMeaningful: (draft) =>
      Boolean(
        draft.newStatus ||
          draft.reason?.trim() ||
          draft.occurrenceReference?.trim(),
      ),
  });

  const commercialDraft = useSessionDraft({
    key: "veiculos:" + id + ":estado-comercial",
    value: { commercialReason },
    restore: (draft) => {
      setCommercialReason(draft.commercialReason ?? "");
      notify.info("Rascunho comercial recuperado automaticamente.");
    },
    isMeaningful: (draft) => Boolean(draft.commercialReason?.trim()),
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("vehicles")
        .select("mobigest_number, status, commercial_status")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        console.error("Falha ao carregar estado do veículo:", error);
        setLoadError("Veículo não encontrado ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      setVehicleNumber(data.mobigest_number ?? "Aguardando aprovação");
      setCurrentStatus(data.status as VehicleOperationalStatus);
      setCommercialStatus(data.commercial_status as "normal" | "a_venda");
      if (!operationalDraft.hasStoredDraft) {
        setNewStatus("");
      }
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  const allowedTransitions = useMemo(
    () => TRANSITIONS[currentStatus] ?? [],
    [currentStatus],
  );

  const saveStatus = async () => {
    if (!newStatus || reason.trim().length < 4 || savingStatus) return;

    setSavingStatus(true);
    setActionError(null);
    setMessage(null);

    try {
      await setVehicleOperationalStatus({
        vehicleId: id,
        status: newStatus,
        reason: reason.trim(),
        occurrenceReference: occurrenceReference.trim() || null,
      });

      operationalDraft.clearDraft();
      setCurrentStatus(newStatus);
      setNewStatus("");
      setReason("");
      setOccurrenceReference("");
      setMessage("Estado operacional actualizado e registado no histórico.");
    } catch (error) {
      console.error("Falha ao alterar estado:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o estado.",
      );
    } finally {
      setSavingStatus(false);
    }
  };

  const toggleCommercial = async () => {
    if (commercialReason.trim().length < 4 || savingCommercial) return;

    const target = commercialStatus === "a_venda" ? "normal" : "a_venda";

    setSavingCommercial(true);
    setActionError(null);
    setMessage(null);

    try {
      await setVehicleCommercialStatus({
        vehicleId: id,
        status: target,
        reason: commercialReason.trim(),
      });

      commercialDraft.clearDraft();
      setCommercialStatus(target);
      setCommercialReason("");
      setMessage(
        target === "a_venda"
          ? "Veículo marcado como à venda."
          : "Estado comercial normalizado.",
      );
    } catch (error) {
      console.error("Falha ao alterar estado comercial:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o estado comercial.",
      );
    } finally {
      setSavingCommercial(false);
    }
  };

  return (
    <MobiGestShell
      title="Alterar estado"
      subtitle="Registar mudanças operacionais e comerciais do veículo."
    >
      <Link
        to="/veiculos/$id"
        params={{ id }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao veículo
      </Link>

      {loading ? (
        <Card className="mx-auto max-w-3xl p-8 text-sm text-slate-500">
          A carregar estado do veículo...
        </Card>
      ) : loadError ? (
        <Card className="mx-auto max-w-3xl p-8 text-sm font-medium text-red-700">
          {loadError}
        </Card>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          <Card className="p-7">
            <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle />
              </div>
              <div>
                <p className="text-xs text-slate-400">Número MobiGest</p>
                <h2 className="text-xl font-bold">{vehicleNumber}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Estado actual: <b>{stateLabel(currentStatus)}</b>
                </p>
              </div>
            </div>

            <div className="mt-7">
              <h3 className="font-semibold">Nova situação operacional</h3>
              <p className="mt-1 text-sm text-slate-500">
                Só são apresentadas transições permitidas a partir do estado actual.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {STATE_INFO.map((state) => {
                  const allowed = allowedTransitions.includes(state.value);

                  return (
                    <label
                      key={state.value}
                      className={
                        "rounded-xl border p-4 " +
                        (allowed
                          ? "cursor-pointer border-slate-200 hover:border-sky-300 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50"
                          : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-50")
                      }
                    >
                      <input
                        type="radio"
                        name="estado"
                        value={state.value}
                        checked={newStatus === state.value}
                        disabled={!allowed}
                        onChange={() => setNewStatus(state.value)}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-sky-600" />
                        {state.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {state.description}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                Motivo *
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Motivo da alteração"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>

              <label className="text-sm font-medium">
                Referência da ocorrência
                <input
                  value={occurrenceReference}
                  onChange={(event) => setOccurrenceReference(event.target.value)}
                  placeholder="Ex.: auto, participação, expediente..."
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <b>Histórico:</b> o servidor guarda estado anterior, novo estado,
              motivo, utilizador, data/hora e referência de ocorrência.
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!newStatus || reason.trim().length < 4 || savingStatus}
                onClick={saveStatus}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                <ShieldAlert className="h-4 w-4" />
                {savingStatus ? "A guardar..." : "Guardar estado operacional"}
              </button>
            </div>
          </Card>

          <Card className="p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <ShoppingCart />
              </div>
              <div>
                <h3 className="font-semibold">Situação comercial</h3>
                <p className="mt-1 text-sm text-slate-500">
                  “À venda” é separado do estado operacional do veículo.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
              Estado actual:{" "}
              <b>{commercialStatus === "a_venda" ? "À venda" : "Normal"}</b>
            </div>

            <label className="mt-4 block text-sm font-medium">
              Motivo *
              <input
                value={commercialReason}
                onChange={(event) => setCommercialReason(event.target.value)}
                placeholder={
                  commercialStatus === "a_venda"
                    ? "Motivo para retirar da venda"
                    : "Motivo para marcar como à venda"
                }
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
              />
            </label>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={
                  commercialReason.trim().length < 4 || savingCommercial
                }
                onClick={toggleCommercial}
                className="rounded-xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-700 disabled:opacity-40"
              >
                {savingCommercial
                  ? "A processar..."
                  : commercialStatus === "a_venda"
                    ? "Retirar da venda"
                    : "Marcar como à venda"}
              </button>
            </div>
          </Card>

          {actionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {actionError}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}
        </div>
      )}
    </MobiGestShell>
  );
}

function stateLabel(status: VehicleOperationalStatus) {
  const labels: Record<VehicleOperationalStatus, string> = {
    activa: "Activa",
    suspensa: "Suspensa",
    roubada: "Roubada",
    apreendida: "Apreendida",
    cancelada: "Cancelada",
  };
  return labels[status];
}
