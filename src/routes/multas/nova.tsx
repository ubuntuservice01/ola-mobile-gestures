import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Search,
  ShieldAlert,
  UserRoundCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { issueFine } from "../../lib/enforcement";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/multas/nova")({
  component: NovaMulta,
});

type Driver = {
  id: string;
  municipality_id: string;
  reference: string;
  full_name: string;
  driver_type: string;
  status: string;
};

type FineType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  amount: number;
};

type Vehicle = {
  id: string;
  mobigest_number: string | null;
  vehicle_type: string;
  make: string | null;
  model: string | null;
};

function NovaMulta() {
  const [reference, setReference] = useState("");
  const [driver, setDriver] = useState<Driver | null>(null);
  const [fineTypes, setFineTypes] = useState<FineType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fineTypeId, setFineTypeId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [location, setLocation] = useState("");
  const [observation, setObservation] = useState("");
  const [searching, setSearching] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    fineId: string;
    reference: string;
    chargeId: string;
    amount: number;
  } | null>(null);

  const selectedType =
    fineTypes.find((type) => type.id === fineTypeId) ?? null;

  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;

  const canIssue =
    Boolean(driver) &&
    Boolean(fineTypeId) &&
    !issuing;

  const searchDriver = async () => {
    const normalized = reference.trim().toUpperCase();
    if (!normalized || searching) return;

    setSearching(true);
    setErrorMessage(null);
    setDriver(null);
    setFineTypes([]);
    setVehicles([]);
    setFineTypeId("");
    setVehicleId("");

    const driverResult = await supabase
      .from("drivers")
      .select(
        "id, municipality_id, reference, full_name, driver_type, status",
      )
      .eq("reference", normalized)
      .maybeSingle();

    if (driverResult.error || !driverResult.data) {
      console.error("Falha ao localizar taxista/condutor:", driverResult.error);
      setErrorMessage(
        driverResult.error
          ? "Não foi possível pesquisar o taxista/condutor."
          : "Nenhum taxista/condutor foi encontrado com esta referência.",
      );
      setSearching(false);
      return;
    }

    const current = driverResult.data as Driver;

    const [typesResult, linksResult] = await Promise.all([
      supabase
        .from("fine_types")
        .select("id, code, name, description, amount")
        .eq("municipality_id", current.municipality_id)
        .eq("active", true)
        .order("name", { ascending: true }),
      supabase
        .from("driver_vehicles")
        .select("vehicle_id, is_primary")
        .eq("driver_id", current.id)
        .eq("status", "activo"),
    ]);

    if (typesResult.error || linksResult.error) {
      console.error(
        "Falha ao carregar contexto da multa:",
        typesResult.error ?? linksResult.error,
      );
      setErrorMessage(
        "O condutor foi localizado, mas os tipos de multa ou veículos não puderam ser carregados.",
      );
      setSearching(false);
      return;
    }

    const vehicleIds = [
      ...new Set((linksResult.data ?? []).map((link) => link.vehicle_id)),
    ];

    const vehiclesResult = vehicleIds.length
      ? await supabase
          .from("vehicles")
          .select("id, mobigest_number, vehicle_type, make, model")
          .in("id", vehicleIds)
      : { data: [], error: null };

    if (vehiclesResult.error) {
      console.error(
        "Falha ao carregar veículos associados:",
        vehiclesResult.error,
      );
      setErrorMessage(
        "O condutor foi localizado, mas os veículos associados não puderam ser carregados.",
      );
      setSearching(false);
      return;
    }

    const linkOrder = new Map(
      (linksResult.data ?? []).map((link) => [
        link.vehicle_id,
        link.is_primary ? 0 : 1,
      ]),
    );

    const vehicleRows = ((vehiclesResult.data ?? []) as Vehicle[]).sort(
      (a, b) =>
        (linkOrder.get(a.id) ?? 1) - (linkOrder.get(b.id) ?? 1),
    );
    const typeRows = (typesResult.data ?? []) as FineType[];

    setDriver(current);
    setFineTypes(typeRows);
    setVehicles(vehicleRows);

    if (typeRows[0]) setFineTypeId(typeRows[0].id);
    if (vehicleRows[0]) setVehicleId(vehicleRows[0].id);

    setSearching(false);
  };

  const emitFine = async () => {
    if (!driver || !fineTypeId || issuing) return;

    setIssuing(true);
    setErrorMessage(null);

    try {
      const result = await issueFine({
        driverId: driver.id,
        fineTypeId,
        vehicleId: vehicleId || null,
        location: location.trim() || null,
        observation: observation.trim() || null,
      });

      setCreated({
        fineId: result.fine_id,
        reference: result.fine_reference,
        chargeId: result.charge_id,
        amount: result.amount,
      });
    } catch (error) {
      console.error("Falha ao emitir multa:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível emitir a multa.",
      );
    } finally {
      setIssuing(false);
    }
  };

  if (created) {
    return (
      <MobiGestShell
        title="Multa emitida"
        subtitle="A multa e a cobrança foram criadas numa única transacção."
      >
        <Card className="mx-auto max-w-2xl p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-4 text-2xl font-bold">{created.reference}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {driver?.reference} · {driver?.full_name}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Info label="Valor" value={formatMoney(created.amount)} />
            <Info label="Cobrança" value={created.chargeId} />
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            A cobrança ficou pendente no módulo Financeiro. O pagamento deverá
            ser confirmado nesse módulo para actualizar o estado financeiro da
            multa.
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/multas/$id"
              params={{ id: created.fineId }}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Abrir multa
            </Link>
            <Link
              to="/financeiro/$id"
              params={{ id: created.chargeId }}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
            >
              Abrir cobrança
            </Link>
          </div>
        </Card>
      </MobiGestShell>
    );
  }

  return (
    <MobiGestShell
      title="Aplicar multa"
      subtitle="Identifique o condutor antes de registar a infracção."
    >
      <Link
        to="/multas"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Multas
      </Link>

      <div className="mx-auto max-w-4xl space-y-5">
        <Card className="p-7">
          <div className="flex items-start gap-3">
            <UserRoundCheck className="h-6 w-6 text-sky-600" />
            <div>
              <h2 className="text-lg font-bold">1. Identificar condutor</h2>
              <p className="mt-1 text-sm text-slate-500">
                Introduza a referência MTX ou CDT atribuída pelo MobiGest.
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <div className="flex flex-1 items-center rounded-xl border border-slate-300 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={reference}
                onChange={(event) =>
                  setReference(event.target.value.toUpperCase())
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void searchDriver();
                  }
                }}
                placeholder="Ex.: MTX-LIC-000001 ou CDT-LIC-000001"
                className="h-12 flex-1 px-3 outline-none"
              />
            </div>
            <button
              type="button"
              disabled={!reference.trim() || searching}
              onClick={searchDriver}
              className="rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {searching ? "A consultar..." : "Consultar"}
            </button>
          </div>

          {driver && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-900">
                {driver.reference} · {driver.full_name}
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                {driverTypeLabel(driver.driver_type)} · Estado:{" "}
                {driverStatusLabel(driver.status)}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-7">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-sky-600" />
            <div>
              <h2 className="text-lg font-bold">2. Dados da multa</h2>
              <p className="mt-1 text-sm text-slate-500">
                O valor é determinado pelo tipo de multa configurado pelo
                município e não pode ser alterado manualmente neste formulário.
              </p>
            </div>
          </div>

          {!driver ? (
            <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
              Identifique primeiro o taxista/condutor.
            </p>
          ) : fineTypes.length === 0 ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              Este município ainda não possui tipos de multa activos.{" "}
              <Link
                to="/multas/tipos"
                className="font-semibold underline"
              >
                Configurar tipos de multa
              </Link>
              .
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">
                  Tipo de multa *
                  <select
                    value={fineTypeId}
                    onChange={(event) => setFineTypeId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                  >
                    {fineTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.code} · {type.name} — {formatMoney(type.amount)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Veículo associado
                  <select
                    value={vehicleId}
                    onChange={(event) => setVehicleId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                  >
                    <option value="">Sem veículo específico</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.mobigest_number || "Sem número MobiGest"} ·{" "}
                        {[vehicle.make, vehicle.model]
                          .filter(Boolean)
                          .join(" ") || vehicleTypeLabel(vehicle.vehicle_type)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium md:col-span-2">
                  Local da infracção
                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                    placeholder="Ex.: Mercado Central, Av. ..."
                  />
                </label>

                <label className="text-sm font-medium md:col-span-2">
                  Observações
                  <textarea
                    value={observation}
                    onChange={(event) => setObservation(event.target.value)}
                    className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3"
                    placeholder="Descreva a infracção e circunstâncias relevantes."
                  />
                </label>
              </div>

              {selectedType && (
                <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                  <Info label="Código" value={selectedType.code} />
                  <Info label="Valor" value={formatMoney(selectedType.amount)} />
                  <Info
                    label="Veículo"
                    value={
                      selectedVehicle?.mobigest_number ||
                      "Não associado à multa"
                    }
                  />
                </div>
              )}

              <button
                type="button"
                disabled={!canIssue}
                onClick={emitFine}
                className="mt-6 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {issuing ? "A emitir..." : "Emitir multa e criar cobrança"}
              </button>
            </>
          )}

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}
        </Card>
      </div>
    </MobiGestShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function driverTypeLabel(type: string) {
  const labels: Record<string, string> = {
    mototaxista: "Mototaxista",
    taxista: "Taxista",
    condutor: "Condutor",
    outro: "Outro condutor",
  };
  return labels[type] ?? type;
}

function driverStatusLabel(status: string) {
  const labels: Record<string, string> = {
    activo: "Activo",
    suspenso: "Suspenso",
    bloqueado: "Bloqueado",
    inactivo: "Inactivo",
  };
  return labels[status] ?? status;
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
