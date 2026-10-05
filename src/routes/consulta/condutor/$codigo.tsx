import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  CheckCircle2,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  lookupPublicDriver,
  type PublicDriverLookup,
} from "../../../lib/public-lookup";

export const Route = createFileRoute("/consulta/condutor/$codigo")({
  component: DriverLookup,
});

function DriverLookup() {
  const { codigo } = Route.useParams();
  const [driver, setDriver] = useState<PublicDriverLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLookupError(null);

      try {
        const result = await lookupPublicDriver(codigo);
        if (!active) return;
        setDriver(result);
      } catch (error) {
        console.error("Falha na consulta pública do condutor:", error);
        if (!active) return;
        setLookupError(
          "Não foi possível verificar este taxista/condutor neste momento.",
        );
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
                (driver
                  ? "bg-sky-50 text-sky-600"
                  : "bg-slate-100 text-slate-400")
              }
            >
              <UserRoundCheck className="h-9 w-9" />
            </div>
            <p className="mt-5 text-xs uppercase tracking-wider text-slate-400">
              Referência profissional
            </p>
            <h1 className="mt-1 break-all text-2xl font-bold">
              {codigo.toUpperCase()}
            </h1>
          </div>

          <div className="p-7">
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                A verificar identificação...
              </p>
            ) : lookupError ? (
              <StatusBox
                tone="error"
                title="Consulta indisponível"
                description={lookupError}
              />
            ) : !driver ? (
              <StatusBox
                tone="warning"
                title="Referência não encontrada"
                description="Confirme a referência MTX/CDT e tente novamente."
              />
            ) : (
              <>
                <StatusBox
                  tone={
                    driver.driver_status === "activo"
                      ? "success"
                      : driver.driver_status === "suspenso"
                        ? "warning"
                        : "error"
                  }
                  title={
                    driver.driver_status === "activo"
                      ? "Identificação válida"
                      : "Identificação localizada"
                  }
                  description={
                    "Estado: " + driverStatusLabel(driver.driver_status)
                  }
                />

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <Field label="Nome profissional" value={driver.full_name} />
                  <Field
                    label="Tipo"
                    value={driverTypeLabel(driver.driver_type)}
                  />
                  <Field
                    label="Município"
                    value={driver.municipality_name}
                  />
                  <Field
                    label="Código municipal"
                    value={driver.municipality_code}
                  />
                  <Field
                    label="Veículo principal"
                    value={
                      driver.primary_vehicle_number ||
                      "Sem veículo público associado"
                    }
                  />
                  <Field
                    label="Tipo de veículo"
                    value={
                      driver.primary_vehicle_type
                        ? vehicleTypeLabel(driver.primary_vehicle_type)
                        : "—"
                    }
                  />
                </div>

                {driver.primary_vehicle_number && (
                  <Link
                    to="/consulta/$codigo"
                    params={{ codigo: driver.primary_vehicle_number }}
                    className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-sky-300"
                  >
                    <Bike className="h-5 w-5 text-sky-600" />
                    <div>
                      <p className="text-sm font-semibold">
                        Verificar veículo associado
                      </p>
                      <p className="text-xs text-slate-500">
                        {driver.primary_vehicle_number}
                      </p>
                    </div>
                  </Link>
                )}
              </>
            )}

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
              <b className="text-slate-700">Privacidade:</b> esta consulta
              mostra apenas o nome profissional abreviado e os dados mínimos
              necessários à verificação. Documento pessoal, NUIT, telefone,
              email, data de nascimento, morada e histórico não são
              apresentados.
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4" />
          MobiGest · Verificação pública protegida
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
