import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bike,
  CircleDollarSign,
  ReceiptText,
  Save,
  ShieldAlert,
  UserRoundCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { setFineCaseStatus } from "../../lib/enforcement";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/multas/$id")({
  component: FineDetail,
});

type Fine = {
  id: string;
  municipality_id: string;
  reference: string;
  driver_id: string;
  vehicle_id: string | null;
  fine_type_id: string;
  fiscal_id: string;
  charge_id: string | null;
  applied_amount: number;
  location: string | null;
  observation: string | null;
  occurred_at: string;
  status: string;
  created_at: string;
};

type Driver = {
  id: string;
  reference: string;
  full_name: string;
  driver_type: string;
  status: string;
};

type Vehicle = {
  id: string;
  mobigest_number: string | null;
  vehicle_type: string;
  make: string | null;
  model: string | null;
};

type FineType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

type Charge = {
  id: string;
  amount: number;
  status: string;
  service_type: string;
  created_at: string;
};

function FineDetail() {
  const { id } = Route.useParams();

  const [fine, setFine] = useState<Fine | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [fineType, setFineType] = useState<FineType | null>(null);
  const [fiscalName, setFiscalName] = useState("Fiscal");
  const [charge, setCharge] = useState<Charge | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const [nextStatus, setNextStatus] = useState<
    "pendente" | "anulada" | "em_recurso" | ""
  >("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const fineResult = await supabase
        .from("fines")
        .select(
          "id, municipality_id, reference, driver_id, vehicle_id, fine_type_id, fiscal_id, charge_id, applied_amount, location, observation, occurred_at, status, created_at",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (fineResult.error || !fineResult.data) {
        console.error("Falha ao carregar multa:", fineResult.error);
        setLoadError("Multa não encontrada ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      const current = fineResult.data as Fine;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [
        driverResult,
        vehicleResult,
        typeResult,
        fiscalResult,
        chargeResult,
        profileResult,
      ] = await Promise.all([
        supabase
          .from("drivers")
          .select("id, reference, full_name, driver_type, status")
          .eq("id", current.driver_id)
          .maybeSingle(),
        current.vehicle_id
          ? supabase
              .from("vehicles")
              .select("id, mobigest_number, vehicle_type, make, model")
              .eq("id", current.vehicle_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("fine_types")
          .select("id, code, name, description")
          .eq("id", current.fine_type_id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", current.fiscal_id)
          .maybeSingle(),
        current.charge_id
          ? supabase
              .from("charges")
              .select("id, amount, status, service_type, created_at")
              .eq("id", current.charge_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        user
          ? supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!active) return;

      const error =
        driverResult.error ??
        vehicleResult.error ??
        typeResult.error ??
        fiscalResult.error ??
        chargeResult.error ??
        profileResult.error;

      if (error) {
        console.error("Falha ao carregar relações da multa:", error);
        setLoadError(
          "A multa foi encontrada, mas os dados relacionados não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      setFine(current);
      setDriver(driverResult.data as Driver | null);
      setVehicle(vehicleResult.data as Vehicle | null);
      setFineType(typeResult.data as FineType | null);
      setFiscalName(fiscalResult.data?.full_name ?? "Fiscal não identificado");
      setCharge(chargeResult.data as Charge | null);
      setRole(profileResult.data?.role ?? null);
      setNextStatus("");
      setReason("");
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, refreshToken]);

  const canManageCase =
    role === "super_admin" || role === "admin_municipal";

  const applyStatus = async () => {
    if (
      !fine ||
      !nextStatus ||
      reason.trim().length < 4 ||
      savingStatus
    ) {
      return;
    }

    setSavingStatus(true);
    setActionError(null);
    setMessage(null);

    try {
      await setFineCaseStatus({
        fineId: fine.id,
        status: nextStatus,
        reason: reason.trim(),
      });

      setMessage("Estado administrativo da multa actualizado.");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao alterar estado da multa:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o estado da multa.",
      );
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <MobiGestShell
      title="Detalhe da multa"
      subtitle="Infracção, condutor, cobrança e estado administrativo."
    >
      <Link
        to="/multas"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar às multas
      </Link>

      {loading ? (
        <Card className="p-10 text-sm text-slate-500">
          A carregar multa...
        </Card>
      ) : loadError || !fine ? (
        <Card className="p-10 text-sm font-medium text-red-700">
          {loadError ?? "Multa não encontrada."}
        </Card>
      ) : (
        <div className="space-y-6">
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

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <Card className="p-7">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Referência
                  </p>
                  <h2 className="mt-1 text-3xl font-bold text-sky-700">
                    {fine.reference}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(fine.occurred_at).toLocaleString("pt-MZ")}
                  </p>
                </div>
                <StatusBadge status={fine.status} />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info
                  label="Infracção"
                  value={
                    fineType
                      ? fineType.code + " · " + fineType.name
                      : "Tipo de multa não encontrado"
                  }
                />
                <Info
                  label="Valor aplicado"
                  value={formatMoney(fine.applied_amount)}
                />
                <Info
                  label="Condutor"
                  value={
                    driver
                      ? driver.reference + " · " + driver.full_name
                      : "Condutor não encontrado"
                  }
                />
                <Info
                  label="Tipo de condutor"
                  value={driverTypeLabel(driver?.driver_type)}
                />
                <Info
                  label="Veículo"
                  value={
                    vehicle?.mobigest_number ||
                    (vehicle
                      ? [vehicle.make, vehicle.model]
                          .filter(Boolean)
                          .join(" ")
                      : "Sem veículo específico")
                  }
                />
                <Info label="Fiscal" value={fiscalName} />
                <Info
                  label="Local"
                  value={fine.location || "Não informado"}
                />
                <Info
                  label="Estado da cobrança"
                  value={charge ? chargeStatusLabel(charge.status) : "Sem cobrança"}
                />
              </div>

              <div className="mt-6">
                <p className="text-xs text-slate-400">Descrição do tipo</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {fineType?.description || "Sem descrição adicional."}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-xs text-slate-400">Observações da multa</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {fine.observation || "Sem observações."}
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {driver && (
                  <Link
                    to="/taxistas/$id"
                    params={{ id: driver.id }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                  >
                    <UserRoundCheck className="h-4 w-4" />
                    Abrir condutor
                  </Link>
                )}

                {vehicle && (
                  <Link
                    to="/veiculos/$id"
                    params={{ id: vehicle.id }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                  >
                    <Bike className="h-4 w-4" />
                    Abrir veículo
                  </Link>
                )}
              </div>
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <ReceiptText className="h-5 w-5 text-sky-600" />
                <p className="mt-3 text-xs text-slate-400">Multa</p>
                <p className="mt-1 text-lg font-bold">
                  {formatMoney(fine.applied_amount)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {statusLabel(fine.status)}
                </p>
              </Card>

              <Card className="p-5">
                <CircleDollarSign className="h-5 w-5 text-sky-600" />
                <p className="mt-3 text-xs text-slate-400">Cobrança financeira</p>

                {charge ? (
                  <>
                    <p className="mt-1 text-lg font-bold">
                      {formatMoney(charge.amount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {chargeStatusLabel(charge.status)}
                    </p>
                    <Link
                      to="/financeiro/$id"
                      params={{ id: charge.id }}
                      className="mt-4 inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                    >
                      Abrir no Financeiro
                    </Link>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Nenhuma cobrança associada.
                  </p>
                )}
              </Card>

              <Card className="p-5">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <p className="mt-3 text-sm font-semibold">
                  Estado administrativo
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Anulação e recurso exigem motivo e ficam registados na
                  auditoria. Uma multa paga não pode ser alterada por este
                  fluxo.
                </p>
              </Card>
            </div>
          </div>

          {canManageCase && fine.status !== "paga" && (
            <Card className="p-6">
              <h3 className="font-semibold">Alterar estado administrativo</h3>
              <p className="mt-1 text-sm text-slate-500">
                Acção reservada ao Admin Municipal ou Super Admin em assistência.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
                <label className="text-sm font-medium">
                  Novo estado
                  <select
                    value={nextStatus}
                    onChange={(event) =>
                      setNextStatus(
                        event.target.value as
                          | "pendente"
                          | "anulada"
                          | "em_recurso"
                          | "",
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                  >
                    <option value="">Seleccione</option>
                    {fine.status !== "pendente" && (
                      <option value="pendente">Pendente</option>
                    )}
                    {fine.status !== "em_recurso" && (
                      <option value="em_recurso">Em recurso</option>
                    )}
                    {fine.status !== "anulada" && (
                      <option value="anulada">Anulada</option>
                    )}
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Motivo *
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={3}
                    placeholder="Fundamente a alteração..."
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={
                    !nextStatus ||
                    reason.trim().length < 4 ||
                    savingStatus
                  }
                  onClick={applyStatus}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  {savingStatus ? "A guardar..." : "Guardar estado"}
                </button>
              </div>
            </Card>
          )}
        </div>
      )}
    </MobiGestShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "paga"
      ? "bg-emerald-50 text-emerald-700"
      : status === "anulada"
        ? "bg-rose-50 text-rose-700"
        : status === "em_recurso"
          ? "bg-sky-50 text-sky-700"
          : "bg-amber-50 text-amber-700";

  return (
    <span className={"rounded-full px-3 py-1.5 text-xs font-semibold " + className}>
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    paga: "Paga",
    anulada: "Anulada",
    em_recurso: "Em recurso",
  };
  return labels[status] ?? status;
}

function chargeStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_confirmacao: "Em confirmação",
    pago: "Pago",
    cancelado: "Cancelado",
    reembolsado: "Reembolsado",
  };
  return labels[status] ?? status;
}

function driverTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    mototaxista: "Mototaxista",
    taxista: "Taxista",
    condutor: "Condutor",
    outro: "Outro condutor",
  };
  return type ? labels[type] ?? type : "—";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-MZ", {
    style: "currency",
    currency: "MZN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
