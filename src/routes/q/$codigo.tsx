import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import {
  lookupPublicVehicle,
  type PublicVehicleLookup,
} from "../../lib/public-lookup";

export const Route = createFileRoute("/q/$codigo")({
  component: QRConsulta,
});

function QRConsulta() {
  const { codigo } = Route.useParams();
  const [vehicle, setVehicle] = useState<PublicVehicleLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const qrValue =
    typeof window !== "undefined"
      ? window.location.href
      : "/q/" + encodeURIComponent(codigo);

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
        console.error("Falha na consulta QR do veículo:", error);
        if (!active) return;
        setLookupError("Não foi possível verificar o registo neste momento.");
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
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-md">
        <Link
          to="/consulta"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" /> Consulta pública
        </Link>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-7 text-center">
            <img
              src="/mobigest-logo.svg"
              className="mx-auto h-10 w-auto"
              alt="MobiGest"
            />
            <div className="mx-auto mt-5 flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-100 bg-white">
              <QRCodeSVG value={qrValue} size={78} level="M" includeMargin />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Número MobiGest
            </p>
            <h1 className="mt-1 break-all text-2xl font-bold tracking-tight text-slate-900">
              {codigo.toUpperCase()}
            </h1>
          </div>

          <div className="p-7">
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                A verificar registo...
              </p>
            ) : lookupError ? (
              <StatusBox
                tone="error"
                title="Consulta indisponível"
                description={lookupError}
              />
            ) : !vehicle ? (
              <StatusBox
                tone="warning"
                title="Registo não encontrado"
                description="Este QR não corresponde a um veículo público válido no MobiGest."
              />
            ) : (
              <>
                <StatusBox
                  tone={
                    vehicle.operational_status === "activa"
                      ? "success"
                      : vehicle.operational_status === "roubada" ||
                          vehicle.operational_status === "cancelada"
                        ? "error"
                        : "warning"
                  }
                  title="Registo verificado"
                  description={
                    "Estado: " +
                    statusLabel(vehicle.operational_status) +
                    (vehicle.commercial_status === "a_venda"
                      ? " · À venda"
                      : "")
                  }
                />

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 shrink-0 text-sky-600" />
                  Registo municipal verificado ·{" "}
                  {vehicle.municipality_code}
                </div>
              </>
            )}

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
              A consulta pública mostra apenas dados necessários à verificação.
              Dados pessoais, identificadores técnicos, localização detalhada,
              documentos e pagamentos não são apresentados.
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4" /> Consulta pública MobiGest
        </div>
      </div>
    </main>
  );
}

function StatusBox({
  tone,
  title,
  description,
}: {
  tone: "success" | "warning" | "error";
  title: string;
  description: string;
}) {
  const className =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "error"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-800";

  return (
    <div className={"rounded-xl p-5 text-center " + className}>
      {tone === "success" ? (
        <CheckCircle2 className="mx-auto h-8 w-8" />
      ) : (
        <AlertTriangle className="mx-auto h-8 w-8" />
      )}
      <p className="mt-2 font-semibold">{title}</p>
      <p className="mt-1 text-sm opacity-75">{description}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
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
