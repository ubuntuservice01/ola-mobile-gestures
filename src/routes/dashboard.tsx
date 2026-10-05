import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike,
  CarFront,
  ChevronRight,
  CircleCheck,
  FilePlus2,
  ReceiptText,
  ShieldAlert,
  UserRoundCheck,
  Users,
  Wallet,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { MobiGestShell, Card } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";
import { loadMunicipalityStatistics } from "../lib/municipality-settings";
import {
  AnimatedNumber,
  EmptyState,
  NetworkErrorState,
  SkeletonCard,
  SkeletonTable,
  StatusBadge,
} from "../components/mobigest/Experience";
import { formatDate, formatMoneyMt } from "../lib/format";

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
  drivers: number;
  fines: number;
  revenue: number;
  users: number;
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
  drivers: 0,
  fines: 0,
  revenue: 0,
  users: 0,
};

function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>(EMPTY_COUNTS);
  const [recent, setRecent] = useState<RecentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [
        municipalStats,
        pendingResult,
        stolenResult,
        recentResult,
      ] = await Promise.all([
        loadMunicipalityStatistics(),
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
        pendingResult.error ??
        stolenResult.error ??
        recentResult.error;

      if (firstError || !municipalStats) {
        console.error(
          "Falha ao carregar dashboard municipal:",
          firstError ?? "Estatísticas municipais indisponíveis",
        );
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
        motorcycles: Number(municipalStats.motorcycles_total ?? 0),
        cars: Number(municipalStats.cars_total ?? 0),
        bicycles: Number(municipalStats.bicycles_total ?? 0),
        vehicles: Number(municipalStats.vehicles_total ?? 0),
        owners: Number(municipalStats.owners_total ?? 0),
        registrations: Number(municipalStats.registrations_total ?? 0),
        pending: pendingResult.count ?? 0,
        stolen: stolenResult.count ?? 0,
        drivers: Number(municipalStats.drivers_total ?? 0),
        fines: Number(municipalStats.fines_total ?? 0),
        revenue: Number(municipalStats.revenue_total ?? 0),
        users: Number(municipalStats.users_total ?? 0),
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
  }, [reloadKey]);

  return (
    <MobiGestShell title="Dashboard">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Visão geral
          </p>
          <h2 className="mt-1.5 text-[26px] font-bold tracking-[-0.03em] text-slate-950">
            Resumo do município
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Indicadores actualizados da operação municipal de mobilidade.
          </p>
        </div>
        <Link
          to="/veiculos/novo"
          className="mobigest-button inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--municipal-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-95"
        >
          <FilePlus2 className="h-4 w-4" />
          Registar veículo
        </Link>
      </div>

      {loadError && (
        <div className="mb-5">
          <NetworkErrorState
            message={loadError}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        </div>
      )}

      {loading ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </section>
          <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </section>
          <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </section>
        </>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TypeCard
              to="/dashboard/motorizadas"
              icon={<Bike />}
              label="Motorizadas"
              value={counts.motorcycles}
            />
            <TypeCard
              to="/dashboard/carros"
              icon={<CarFront />}
              label="Carros"
              value={counts.cars}
            />
            <TypeCard
              to="/dashboard/bicicletas"
              icon={<Bike />}
              label="Bicicletas"
              value={counts.bicycles}
            />
            <Metric
              icon={<CircleCheck />}
              label="Total de veículos"
              value={counts.vehicles}
            />
          </section>

          <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={<Users />}
              label="Proprietários"
              value={counts.owners}
            />
            <Metric
              icon={<FilePlus2 />}
              label="Processos de registo"
              value={counts.registrations}
            />
            <Metric
              icon={<FilePlus2 />}
              label="Pendentes / validação"
              value={counts.pending}
            />
            <Metric
              icon={<ShieldAlert />}
              label="Veículos roubados"
              value={counts.stolen}
            />
          </section>

          <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <LinkedMetric
              to="/taxistas"
              icon={<UserRoundCheck />}
              label="Taxistas"
              value={counts.drivers}
            />
            <LinkedMetric
              to="/multas"
              icon={<ReceiptText />}
              label="Multas"
              value={counts.fines}
            />
            <LinkedMetric
              to="/financeiro"
              icon={<Wallet />}
              label="Receitas"
              value={counts.revenue}
              formatter={formatMoneyMt}
            />
            <LinkedMetric
              to="/utilizadores"
              icon={<Users />}
              label="Utilizadores"
              value={counts.users}
            />
          </section>
        </>
      )}

      <Card className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h3 className="font-semibold">Registos recentes</h3>
            <p className="mt-1 text-sm text-slate-500">
              Últimos processos visíveis no seu âmbito
            </p>
          </div>
          <Link
            to="/registos"
            className="mobigest-interactive inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-[var(--municipal-primary)] hover:bg-slate-50"
          >
            Ver todos
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="p-5">
            <SkeletonTable rows={4} columns={5} />
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            title="Ainda não existem processos de registo"
            description="Quando o primeiro registo for criado, os movimentos mais recentes aparecerão aqui."
            action={
              <Link
                to="/veiculos/novo"
                className="mobigest-button inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Registar veículo
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((item) => (
              <Link
                key={item.id}
                to="/registos/$id"
                params={{ id: item.id }}
                className="mobigest-table-row grid gap-2 px-5 py-3.5 hover:bg-slate-50/80 sm:px-6 md:grid-cols-[1.1fr_1.4fr_1.2fr_0.8fr_auto] md:items-center"
              >
                <div>
                  <p className="text-sm font-semibold">{item.number}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(item.created_at)}
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
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Link to={to} className="group">
      <Card className="mobigest-card-interactive h-full p-4 hover:border-slate-300">
        <div className="flex items-start justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 [&>svg]:h-[18px] [&>svg]:w-[18px]">
            {icon}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors group-hover:bg-slate-50 group-hover:text-slate-600">
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-4 text-[13px] font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-[28px] font-bold tracking-[-0.035em] text-slate-950">
          <AnimatedNumber value={value} />
        </p>
        <p className="mt-2 text-[11px] font-semibold text-[var(--municipal-primary)]">
          Ver detalhe
        </p>
      </Card>
    </Link>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card className="h-full p-4">
      <div className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 [&>svg]:h-[18px] [&>svg]:w-[18px]">
          {icon}
        </span>
        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
      </div>
      <p className="mt-4 text-[13px] font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-[28px] font-bold tracking-[-0.035em] text-slate-950">
        <AnimatedNumber value={value} />
      </p>
    </Card>
  );
}

function LinkedMetric({
  to,
  icon,
  label,
  value,
  formatter,
}: {
  to: "/taxistas" | "/multas" | "/financeiro" | "/utilizadores";
  icon: ReactNode;
  label: string;
  value: number;
  formatter?: (value: number) => string;
}) {
  return (
    <Link to={to} className="group">
      <Card className="mobigest-card-interactive h-full p-4 hover:border-slate-300">
        <div className="flex items-start justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 [&>svg]:h-[18px] [&>svg]:w-[18px]">
            {icon}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors group-hover:bg-slate-50 group-hover:text-slate-600">
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-4 text-[13px] font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-[28px] font-bold tracking-[-0.035em] text-slate-950">
          <AnimatedNumber value={value} formatter={formatter} />
        </p>
        <p className="mt-2 text-[11px] font-semibold text-[var(--municipal-primary)]">
          Abrir módulo
        </p>
      </Card>
    </Link>
  );
}

function DashboardPageRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/dashboard">
      <DashboardPage />
    </RouteIndexBoundary>
  );
}
