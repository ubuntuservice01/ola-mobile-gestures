import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Clock3, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DocumentManager } from "../../../components/DocumentManager";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/veiculos/$id/documentos")({
  component: Documentos,
});

type VehicleContext = {
  id: string;
  municipality_id: string;
  vehicle_type: string;
  mobigest_number: string | null;
  make: string | null;
  model: string | null;
};

type RegistrationContext = {
  id: string;
  reference: string | null;
  status: string;
  registration_type: string;
};

function Documentos() {
  const { id } = Route.useParams();
  const [vehicle, setVehicle] = useState<VehicleContext | null>(null);
  const [registration, setRegistration] =
    useState<RegistrationContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const vehicleResult = await supabase
        .from("vehicles")
        .select(
          "id, municipality_id, vehicle_type, mobigest_number, make, model",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (vehicleResult.error || !vehicleResult.data) {
        console.error(
          "Falha ao carregar veículo para documentos:",
          vehicleResult.error,
        );
        setLoadError("Veículo não encontrado ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      const registrationResult = await supabase
        .from("registrations")
        .select("id, reference, status, registration_type")
        .eq("vehicle_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (registrationResult.error) {
        console.error(
          "Falha ao carregar processo documental:",
          registrationResult.error,
        );
        setLoadError("Não foi possível carregar o processo do veículo.");
        setLoading(false);
        return;
      }

      setVehicle(vehicleResult.data as VehicleContext);
      setRegistration(
        registrationResult.data as RegistrationContext | null,
      );
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <MobiGestShell
      title="Documentos do veículo"
      subtitle="Ficheiros privados, requisitos e validação documental."
    >
      <Link
        to="/veiculos/$id"
        params={{ id }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao veículo
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Documentação</h2>
          <p className="mt-1 text-sm text-slate-500">
            Os documentos do processo são avaliados antes da aprovação.
          </p>
        </div>
        <Link
          to="/definicoes/documentos"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
        >
          <Settings2 className="h-4 w-4" />
          Matriz de requisitos
        </Link>
      </div>

      {loading ? (
        <Card className="p-8 text-sm text-slate-500">
          A carregar contexto documental...
        </Card>
      ) : loadError || !vehicle ? (
        <Card className="p-8 text-sm font-medium text-red-700">
          {loadError ?? "Veículo não encontrado."}
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Veículo
            </p>
            <p className="mt-1 text-lg font-bold">
              {vehicle.mobigest_number ||
                [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
                vehicle.id}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {registration
                ? "Processo mais recente: " +
                  (registration.reference || registration.id) +
                  " · " +
                  registration.status
                : "Sem processo de registo associado."}
            </p>
          </Card>

          {registration && (
            <DocumentManager
              municipalityId={vehicle.municipality_id}
              subjectType="registration"
              subjectId={registration.id}
              vehicleType={vehicle.vehicle_type}
              title={
                "Documentos do processo " +
                (registration.reference || registration.id)
              }
            />
          )}

          <DocumentManager
            municipalityId={vehicle.municipality_id}
            subjectType="vehicle"
            subjectId={vehicle.id}
            vehicleType={vehicle.vehicle_type}
            title="Documentos permanentes do veículo"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="mt-3 text-sm font-semibold">
                Regra de validação
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                A aprovação verifica no servidor os requisitos obrigatórios
                configurados para o município e tipo de veículo.
              </p>
            </Card>

            <Card className="p-5">
              <Clock3 className="h-5 w-5 text-amber-600" />
              <p className="mt-3 text-sm font-semibold">Validade</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Datas de emissão e validade ficam associadas aos metadados do
                documento e podem alimentar alertas futuros.
              </p>
            </Card>
          </div>
        </div>
      )}
    </MobiGestShell>
  );
}
