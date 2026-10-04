import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike,
  CarFront,
  ChevronRight,
  CircleCheck,
  FilePlus2,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, Card } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPageRouteBoundary,
});

type DashboardCounts = {
  motorcycles: number;
  cars: number;
  bicycles: number;
  vehicles: number;
  owners: number;
  registrations: number;
  pending: number;
  stolen: number;
};

type RecentRegistration = {
  id: string;
  status: string;
  created_at: string;
  vehicle_id: string | null;
  owner_id: string;
  number: string;
  ownerName: string;
  vehicleLabel: string;
};

const EMPTY_COUNTS: DashboardCounts = {
  motorcycles: 0,
  cars: 0,
  bicycles: 0,
  vehicles: 0,
  owners: 0,
  registrations: 0,
  pending: 0,
  stolen: 0,
};

function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>(EMPTY_COUNTS);
  const [recent, setRecent] = useState<RecentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [
        motorcyclesResult,
        carsResult,
        bicyclesResult,
        vehiclesResult,
        ownersResult,
        registrationsResult,
        pendingResult,
        stolenResult,
        recentResult,
      ] = await Promise.all([
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("vehicle_type", "motorizada"),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("vehicle_type", "carro"),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("vehicle_type", "bicicleta"),
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("owners").select("id", { count: "exact", head: true }),
        supabase.from("registrations").select("id", { count: "exact", head: true }),
        supabase
          .from("registrations")
          .select("id", { count: "exact", head: true })
          .in("status", ["pendente", "em_validacao", "correccao"]),
        supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("status", "roubada"),
        supabase
          .from("registrations")
          .select("id, status, created_at, vehicle_id, owner_id")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      if (!active) return;

      const firstError =
        motorcyclesResult.error ??
        carsResult.error ??
        bicyclesResult.error ??
        vehiclesResult.error ??
        ownersResult.error ??
        registrationsResult.error ??
        pendingResult.error ??
        stolenResult.error ??
        recentResult.error;

      if (firstError) {
        console.error("Falha ao carregar dashboard municipal:", firstError);
        setLoadError("Não foi possível carregar os indicadores do município.");
        setLoading(false);
        return;
      }

      const recentBase = recentResult.data ?? [];
      const ownerIds = [...new Set(recentBase.map((row) => row.owner_id).filter(Boolean))];
      const vehicleIds = [...new Set(recentBase.map((row) => row.vehicle_id).filter(Boolean))] as string[];

      const [ownerResult, vehicleResult] = await Promise.all([
        ownerIds.length
          ? supabase.from("owners").select("id, full_name").in("id", ownerIds)
          : Promise.resolve({ data: [], error: null }),
        vehicleIds.length
          ? supabase
              .from("vehicles")
              .select("id, mobigest_number, vehicle_type, make, model")
              .in("id", vehicleIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!active) return;

      const relationError = ownerResult.error ?? vehicleResult.error;
      if (relationError) {
        console.error("Falha ao carregar registos recentes:", relationError);
        setLoadError("Os indicadores foram encontrados, mas os movimentos recentes não puderam ser carregados.");
        setLoading(false);
        return;
      }

      const ownerMap = new Map(
        (ownerResult.data ?? []).map((owner) => [owner.id, owner.full_name]),
      );
      const vehicleMap = new Map(
        (vehicleResult.data ?? []).map((vehicle) => [vehicle.id, vehicle]),
      );

      setCounts({
        motorcycles: motorcyclesResult.count ?? 0,
        cars: carsResult.count ?? 0,
        bicycles: bicyclesResult.count ?? 0,
        vehicles: vehiclesResult.count ?? 0,
        owners: ownersResult.count ?? 0,
        registrations: registrationsResult.count ?? 0,
        pending: pendingResult.count ?? 0,
        stolen: stolenResult.count ?? 0,
      });

      setRecent(
        recentBase.map((registration) => {
          const vehicle = registration.vehicle_id
            ? vehicleMap.get(registration.vehicle_id)
            : null;
          return {
            ...registration,
            number: vehicle?.mobigest_number ?? "Sem número MobiGest",
            ownerName:
              ownerMap.get(registration.owner_id) ?? "Proprietário não encontrado",
            vehicleLabel:
              [vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ||
              vehicleTypeLabel(vehicle?.vehicle_type),
          } as RecentRegistration;
        }),
      );

      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <MobiGestShell
      title="Dashboard"
      subtitle="Visão real da gestão de mobilidade do município actual."
    >
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500">Visão geral da gestão de mobilidade</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Resumo do município</h2>
        </div>
        <Link
          to="/veiculos/novo"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <FilePlus2 className="h-4 w-4" />
          Registar veículo
        </Link>
      </div>

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TypeCard
          to="/dashboard/motorizadas"
          icon={<Bike />}
          label="Motorizadas"
          value={loading ? "—" : counts.motorcycles.toLocaleString("pt-MZ")}
        />
        <TypeCard
          to="/dashboard/carros"
          icon={<CarFront />}
          label="Carros"
          value={loading ? "—" : counts.cars.toLocaleString("pt-MZ")}
        />
        <TypeCard
          to="/dashboard/bicicletas"
          icon={<Bike />}
          label="Bicicletas"
          value={loading ? "—" : counts.bicycles.toLocaleString("pt-MZ")}
        />
        <Metric
          icon={<CircleCheck />}
          label="Total de veículos"
          value={loading ? "—" : counts.vehicles.toLocaleString("pt-MZ")}
        />
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<Users />}
          label="Proprietários"
          value={loading ? "—" : counts.owners.toLocaleString("pt-MZ")}
        />
        <Metric
          icon={<FilePlus2 />}
          label="Processos de registo"
          value={loading ? "—" : counts.registrations.toLocaleString("pt-MZ")}
        />
        <Metric
          icon={<FilePlus2 />}
          label="Pendentes / validação"
          value={loading ? "—" : counts.pending.toLocaleString("pt-MZ")}
        />
        <Metric
          icon={<ShieldAlert />}
          label="Veículos roubados"
          value={loading ? "—" : counts.stolen.toLocaleString("pt-MZ")}
        />
      </section>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="font-semibold">Registos recentes</h3>
            <p className="mt-1 text-sm text-slate-500">
              Últimos processos visíveis no seu âmbito
            </p>
          </div>
          <Link to="/registos" className="text-sm font-semibold text-sky-600">
            Ver todos
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-slate-500">A carregar movimentos...</div>
        ) : recent.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">
            Ainda não existem processos de registo.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((item) => (
              <Link
                key={item.id}
                to="/registos/$id"
                params={{ id: item.id }}
                className="grid gap-2 px-6 py-4 hover:bg-slate-50 md:grid-cols-[1.1fr_1.4fr_1.2fr_0.8fr_auto] md:items-center"
              >
                <div>
                  <p className="text-sm font-semibold">{item.number}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(item.created_at).toLocaleDateString("pt-MZ")}
                  </p>
                </div>
                <p className="text-sm text-slate-600">{item.ownerName}</p>
                <p className="text-sm text-slate-600">{item.vehicleLabel}</p>
                <StatusBadge status={item.status} />
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </MobiGestShell>
  );
}

function vehicleTypeLabel(type?: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return "Veículo";
}

function TypeCard({
  to,
  icon,
  label,
  value,
}: {
  to: "/dashboard/motorizadas" | "/dashboard/carros" | "/dashboard/bicicletas";
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Link to={to}>
      <Card className="h-full p-5 transition hover:border-sky-200 hover:shadow-sm">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          {icon}
        </span>
        <p className="mt-5 text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <p className="mt-2 text-xs font-semibold text-sky-600">Abrir dashboard</p>
      </Card>
    </Link>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        {icon}
      </span>
      <p className="mt-5 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_validacao: "Em validação",
    correccao: "Correcção",
    aprovada: "Aprovada",
    rejeitada: "Rejeitada",
    cancelada: "Cancelada",
  };

  const className =
    status === "aprovada"
      ? "bg-emerald-50 text-emerald-700"
      : status === "rejeitada" || status === "cancelada"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={"w-fit rounded-full px-2.5 py-1 text-xs font-semibold " + className}>
      {labels[status] ?? status}
    </span>
  );
}

function DashboardPageRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/dashboard">
      <DashboardPage />
    </RouteIndexBoundary>
  );
}
