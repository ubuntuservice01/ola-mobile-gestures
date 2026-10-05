import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike,
  CarFront,
  ClipboardCheck,
  FilePlus2,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";
import { loadMunicipalityStatistics } from "../lib/municipality-settings";
import {
  EmptyState,
  NetworkErrorState,
  SkeletonCard,
  SkeletonTable,
  StatusBadge,
} from "../components/mobigest/Experience";
import {
  AnalyticsChartCard,
  AnalyticsKpiCard,
  ChartSkeleton,
  CompactStat,
  DistributionDonut,
  ModuleHeader,
  RegistrationsAreaChart,
  RevenueBarChart,
  type Trend,
} from "../components/mobigest/Analytics";
import { formatDate, formatMoneyMt } from "../lib/format";
import { loadAccessProfile } from "../lib/access-control";
import {
  loadRbac,
  permissionCodeSet,
  type RoleCode,
} from "../lib/permissions";

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
  fiscalizations: number;
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

type AuditActivity = {
  id: string;
  module: string;
  action: string;
  reference: string | null;
  created_at: string;
  actorName: string;
  result: string;
};

type MonthlyPoint = {
  month: string;
  total: number;
};

type StatusPoint = {
  status: string;
  total: number;
};

type TypePoint = {
  type: string;
  total: number;
};

type DashboardAnalytics = {
  registrations_monthly: MonthlyPoint[] | null;
  revenue_monthly: MonthlyPoint[] | null;
  fines_monthly: MonthlyPoint[] | null;
  drivers_monthly: MonthlyPoint[] | null;
  fiscalizations_monthly: MonthlyPoint[] | null;
  fines_by_status: StatusPoint[] | null;
  drivers_by_status: StatusPoint[] | null;
  drivers_by_type: TypePoint[] | null;
  fiscalizations_total: number | null;
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
  fiscalizations: 0,
};

function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>(EMPTY_COUNTS);
  const [recent, setRecent] = useState<RecentRegistration[]>([]);
  const [activities, setActivities] = useState<AuditActivity[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [allowedPermissions, setAllowedPermissions] = useState<Set<string>>(
    new Set(),
  );
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
        analyticsResult,
        pendingResult,
        stolenResult,
        recentResult,
        auditResult,
        authResult,
      ] = await Promise.all([
        loadMunicipalityStatistics(),
        supabase.rpc("current_municipality_dashboard_analytics"),
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
          .limit(6),
        supabase
          .from("audit_logs")
          .select(
            "id, module, action, reference, created_at, actor_user_id, result",
          )
          .order("created_at", { ascending: false })
          .limit(7),
        supabase.auth.getSession(),
      ]);

      if (!active) return;

      const firstError =
        analyticsResult.error ??
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

      const analyticsRow = (analyticsResult.data?.[0] ??
        null) as DashboardAnalytics | null;
      setAnalytics(analyticsRow);

      const recentBase = recentResult.data ?? [];
      const ownerIds = [
        ...new Set(recentBase.map((row) => row.owner_id).filter(Boolean)),
      ];
      const vehicleIds = [
        ...new Set(recentBase.map((row) => row.vehicle_id).filter(Boolean)),
      ] as string[];

      const auditRows = auditResult.error ? [] : auditResult.data ?? [];
      const actorIds = [
        ...new Set(
          auditRows.map((row) => row.actor_user_id).filter(Boolean),
        ),
      ] as string[];

      const [ownerResult, vehicleResult, actorResult] = await Promise.all([
        ownerIds.length
          ? supabase.from("owners").select("id, full_name").in("id", ownerIds)
          : Promise.resolve({ data: [], error: null }),
        vehicleIds.length
          ? supabase
              .from("vehicles")
              .select("id, mobigest_number, vehicle_type, make, model")
              .in("id", vehicleIds)
          : Promise.resolve({ data: [], error: null }),
        actorIds.length
          ? supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", actorIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!active) return;

      const relationError =
        ownerResult.error ?? vehicleResult.error ?? actorResult.error;
      if (relationError) {
        console.error("Falha ao carregar relações do dashboard:", relationError);
      }

      const ownerMap = new Map(
        (ownerResult.data ?? []).map((owner) => [owner.id, owner.full_name]),
      );
      const vehicleMap = new Map(
        (vehicleResult.data ?? []).map((vehicle) => [vehicle.id, vehicle]),
      );
      const actorMap = new Map(
        (actorResult.data ?? []).map((actor) => [actor.id, actor.full_name]),
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
        fiscalizations: Number(analyticsRow?.fiscalizations_total ?? 0),
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
              ownerMap.get(registration.owner_id) ??
              "Proprietário não encontrado",
            vehicleLabel:
              [vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ||
              vehicleTypeLabel(vehicle?.vehicle_type),
          } as RecentRegistration;
        }),
      );

      setActivities(
        auditRows.map((row) => ({
          id: row.id,
          module: row.module,
          action: row.action,
          reference: row.reference,
          created_at: row.created_at,
          actorName:
            (row.actor_user_id ? actorMap.get(row.actor_user_id) : null) ??
            "Sistema",
          result: row.result,
        })),
      );

      const authUser = authResult.data.session?.user ?? null;
      if (authUser) {
        try {
          const profile = await loadAccessProfile(authUser.id);
          if (profile && isRoleCode(profile.role)) {
            const rbac = await loadRbac();
            if (active) {
              setAllowedPermissions(
                permissionCodeSet(
                  rbac.permissions,
                  rbac.rolePermissions,
                  profile.role,
                ),
              );
            }
          }
        } catch (error) {
          console.error("Falha ao carregar acções rápidas:", error);
        }
      }

      if (active) setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const registrationSeries = useMemo(
    () => monthSeries(analytics?.registrations_monthly ?? []),
    [analytics],
  );
  const revenueSeries = useMemo(
    () => monthSeries(analytics?.revenue_monthly ?? []),
    [analytics],
  );
  const finesSeries = useMemo(
    () => monthSeries(analytics?.fines_monthly ?? []),
    [analytics],
  );
  const driverSeries = useMemo(
    () => monthSeries(analytics?.drivers_monthly ?? []),
    [analytics],
  );

  const vehicleDistribution = [
    { name: "Motorizadas", value: counts.motorcycles },
    { name: "Carros", value: counts.cars },
    { name: "Bicicletas", value: counts.bicycles },
  ];

  const fineDistribution = (analytics?.fines_by_status ?? []).map((item) => ({
    name: fineStatusLabel(item.status),
    value: Number(item.total),
  }));

  const driverDistribution = (analytics?.drivers_by_status ?? []).map(
    (item) => ({
      name: driverStatusLabel(item.status),
      value: Number(item.total),
    }),
  );

  const registrationTrend = calculateTrend(registrationSeries);
  const revenueTrend = calculateTrend(revenueSeries);
  const finesTrend = calculateTrend(finesSeries);
  const driversTrend = calculateTrend(driverSeries);

  return (
    <MobiGestShell title="Dashboard">
      <ModuleHeader
        eyebrow="Visão geral"
        title="Resumo do município"
        description="Indicadores operacionais, financeiros e de fiscalização actualizados com dados reais do município."
        icon={<Zap />}
        action={
          <Link
            to="/veiculos/novo"
            className="mobigest-button inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--municipal-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:-translate-y-px hover:brightness-95 hover:shadow-md"
          >
            <FilePlus2 className="h-4 w-4" />
            Registar veículo
          </Link>
        }
      />

      {loadError && (
        <div className="mb-5">
          <NetworkErrorState
            message={loadError}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          <>
            <AnalyticsKpiCard
              to="/dashboard/motorizadas"
              icon={<Bike />}
              label="Motorizadas"
              value={counts.motorcycles}
              note="Registos activos"
            />
            <AnalyticsKpiCard
              to="/dashboard/carros"
              icon={<CarFront />}
              label="Carros"
              value={counts.cars}
              note="Registos activos"
            />
            <AnalyticsKpiCard
              to="/dashboard/bicicletas"
              icon={<Bike />}
              label="Bicicletas"
              value={counts.bicycles}
              note="Registos activos"
            />
            <AnalyticsKpiCard
              to="/veiculos"
              icon={<ClipboardCheck />}
              label="Total de veículos"
              value={counts.vehicles}
              trend={registrationTrend}
              note="Sem histórico comparável"
              emphasis
            />
          </>
        )}
      </section>

      <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          <>
            <AnalyticsKpiCard
              to="/proprietarios"
              icon={<Users />}
              label="Proprietários"
              value={counts.owners}
              note="Perfis activos"
            />
            <AnalyticsKpiCard
              to="/taxistas"
              icon={<UserRoundCheck />}
              label="Taxistas"
              value={counts.drivers}
              trend={driversTrend}
              note="Sem histórico comparável"
            />
            <AnalyticsKpiCard
              to="/multas"
              icon={<ReceiptText />}
              label="Multas"
              value={counts.fines}
              trend={finesTrend}
              note="Sem histórico comparável"
            />
            <AnalyticsKpiCard
              to="/financeiro"
              icon={<Wallet />}
              label="Receitas"
              value={counts.revenue}
              formatter={formatMoneyMt}
              trend={revenueTrend}
              note="Sem histórico comparável"
              emphasis
            />
          </>
        )}
      </section>

      <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          <>
            <CompactStat
              to="/registos"
              icon={<FilePlus2 />}
              label="Processos pendentes"
              value={counts.pending}
              status={counts.pending > 0 ? "warning" : "good"}
            />
            <CompactStat
              to="/veiculos"
              icon={<ShieldAlert />}
              label="Veículos roubados"
              value={counts.stolen}
              status={counts.stolen > 0 ? "danger" : "good"}
            />
            <CompactStat
              to="/utilizadores"
              icon={<Users />}
              label="Utilizadores"
              value={counts.users}
              status="neutral"
            />
            <CompactStat
              to="/fiscalizacao"
              icon={<ShieldCheck />}
              label="Fiscalizações"
              value={counts.fiscalizations}
              status="neutral"
            />
          </>
        )}
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <AnalyticsChartCard
          title="Registos ao longo do tempo"
          description="Novos processos criados nos últimos seis meses."
        >
          {loading ? (
            <ChartSkeleton />
          ) : (
            <RegistrationsAreaChart data={registrationSeries} />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Veículos por tipo"
          description="Distribuição do parque municipal registado."
        >
          {loading ? (
            <ChartSkeleton />
          ) : (
            <DistributionDonut
              data={vehicleDistribution}
              centerLabel="Veículos"
            />
          )}
        </AnalyticsChartCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AnalyticsChartCard
          title="Receitas mensais"
          description="Pagamentos confirmados menos reembolsos no período."
        >
          {loading ? (
            <ChartSkeleton />
          ) : (
            <RevenueBarChart data={revenueSeries} formatter={formatMoneyMt} />
          )}
        </AnalyticsChartCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <AnalyticsChartCard
            title="Multas por estado"
            description="Situação actual das multas emitidas."
          >
            {loading ? (
              <ChartSkeleton />
            ) : (
              <DistributionDonut
                data={fineDistribution}
                centerLabel="Multas"
              />
            )}
          </AnalyticsChartCard>

          <AnalyticsChartCard
            title="Taxistas por estado"
            description="Estado operacional dos taxistas e mototaxistas."
          >
            {loading ? (
              <ChartSkeleton />
            ) : (
              <DistributionDonut
                data={driverDistribution}
                centerLabel="Taxistas"
              />
            )}
          </AnalyticsChartCard>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Registos recentes
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Últimos processos visíveis no seu âmbito
              </p>
            </div>
            <Link
              to="/registos"
              className="text-xs font-semibold text-[var(--municipal-primary)] hover:underline"
            >
              Ver todos
            </Link>
          </div>

          {loading ? (
            <div className="p-5">
              <SkeletonTable rows={5} columns={5} />
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              title="Ainda não existem processos de registo"
              description="Quando o primeiro registo for criado, os movimentos mais recentes aparecerão aqui."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map((item) => (
                <Link
                  key={item.id}
                  to="/registos/$id"
                  params={{ id: item.id }}
                  className="grid gap-2 px-5 py-3.5 transition hover:bg-slate-50/80 sm:px-6 md:grid-cols-[1fr_1.35fr_1fr_auto] md:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.number}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  <p className="truncate text-sm text-slate-600">
                    {item.ownerName}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {item.vehicleLabel}
                  </p>
                  <StatusBadge status={item.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <div className="grid gap-4">
          <QuickActions permissions={allowedPermissions} loading={loading} />
          <ActivityFeed activities={activities} loading={loading} />
        </div>
      </section>
    </MobiGestShell>
  );
}

function QuickActions({
  permissions,
  loading,
}: {
  permissions: Set<string>;
  loading: boolean;
}) {
  const actions = [
    {
      label: "Registar veículo",
      to: "/veiculos/novo" as const,
      permission: "vehicles.create",
      icon: <Bike />,
    },
    {
      label: "Novo proprietário",
      to: "/proprietarios/novo" as const,
      permission: "owners.create",
      icon: <Users />,
    },
    {
      label: "Novo taxista",
      to: "/taxistas/novo" as const,
      permission: "drivers.create",
      icon: <UserRoundCheck />,
    },
    {
      label: "Nova fiscalização",
      to: "/fiscalizacao/nova" as const,
      permission: "fiscalization.create",
      icon: <ShieldCheck />,
    },
    {
      label: "Emitir multa",
      to: "/multas/nova" as const,
      permission: "fines.create",
      icon: <ReceiptText />,
    },
  ].filter((item) => permissions.has(item.permission));

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Acções rápidas</h3>
          <p className="mt-1 text-xs text-slate-400">
            Operações disponíveis para o seu perfil
          </p>
        </div>
        <Zap className="h-4 w-4 text-[var(--municipal-primary)]" />
      </div>

      <div className="mt-4 grid gap-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-11 animate-pulse rounded-xl bg-slate-100"
            />
          ))
        ) : actions.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-4 text-xs leading-5 text-slate-400">
            Não existem acções rápidas adicionais para este perfil.
          </p>
        ) : (
          actions.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="group flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-200 hover:bg-slate-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--municipal-primary)_8%,white)] text-[var(--municipal-primary)] [&>svg]:h-4 [&>svg]:w-4">
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}

function ActivityFeed({
  activities,
  loading,
}: {
  activities: AuditActivity[];
  loading: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Actividade recente</h3>
        <p className="mt-1 text-xs text-slate-400">
          Eventos auditados no âmbito municipal
        </p>
      </div>
      <div className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-12 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="p-5 text-xs leading-5 text-slate-400">
            Ainda não existem actividades auditadas para apresentar.
          </p>
        ) : (
          activities.map((item) => (
            <div key={item.id} className="flex gap-3 px-5 py-3.5">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--municipal-primary)]" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">
                  {activityLabel(item.module, item.action)}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {item.reference ?? "Sem referência"} · {item.actorName}
                </p>
                <p className="mt-1 text-[10px] text-slate-300">
                  {formatDate(item.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function monthSeries(points: MonthlyPoint[]) {
  const formatter = new Intl.DateTimeFormat("pt-MZ", {
    month: "short",
  });

  return points.map((point) => ({
    label: formatter
      .format(new Date(point.month + "T00:00:00"))
      .replace(".", "")
      .replace(/^./, (letter) => letter.toUpperCase()),
    total: Number(point.total ?? 0),
  }));
}

function calculateTrend(
  series: Array<{ label: string; total: number }>,
): Trend | null {
  if (series.length < 2) return null;
  const current = series[series.length - 1]?.total ?? 0;
  const previous = series[series.length - 2]?.total ?? 0;

  if (previous === 0) {
    if (current === 0) {
      return { value: 0, label: "vs mês anterior" };
    }
    return null;
  }

  return {
    value: ((current - previous) / previous) * 100,
    label: "vs mês anterior",
  };
}

function fineStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pendente: "Pendentes",
    paga: "Pagas",
    anulada: "Anuladas",
    em_recurso: "Em recurso",
  };
  return labels[status] ?? status;
}

function driverStatusLabel(status: string) {
  const labels: Record<string, string> = {
    activo: "Activos",
    suspenso: "Suspensos",
    bloqueado: "Bloqueados",
    inactivo: "Inactivos",
  };
  return labels[status] ?? status;
}

function vehicleTypeLabel(type?: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return "Veículo";
}

function activityLabel(module: string, action: string) {
  const moduleLabels: Record<string, string> = {
    vehicles: "Veículo",
    registrations: "Registo",
    drivers: "Taxista / condutor",
    fines: "Multa",
    finance: "Financeiro",
    fiscalization: "Fiscalização",
    owners: "Proprietário",
    users: "Utilizador",
  };
  const actionLabels: Record<string, string> = {
    create: "criado",
    criar: "criado",
    update: "actualizado",
    editar: "actualizado",
    approve: "aprovado",
    validate: "validado",
    emitir: "emitida",
    pay: "pago",
  };

  const subject = moduleLabels[module] ?? module;
  const verb = actionLabels[action] ?? action.replaceAll("_", " ");
  return subject + " · " + verb;
}

function isRoleCode(role: string): role is RoleCode {
  return [
    "super_admin",
    "admin_municipal",
    "tecnico",
    "fiscal",
    "financeiro",
  ].includes(role);
}

function DashboardPageRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/dashboard">
      <DashboardPage />
    </RouteIndexBoundary>
  );
}
