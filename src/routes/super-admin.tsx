import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  Globe2,
  KeyRound,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SuperAdminShell, SuperCard } from "../components/SuperAdminShell";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/super-admin")({
  component: SuperAdminDashboardRouteBoundary,
});

type MunicipalitySummary = {
  id: string;
  name: string;
  code: string;
  status: string;
};

type DashboardCounts = {
  municipalities: number;
  users: number;
  vehicles: number;
  registrations: number;
  motorcycles: number;
  cars: number;
  bicycles: number;
  auditEvents: number;
};

const EMPTY_COUNTS: DashboardCounts = {
  municipalities: 0,
  users: 0,
  vehicles: 0,
  registrations: 0,
  motorcycles: 0,
  cars: 0,
  bicycles: 0,
  auditEvents: 0,
};

function SuperAdminDashboard() {
  const [municipalities, setMunicipalities] = useState<MunicipalitySummary[]>([]);
  const [counts, setCounts] = useState<DashboardCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setLoadError(null);

      const [
        municipalitiesResult,
        municipalitiesCountResult,
        usersCountResult,
        vehiclesCountResult,
        registrationsCountResult,
        motorcyclesCountResult,
        carsCountResult,
        bicyclesCountResult,
        auditCountResult,
      ] = await Promise.all([
        supabase
          .from("municipalities")
          .select("id, name, code, status")
          .order("name", { ascending: true }),
        supabase.from("municipalities").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("registrations").select("id", { count: "exact", head: true }),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("vehicle_type", "motorizada"),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("vehicle_type", "carro"),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("vehicle_type", "bicicleta"),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
      ]);

      if (!active) return;

      const firstError =
        municipalitiesResult.error ??
        municipalitiesCountResult.error ??
        usersCountResult.error ??
        vehiclesCountResult.error ??
        registrationsCountResult.error ??
        motorcyclesCountResult.error ??
        carsCountResult.error ??
        bicyclesCountResult.error ??
        auditCountResult.error;

      if (firstError) {
        console.error("Falha ao carregar dashboard global:", firstError);
        setLoadError("Não foi possível carregar os indicadores do Supabase.");
        setLoading(false);
        return;
      }

      setMunicipalities((municipalitiesResult.data ?? []) as MunicipalitySummary[]);
      setCounts({
        municipalities: municipalitiesCountResult.count ?? 0,
        users: usersCountResult.count ?? 0,
        vehicles: vehiclesCountResult.count ?? 0,
        registrations: registrationsCountResult.count ?? 0,
        motorcycles: motorcyclesCountResult.count ?? 0,
        cars: carsCountResult.count ?? 0,
        bicycles: bicyclesCountResult.count ?? 0,
        auditEvents: auditCountResult.count ?? 0,
      });
      setLoading(false);
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  return (
    <SuperAdminShell
      title="Dashboard"
      subtitle="Visão global da plataforma, municípios, utilizadores e actividade do MobiGest."
    >
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500">Centro de controlo da plataforma</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Visão geral</h2>
        </div>
        <Link
          to="/super-admin/municipios/novo"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <Building2 className="h-4 w-4" />
          Criar município
        </Link>
      </div>

      {loadError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<Building2 />}
          label="Municípios"
          value={loading ? "—" : counts.municipalities.toLocaleString("pt-MZ")}
          detail="registados na plataforma"
        />
        <Kpi
          icon={<Users />}
          label="Utilizadores"
          value={loading ? "—" : counts.users.toLocaleString("pt-MZ")}
          detail="perfis MobiGest"
        />
        <Kpi
          icon={<FileText />}
          label="Veículos"
          value={loading ? "—" : counts.vehicles.toLocaleString("pt-MZ")}
          detail="frota total registada"
        />
        <Kpi
          icon={<Activity />}
          label="Registos"
          value={loading ? "—" : counts.registrations.toLocaleString("pt-MZ")}
          detail="processos em todos os municípios"
        />
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<Activity />}
          label="Motorizadas"
          value={loading ? "—" : counts.motorcycles.toLocaleString("pt-MZ")}
          detail="registadas na plataforma"
        />
        <Kpi
          icon={<Activity />}
          label="Carros"
          value={loading ? "—" : counts.cars.toLocaleString("pt-MZ")}
          detail="registados na plataforma"
        />
        <Kpi
          icon={<Activity />}
          label="Bicicletas"
          value={loading ? "—" : counts.bicycles.toLocaleString("pt-MZ")}
          detail="registadas na plataforma"
        />
        <Kpi
          icon={<Activity />}
          label="Auditoria"
          value={loading ? "—" : counts.auditEvents.toLocaleString("pt-MZ")}
          detail="eventos registados"
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <SuperCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h3 className="font-semibold">Municípios</h3>
              <p className="mt-1 text-sm text-slate-500">Dados reais registados no Supabase.</p>
            </div>
            <Link to="/super-admin/municipios" className="text-sm font-semibold text-sky-600">
              Ver todos
            </Link>
          </div>

          {loading ? (
            <div className="px-6 py-8 text-sm text-slate-500">A carregar municípios...</div>
          ) : municipalities.length === 0 ? (
            <div className="px-6 py-8">
              <p className="text-sm font-semibold text-slate-700">Ainda não existem municípios registados.</p>
              <p className="mt-1 text-sm text-slate-500">
                Crie o primeiro município apenas depois de concluirmos os testes de acesso global.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {municipalities.map((municipality) => (
                <Link
                  key={municipality.id}
                  to="/super-admin/municipios"
                  className="flex items-center gap-4 px-6 py-5 hover:bg-slate-50"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{municipality.name}</p>
                    <p className="mt-1 text-xs text-slate-500">Código {municipality.code}</p>
                  </div>
                  <MunicipalityStatus status={municipality.status} />
                </Link>
              ))}
            </div>
          )}
        </SuperCard>

        <SuperCard className="p-6">
          <h3 className="font-semibold">Estado da plataforma</h3>
          <p className="mt-1 text-sm text-slate-500">Indicadores técnicos da sessão actual.</p>

          <div className="mt-6 space-y-3">
            <StatusRow icon={<CheckCircle2 />} label="Aplicação web" value="Operacional" />
            <StatusRow
              icon={<CheckCircle2 />}
              label="Supabase"
              value={loadError ? "Falha de leitura" : loading ? "A verificar" : "Ligado"}
              warning={Boolean(loadError)}
            />
            <StatusRow icon={<ShieldCheck />} label="Autenticação" value="Sessão validada" />
            <StatusRow icon={<ShieldCheck />} label="RLS" value="Activo" />
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estado actual</p>
            <p className="mt-2 text-sm font-semibold">Administração global ligada à base real.</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Os indicadores desta página deixam de usar números demonstrativos e passam a reflectir os dados autorizados pelo Supabase.
            </p>
          </div>
        </SuperCard>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <QuickLink to="/super-admin/utilizadores" icon={<Users />} title="Gerir utilizadores" description="Contas globais e atribuição aos municípios." />
        <QuickLink to="/super-admin/permissoes" icon={<ShieldCheck />} title="Perfis e permissões" description="Definir o que cada perfil pode executar." />
        <QuickLink to="/super-admin/licencas" icon={<KeyRound />} title="Licenças MobiGest" description="Planos, validade e utilização por município." />
        <QuickLink to="/super-admin/relatorios" icon={<BarChart3 />} title="Relatórios globais" description="Indicadores consolidados de toda a plataforma." />
        <QuickLink to="/super-admin/auditoria" icon={<Activity />} title="Auditoria global" description="Acompanhar alterações e actividades críticas." />
      </section>

      <SuperCard className="mt-6 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Princípio de arquitectura</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              O Super Administrador gere a plataforma como um todo. Cada município terá os seus próprios dados, utilizadores e configurações, enquanto a camada global controla a estrutura e as regras comuns.
            </p>
          </div>
        </div>
      </SuperCard>
    </SuperAdminShell>
  );
}

function MunicipalityStatus({ status }: { status: string }) {
  const active = status === "activo";
  const label =
    status === "activo"
      ? "Activo"
      : status === "configuracao"
        ? "Configuração"
        : status === "suspenso"
          ? "Suspenso"
          : status === "inactivo"
            ? "Inactivo"
            : status;

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {label}
    </span>
  );
}

function Kpi({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <SuperCard className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">{icon}</div>
      <p className="mt-5 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </SuperCard>
  );
}

function StatusRow({
  icon,
  label,
  value,
  warning = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
      <span className={warning ? "text-amber-500" : "text-emerald-500"}>{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className={`text-xs font-semibold ${warning ? "text-amber-700" : "text-emerald-700"}`}>{value}</span>
    </div>
  );
}

function QuickLink({ to, icon, title, description }: { to: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link to={to} className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-sky-200 hover:bg-sky-50/20">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-sky-50 group-hover:text-sky-600">{icon}</div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </Link>
  );
}


function SuperAdminDashboardRouteBoundary() {
  return <RouteIndexBoundary pattern="/super-admin"><SuperAdminDashboard /></RouteIndexBoundary>;
}
