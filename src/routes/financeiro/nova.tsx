import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CircleDollarSign } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { createCharge } from "../../lib/finance";
import { supabase } from "../../lib/supabase";
import {
  EmptyState,
  LoadingButton,
  NetworkErrorState,
  ProcessingOverlay,
  SkeletonCard,
  notify,
} from "../../components/mobigest/Experience";

export const Route = createFileRoute("/financeiro/nova")({
  head: () => ({
    meta: [
      { title: "Nova cobrança — MobiGest" },
      {
        name: "description",
        content: "Gerar cobrança com base numa taxa municipal vigente.",
      },
    ],
  }),
  component: Nova,
});

type Owner = {
  id: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
  status: string;
};

type Vehicle = {
  id: string;
  current_owner_id: string | null;
  mobigest_number: string | null;
  vehicle_type: "motorizada" | "carro" | "bicicleta";
  make: string | null;
  model: string | null;
};

type Fee = {
  id: string;
  code: string;
  name: string;
  vehicle_type: "motorizada" | "carro" | "bicicleta" | null;
  amount: number;
  valid_from: string;
  valid_to: string | null;
  active: boolean;
  conditions: string | null;
  exemption_allowed: boolean;
};

function Nova() {
  const navigate = useNavigate();

  const [owners, setOwners] = useState<Owner[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [feeId, setFeeId] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [ownersResult, vehiclesResult, feesResult] = await Promise.all([
        supabase
          .from("owners")
          .select("id, full_name, document_type, document_number, status")
          .eq("status", "activo")
          .order("full_name", { ascending: true }),
        supabase
          .from("vehicles")
          .select(
            "id, current_owner_id, mobigest_number, vehicle_type, make, model",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("fee_configs")
          .select(
            "id, code, name, vehicle_type, amount, valid_from, valid_to, active, conditions, exemption_allowed",
          )
          .eq("active", true)
          .order("name", { ascending: true }),
      ]);

      if (!active) return;

      const error =
        ownersResult.error ?? vehiclesResult.error ?? feesResult.error;

      if (error) {
        console.error("Falha ao preparar nova cobrança:", error);
        setLoadError(
          "Não foi possível carregar proprietários, veículos e taxas.",
        );
        setLoading(false);
        return;
      }

      const ownerRows = (ownersResult.data ?? []) as Owner[];
      setOwners(ownerRows);
      setVehicles((vehiclesResult.data ?? []) as Vehicle[]);
      setFees((feesResult.data ?? []) as Fee[]);

      if (ownerRows[0]) setOwnerId(ownerRows[0].id);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const ownerVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) => vehicle.current_owner_id === ownerId,
      ),
    [vehicles, ownerId],
  );

  const selectedVehicle =
    ownerVehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;

  const activeFees = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return fees.filter((fee) => {
      const valid =
        fee.active &&
        fee.valid_from <= today &&
        (!fee.valid_to || fee.valid_to >= today);

      if (!valid) return false;

      if (!selectedVehicle) {
        return fee.vehicle_type === null;
      }

      return (
        fee.vehicle_type === null ||
        fee.vehicle_type === selectedVehicle.vehicle_type
      );
    });
  }, [fees, selectedVehicle]);

  const selectedFee =
    activeFees.find((fee) => fee.id === feeId) ?? null;

  useEffect(() => {
    if (feeId && activeFees.some((fee) => fee.id === feeId)) return;
    setFeeId(activeFees[0]?.id ?? "");
  }, [activeFees, feeId]);

  const changeOwner = (value: string) => {
    setOwnerId(value);
    setVehicleId("");
    setFeeId("");
  };

  const submit = async () => {
    if (!ownerId || !selectedFee || saving) return;

    setSaving(true);
    setSaveError(null);

    try {
      const created = await createCharge({
        feeConfigId: selectedFee.id,
        ownerId,
        vehicleId: vehicleId || null,
        note: note.trim() || null,
      });

      notify.success(
        "Cobrança criada",
        "A cobrança municipal foi registada com sucesso.",
      );

      await navigate({
        to: "/financeiro/$id",
        params: { id: created.charge_id },
        replace: true,
      });
    } catch (error) {
      console.error("Falha ao criar cobrança:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível criar a cobrança.";
      setSaveError(message);
      notify.error("Não foi possível criar a cobrança", message);
    } finally {
      setSaving(false);
    }
  };

  const selectedOwner =
    owners.find((owner) => owner.id === ownerId) ?? null;

  return (
    <MobiGestShell title="Nova cobrança">
      <Link
        to="/financeiro"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Financeiro
      </Link>

      <Card className="mx-auto max-w-3xl p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <CircleDollarSign className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Gerar cobrança</h2>
            <p className="mt-1 text-sm text-slate-500">
              O valor vigente é copiado para a cobrança e permanece imutável
              mesmo que a taxa seja alterada depois.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : loadError ? (
          <div className="mt-7">
            <NetworkErrorState
              message={loadError}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </div>
        ) : owners.length === 0 ? (
          <div className="mt-7">
            <EmptyState
              title="Ainda não existem proprietários activos"
              description="Registe primeiro um proprietário para poder gerar uma cobrança municipal."
              action={
                <Link
                  to="/proprietarios/novo"
                  className="mobigest-button inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Registar proprietário
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-7 grid gap-4">
            <label className="text-sm font-medium">
              Proprietário *
              <select
                value={ownerId}
                onChange={(event) => changeOwner(event.target.value)}
                className={inputClass}
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

            <label className="text-sm font-medium">
              Veículo
              <select
                value={vehicleId}
                onChange={(event) => {
                  setVehicleId(event.target.value);
                  setFeeId("");
                }}
                className={inputClass}
              >
                <option value="">Cobrança geral / sem veículo</option>
                {ownerVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.mobigest_number || "Sem número MobiGest"} ·{" "}
                    {[vehicle.make, vehicle.model]
                      .filter(Boolean)
                      .join(" ") || vehicleTypeLabel(vehicle.vehicle_type)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium">
              Taxa vigente *
              <select
                value={feeId}
                onChange={(event) => setFeeId(event.target.value)}
                className={inputClass}
              >
                {activeFees.length === 0 ? (
                  <option value="">Sem taxa aplicável</option>
                ) : (
                  activeFees.map((fee) => (
                    <option key={fee.id} value={fee.id}>
                      {fee.code} · {fee.name} — {formatMoney(fee.amount)}
                    </option>
                  ))
                )}
              </select>
            </label>

            {activeFees.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Não existe uma taxa activa e vigente aplicável à selecção
                actual.{" "}
                <Link
                  to="/definicoes/taxas"
                  className="font-semibold underline"
                >
                  Configurar taxas municipais
                </Link>
                .
              </div>
            )}

            <label className="text-sm font-medium">
              Observação
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className={inputClass}
                placeholder="Informação opcional sobre a cobrança"
              />
            </label>

            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
              <Info
                label="Proprietário"
                value={selectedOwner?.full_name ?? "—"}
              />
              <Info
                label="Veículo"
                value={
                  selectedVehicle?.mobigest_number ||
                  (selectedVehicle
                    ? [selectedVehicle.make, selectedVehicle.model]
                        .filter(Boolean)
                        .join(" ")
                    : "Cobrança geral")
                }
              />
              <Info
                label="Valor a aplicar"
                value={
                  selectedFee ? formatMoney(selectedFee.amount) : "—"
                }
              />
            </div>

            {selectedFee?.conditions && (
              <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
                <b>Condições da taxa:</b> {selectedFee.conditions}
              </div>
            )}

            {saveError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {saveError}
              </div>
            )}

            <div className="flex justify-end">
              <LoadingButton
                onClick={submit}
                disabled={!ownerId || !selectedFee}
                state={saving ? "loading" : "idle"}
                idleLabel="Criar cobrança"
                loadingLabel="A criar cobrança..."
                className="bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40"
              />
            </div>
          </div>
        )}
      </Card>

      <ProcessingOverlay
        open={saving}
        message="A criar a cobrança municipal..."
      />
    </MobiGestShell>
  );
}

const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function vehicleTypeLabel(type: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return type;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-MZ", {
    style: "currency",
    currency: "MZN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
