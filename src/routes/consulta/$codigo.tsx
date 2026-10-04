import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  lookupPublicVehicle,
  type PublicVehicleLookup,
} from "../../lib/public-lookup";

export const Route = createFileRoute("/consulta/$codigo")({
  component: Resultado,
});

function Resultado() {
  const { codigo } = Route.useParams();
  const [vehicle, setVehicle] = useState<PublicVehicleLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLookupError(null);

      try {
        const result = await lookupPublicVehicle(codigo);
        if (!active) return;
        setVehicle(result);
      } catch (error) {
        console.error("Falha na consulta pública do veículo:", error);
        if (!active) return;
        setLookupError("Não foi possível consultar o registo neste momento.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [codigo]);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-xl">
        <Link
          to="/consulta"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"
        >
          <ArrowLeft className="h-4 w-4" /> Nova consulta
        </Link>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b p-7 text-center">
            <img
              src="/mobigest-logo.svg"
              className="mx-auto h-10 w-auto"
              alt="MobiGest"
            />
            <div
              className={
                "mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-2xl " +
                (vehicle
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-400")
              }
            >
              <ShieldCheck className="h-9 w-9" />
            </div>
            <p className="mt-5 text-xs uppercase tracking-wider text-slate-400">
              Número MobiGest
            </p>
            <h1 className="mt-1 break-all text-2xl font-bold">
              {codigo.toUpperCase()}
            </h1>
          </div>

          <div className="p-7">
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                A verificar registo...
              </p>
            ) : lookupError ? (
              <div className="rounded-xl bg-rose-50 p-5 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
                <p className="mt-2 font-semibold text-rose-700">
                  Consulta indisponível
                </p>
                <p className="mt-1 text-sm text-rose-700/75">
                  {lookupError}
                </p>
              </div>
            ) : !vehicle ? (
              <div className="rounded-xl bg-amber-50 p-5 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-amber-600" />
                <p className="mt-2 font-semibold text-amber-800">
                  Registo não encontrado
                </p>
                <p className="mt-1 text-sm text-amber-700/75">
                  Confirme o número MobiGest e tente novamente.
                </p>
              </div>
            ) : (
              <>
                <div className={statusBox(vehicle.operational_status)}>
                  <CheckCircle2 className="mx-auto h-8 w-8" />
                  <p className="mt-2 font-semibold">Registo localizado</p>
                  <p className="mt-1 text-sm opacity-75">
                    Estado actual: {statusLabel(vehicle.operational_status)}
                    {vehicle.commercial_status === "a_venda"
                      ? " · À venda"
                      : ""}
                  </p>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Tipo"
                    value={vehicleTypeLabel(vehicle.vehicle_type)}
                  />
                  <Field label="Marca" value={vehicle.make || "—"} />
                  <Field label="Modelo" value={vehicle.model || "—"} />
                  <Field label="Cor" value={vehicle.color || "—"} />
                  <Field
                    label="Ano"
                    value={
                      vehicle.manufacture_year
                        ? String(vehicle.manufacture_year)
                        : "—"
                    }
                  />
                  <Field
                    label="Município"
                    value={vehicle.municipality_name}
                  />
                  <Field
                    label="Código municipal"
                    value={vehicle.municipality_code}
                  />
                  <Field
                    label="Data de registo"
                    value={
                      vehicle.registration_date
                        ? new Date(
                            vehicle.registration_date,
                          ).toLocaleDateString("pt-MZ")
                        : "—"
                    }
                  />
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <QrCode className="h-5 w-5 text-sky-600" />
                    <div>
                      <p className="text-sm font-semibold">
                        Identificação pública
                      </p>
                      <p className="text-xs text-slate-500">
                        O número e o QR Code correspondem ao registo consultado.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
              <b className="text-slate-700">Privacidade:</b> proprietário,
              BI/NUIT, contactos, morada, chassis/quadro, motor, documentação,
              fiscalização, pagamentos e localização detalhada não são
              apresentados nesta consulta.
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4" />
          MobiGest · Consulta pública protegida
        </div>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function vehicleTypeLabel(type: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return type;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    activa: "Activa",
    suspensa: "Suspensa",
    roubada: "Roubada",
    apreendida: "Apreendida",
    cancelada: "Cancelada",
  };
  return labels[status] ?? status;
}

function statusBox(status: string) {
  if (status === "activa") {
    return "rounded-xl bg-emerald-50 p-5 text-center text-emerald-700";
  }
  if (status === "roubada" || status === "cancelada") {
    return "rounded-xl bg-rose-50 p-5 text-center text-rose-700";
  }
  return "rounded-xl bg-amber-50 p-5 text-center text-amber-800";
}
