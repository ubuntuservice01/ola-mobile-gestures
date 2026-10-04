import { RouteIndexBoundary } from "../../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock3,
  KeyRound,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";
import { effectiveLicenseStatus } from "../../lib/licenses";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/super-admin/licencas")({
  component: LicencasRouteBoundary,
});

type LicenseRow = {
  id: string;
  municipality_id: string;
  plan_id: string;
  license_code: string;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  max_users: number | null;
  max_vehicles: number | null;
  created_at: string;
  municipalityName: string;
  municipalityCode: string;
  planName: string;
  planCode: string;
  effectiveStatus: string;
  effectiveMaxUsers: number | null;
  effectiveMaxVehicles: number | null;
  activeUsers: number;
  vehicles: number;
};

function Licencas() {
  const [rows, setRows] = useState<LicenseRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [plan, setPlan] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("licenses")
        .select(
          "id, municipality_id, plan_id, license_code, starts_at, ends_at, status, max_users, max_vehicles, created_at",
        )
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar licenças:", error);
        setLoadError("Não foi possível carregar as licenças.");
        setLoading(false);
        return;
      }

      const base = data ?? [];
      const municipalityIds = [
        ...new Set(base.map((row) => row.municipality_id)),
      ];
      const planIds = [...new Set(base.map((row) => row.plan_id))];

      const [municipalitiesResult, plansResult] = await Promise.all([
        municipalityIds.length
          ? supabase
              .from("municipalities")
              .select("id, name, code")
              .in("id", municipalityIds)
          : Promise.resolve({ data: [], error: null }),
        planIds.length
          ? supabase
              .from("license_plans")
              .select("id, name, code, max_users, max_vehicles")
              .in("id", planIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!active) return;

      const relationError = municipalitiesResult.error ?? plansResult.error;

      if (relationError) {
        console.error("Falha ao enriquecer licenças:", relationError);
        setLoadError(
          "As licenças foram encontradas, mas municípios/planos não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      const municipalityMap = new Map(
        (municipalitiesResult.data ?? []).map((row) => [row.id, row]),
      );
      const planMap = new Map(
        (plansResult.data ?? []).map((row) => [row.id, row]),
      );

      const enriched = await Promise.all(
        base.map(async (license) => {
          const [usersResult, vehiclesResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .eq("municipality_id", license.municipality_id)
              .eq("status", "activo"),
            supabase
              .from("vehicles")
              .select("id", { count: "exact", head: true })
              .eq("municipality_id", license.municipality_id)
              .neq("status", "cancelada"),
          ]);

          if (usersResult.error || vehiclesResult.error) {
            throw usersResult.error ?? vehiclesResult.error;
          }

          const municipality = municipalityMap.get(license.municipality_id);
          const planRow = planMap.get(license.plan_id);

          return {
            ...license,
            municipalityName: municipality?.name ?? "Município não encontrado",
            municipalityCode: municipality?.code ?? "—",
            planName: planRow?.name ?? "Plano não encontrado",
            planCode: planRow?.code ?? "—",
            effectiveStatus: effectiveLicenseStatus(license),
            effectiveMaxUsers:
              license.max_users ?? planRow?.max_users ?? null,
            effectiveMaxVehicles:
              license.max_vehicles ?? planRow?.max_vehicles ?? null,
            activeUsers: usersResult.count ?? 0,
            vehicles: vehiclesResult.count ?? 0,
          } as LicenseRow;
        }),
      ).catch((countError) => {
        console.error("Falha ao carregar utilização das licenças:", countError);
        return null;
      });

      if (!active) return;

      if (!enriched) {
        setLoadError(
          "As licenças foram encontradas, mas a utilização não pôde ser calculada.",
        );
        setLoading(false);
        return;
      }

      setRows(enriched);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const planOptions = useMemo(
    () => [...new Set(rows.map((row) => row.planName))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return rows.filter((row) => {
      const haystack = [
        row.license_code,
        row.municipalityName,
        row.municipalityCode,
        row.planName,
        row.planCode,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalized || haystack.includes(normalized)) &&
        (status === "todos" || row.effectiveStatus === status) &&
        (plan === "todos" || row.planName === plan)
      );
    });
  }, [rows, query, status, plan]);

  const metrics = useMemo(() => {
    const today = new Date();
    const inThirtyDays = new Date(today);
    inThirtyDays.setDate(today.getDate() + 30);

    return {
      total: rows.length,
      active: rows.filter((row) => row.effectiveStatus === "activa").length,
      expiring: rows.filter((row) => {
        if (row.effectiveStatus !== "activa" || !row.ends_at) return false;
        const end = new Date(row.ends_at + "T23:59:59");
        return end >= today && end <= inThirtyDays;
      }).length,
      attention: rows.filter((row) =>
        ["suspensa", "expirada", "cancelada", "em_configuracao"].includes(
          row.effectiveStatus,
        ),
      ).length,
    };
  }, [rows]);

  return (
    <SuperAdminShell
      title="Licenças MobiGest"
      subtitle="Gestão real das licenças de utilização atribuídas aos municípios."
    >
      <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-slate-500">
            Administração comercial e operacional
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Licenças</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/super-admin/licencas/planos"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            <Settings2 className="h-4 w-4" />
            Planos
          </Link>
          <Link
            to="/super-admin/licencas/novo"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Nova licença
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<KeyRound />}
          value={loading ? "—" : String(metrics.total)}
          label="Licenças"
          detail="registos no sistema"
        />
        <Kpi
          icon={<CheckCircle2 />}
          value={loading ? "—" : String(metrics.active)}
          label="Activas"
          detail="acesso municipal autorizado"
        />
        <Kpi
          icon={<Clock3 />}
          value={loading ? "—" : String(metrics.expiring)}
          label="A expirar"
          detail="nos próximos 30 dias"
        />
        <Kpi
          icon={<ShieldAlert />}
          value={loading ? "—" : String(metrics.attention)}
          label="Requerem atenção"
          detail="suspensas, expiradas ou configuração"
        />
      </div>

      <SuperCard className="mt-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por município, código ou licença"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="todos">Todos os estados</option>
            <option value="activa">Activa</option>
            <option value="aguarda_inicio">Aguarda início</option>
            <option value="em_configuracao">Em configuração</option>
            <option value="suspensa">Suspensa</option>
            <option value="expirada">Expirada</option>
            <option value="cancelada">Cancelada</option>
          </select>

          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="todos">Todos os planos</option>
            {planOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </SuperCard>

      {loadError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      <SuperCard className="mt-4 overflow-hidden">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_1.2fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
          <span>Município</span>
          <span>Plano</span>
          <span>Período</span>
          <span>Utilização</span>
          <span>Estado</span>
          <span />
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            A carregar licenças...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {rows.length === 0
              ? "Ainda não existem licenças."
              : "Nenhuma licença corresponde aos filtros."}
          </div>
        ) : (
          filtered.map((license) => (
            <div
              key={license.id}
              className="grid gap-3 border-b border-slate-100 px-6 py-5 md:grid-cols-[1.4fr_1fr_1fr_1.2fr_1fr_auto] md:items-center"
            >
              <div>
                <p className="font-semibold">{license.municipalityName}</p>
                <p className="text-xs text-slate-400">
                  {license.license_code} · {license.municipalityCode}
                </p>
              </div>

              <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                {license.planName}
              </span>

              <p className="text-sm text-slate-600">
                {formatDate(license.starts_at)} → {formatDate(license.ends_at)}
              </p>

              <div className="text-sm text-slate-600">
                <p>
                  {license.activeUsers.toLocaleString("pt-MZ")}
                  {license.effectiveMaxUsers !== null
                    ? " / " +
                      license.effectiveMaxUsers.toLocaleString("pt-MZ")
                    : ""}{" "}
                  utilizadores
                </p>
                <p>
                  {license.vehicles.toLocaleString("pt-MZ")}
                  {license.effectiveMaxVehicles !== null
                    ? " / " +
                      license.effectiveMaxVehicles.toLocaleString("pt-MZ")
                    : ""}{" "}
                  veículos
                </p>
              </div>

              <LicenseStatus status={license.effectiveStatus} />

              <Link
                to="/super-admin/licencas/$id"
                params={{ id: license.id }}
                className="text-sm font-semibold text-sky-700"
              >
                Ver
              </Link>
            </div>
          ))
        )}
      </SuperCard>

      <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
        Uma licença suspensa, expirada, cancelada ou ainda não iniciada deixa de
        satisfazer a autorização municipal no servidor. O Super Administrador
        continua com acesso global para administrar a plataforma.
      </div>
    </SuperAdminShell>
  );
}

function LicenseStatus({ status }: { status: string }) {
  const labels: Record<string, string> = {
    activa: "Activa",
    aguarda_inicio: "Aguarda início",
    em_configuracao: "Em configuração",
    suspensa: "Suspensa",
    expirada: "Expirada",
    cancelada: "Cancelada",
  };

  const className =
    status === "activa"
      ? "bg-emerald-50 text-emerald-700"
      : status === "cancelada" || status === "expirada"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={"w-fit rounded-full px-3 py-1 text-xs font-semibold " + className}>
      {labels[status] ?? status}
    </span>
  );
}

function formatDate(value: string | null) {
  return value ? new Date(value + "T00:00:00").toLocaleDateString("pt-MZ") : "—";
}

function Kpi({
  icon,
  value,
  label,
  detail,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  detail: string;
}) {
  return (
    <SuperCard className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        {icon}
      </div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </SuperCard>
  );
}

function LicencasRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/super-admin/licencas">
      <Licencas />
    </RouteIndexBoundary>
  );
}
