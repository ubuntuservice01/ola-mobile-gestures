import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";
import {
  ConfirmDialog,
  LoadingButton,
  NetworkErrorState,
  ProcessingOverlay,
  ProgressSteps,
  SkeletonCard,
  notify,
} from "../../../components/mobigest/Experience";
import { requestVehicleTransfer } from "../../../lib/vehicles";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/veiculos/$id/transferir")({
  component: Transferir,
});

type Owner = {
  id: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  status: string;
};

type Vehicle = {
  id: string;
  mobigest_number: string | null;
  current_owner_id: string | null;
  status: string;
  make: string | null;
  model: string | null;
};

function Transferir() {
  const { id } = Route.useParams();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [currentOwner, setCurrentOwner] = useState<Owner | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [newOwnerId, setNewOwnerId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [created, setCreated] = useState<{
    registrationId: string;
    reference: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const vehicleResult = await supabase
        .from("vehicles")
        .select("id, mobigest_number, current_owner_id, status, make, model")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (vehicleResult.error || !vehicleResult.data) {
        console.error(
          "Falha ao carregar veículo para transferência:",
          vehicleResult.error,
        );
        setLoadError("Veículo não encontrado ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      const currentVehicle = vehicleResult.data as Vehicle;

      const [currentOwnerResult, ownersResult] = await Promise.all([
        currentVehicle.current_owner_id
          ? supabase
              .from("owners")
              .select(
                "id, full_name, document_type, document_number, phone, status",
              )
              .eq("id", currentVehicle.current_owner_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("owners")
          .select(
            "id, full_name, document_type, document_number, phone, status",
          )
          .eq("status", "activo")
          .order("full_name", { ascending: true }),
      ]);

      if (!active) return;

      const error = currentOwnerResult.error ?? ownersResult.error;
      if (error) {
        console.error("Falha ao carregar proprietários:", error);
        setLoadError("Não foi possível carregar os proprietários.");
        setLoading(false);
        return;
      }

      const candidates = ((ownersResult.data ?? []) as Owner[]).filter(
        (owner) => owner.id !== currentVehicle.current_owner_id,
      );

      setVehicle(currentVehicle);
      setCurrentOwner(currentOwnerResult.data as Owner | null);
      setOwners(candidates);
      if (candidates[0]) setNewOwnerId(candidates[0].id);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const newOwner = owners.find((owner) => owner.id === newOwnerId) ?? null;
  const canTransfer =
    Boolean(vehicle) &&
    vehicle?.status === "activa" &&
    Boolean(currentOwner) &&
    Boolean(newOwnerId) &&
    reason.trim().length >= 4 &&
    !submitting;

  const submit = async () => {
    if (!canTransfer) return;

    setSubmitting(true);
    setActionError(null);

    try {
      const result = await requestVehicleTransfer({
        vehicleId: id,
        newOwnerId,
        reason: reason.trim(),
      });

      setCreated({
        registrationId: result.registration_id,
        reference: result.registration_reference,
      });
      notify.success(
        "Transferência submetida",
        "O processo ficou pendente de validação.",
      );
    } catch (error) {
      console.error("Falha ao iniciar transferência:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a transferência.";
      setActionError(message);
      setConfirmOpen(false);
      notify.error("Não foi possível iniciar a transferência", message);
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <MobiGestShell
        title="Transferência submetida"
        subtitle="A propriedade só será alterada depois da aprovação do processo."
      >
        <Card className="mx-auto max-w-2xl p-8 text-center">
          <FileCheck2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-4 text-2xl font-bold">{created.reference}</h2>
          <p className="mt-2 text-sm text-slate-500">
            Processo de transferência pendente de validação.
          </p>

          <div className="mx-auto mt-7 max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
            <ProgressSteps
              steps={[
                {
                  label: "Pedido criado",
                  status: "complete",
                  meta: created.reference,
                },
                {
                  label: "Aguarda validação",
                  status: "current",
                  meta: "O proprietário actual ainda permanece associado ao veículo.",
                },
                {
                  label: "Aprovação do processo",
                  status: "upcoming",
                },
                {
                  label: "Transferência concluída",
                  status: "upcoming",
                },
              ]}
            />
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/registos/$id"
              params={{ id: created.registrationId }}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Abrir processo
            </Link>
            <Link
              to="/veiculos/$id"
              params={{ id }}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
            >
              Voltar ao veículo
            </Link>
          </div>
        </Card>
      </MobiGestShell>
    );
  }

  return (
    <MobiGestShell
      title="Transferência de propriedade"
      subtitle="Criar um processo controlado de mudança de proprietário."
    >
      <Link
        to="/veiculos/$id"
        params={{ id }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao veículo
      </Link>

      {loading ? (
        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : loadError || !vehicle ? (
        <div className="mx-auto max-w-4xl">
          <NetworkErrorState
            message={loadError ?? "Veículo não encontrado."}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        </div>
      ) : (
        <div className="mx-auto max-w-4xl">
          <Card className="p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <FileCheck2 />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  Transferir {vehicle.mobigest_number || "veículo"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {[vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
                    "Veículo"}{" "}
                  · Estado: {vehicle.status}
                </p>
              </div>
            </div>

            {vehicle.status !== "activa" && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                A transferência só pode ser iniciada para um veículo activo.
              </div>
            )}

            <div className="mt-7 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
              <OwnerCard title="Proprietário actual" owner={currentOwner} />

              <div className="mx-auto rounded-full bg-slate-100 p-3">
                <ArrowRight className="text-slate-400" />
              </div>

              <OwnerCard title="Novo proprietário" owner={newOwner} />
            </div>

            <div className="my-8 border-t border-slate-100 pt-7">
              <h3 className="font-semibold">Novo proprietário</h3>

              {owners.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                  Não existe outro proprietário activo disponível.{" "}
                  <Link
                    to="/proprietarios/novo"
                    className="font-semibold text-sky-700"
                  >
                    Registar proprietário
                  </Link>
                </div>
              ) : (
                <label className="mt-4 block text-sm font-medium">
                  Seleccionar proprietário *
                  <select
                    value={newOwnerId}
                    onChange={(event) => setNewOwnerId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                  >
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.full_name}
                        {owner.document_number
                          ? " · " +
                            [owner.document_type, owner.document_number]
                              .filter(Boolean)
                              .join(" ")
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="mt-4 block text-sm font-medium">
                Motivo / fundamento da transferência *
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  placeholder="Ex.: compra e venda, doação, sucessão..."
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3"
                />
              </label>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              <b>Atenção:</b> esta acção não troca imediatamente o proprietário.
              Ela cria um processo de transferência. O dono actual só muda quando
              o processo for aprovado; o histórico de propriedade será preservado.
            </div>

            {actionError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {actionError}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Link
                to="/veiculos/$id"
                params={{ id }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
              >
                Cancelar
              </Link>
              <LoadingButton
                onClick={() => setConfirmOpen(true)}
                disabled={!canTransfer}
                state={submitting ? "loading" : "idle"}
                idleLabel="Criar processo de transferência"
                loadingLabel="A criar processo..."
                icon={<Check className="h-4 w-4" />}
                className="bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40"
              />
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Criar processo de transferência?"
        description={
          "Será criado um processo para transferir " +
          (vehicle?.mobigest_number || "este veículo") +
          " de " +
          (currentOwner?.full_name || "proprietário actual") +
          " para " +
          (newOwner?.full_name || "o novo proprietário") +
          ". A propriedade só muda depois da aprovação."
        }
        confirmLabel="Criar transferência"
        onConfirm={submit}
        busy={submitting}
      />

      <ProcessingOverlay
        open={submitting}
        message="A criar processo de transferência..."
      />
    </MobiGestShell>
  );
}

function OwnerCard({
  title,
  owner,
}: {
  title: string;
  owner: Owner | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      {owner ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
            <UserRound className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{owner.full_name}</p>
            <p className="text-xs text-slate-500">
              {owner.document_number
                ? [owner.document_type, owner.document_number]
                    .filter(Boolean)
                    .join(" · ")
                : owner.phone || "Sem documento"}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Não seleccionado.</p>
      )}
    </div>
  );
}
