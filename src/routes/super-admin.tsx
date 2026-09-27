import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleAlert,
  FileText,
  Globe2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SuperAdminShell, SuperCard } from "../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin")({
  component: SuperAdminDashboard,
});

const municipalities = [
  { name: "Município de Lichinga", code: "LIC", users: 18, vehicles: "2 562", status: "Activo" },
  { name: "Novo município", code: "—", users: 0, vehicles: "—", status: "Configuração" },
];

function SuperAdminDashboard() {
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<Building2 />} label="Municípios" value="1" detail="activos na plataforma" />
        <Kpi icon={<Users />} label="Utilizadores" value="18" detail="contas registadas" />
        <Kpi icon={<FileText />} label="Registos" value="2 562" detail="todos os municípios" />
        <Kpi icon={<Activity />} label="Actividade hoje" value="84" detail="eventos registados" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <SuperCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h3 className="font-semibold">Municípios</h3>
              <p className="mt-1 text-sm text-slate-500">Estado geral das entidades na plataforma.</p>
            </div>
            <Link to="/super-admin/municipios" className="text-sm font-semibold text-sky-600">
              Ver todos
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {municipalities.map((municipality) => (
              <Link
                key={municipality.name}
                to="/super-admin/municipios"
                className="flex items-center gap-4 px-6 py-5 hover:bg-slate-50"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{municipality.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Código {municipality.code} · {municipality.users} utilizadores · {municipality.vehicles} veículos
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  municipality.status === "Activo"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}>
                  {municipality.status}
                </span>
              </Link>
            ))}
          </div>
        </SuperCard>

        <SuperCard className="p-6">
          <h3 className="font-semibold">Estado da plataforma</h3>
          <p className="mt-1 text-sm text-slate-500">Indicadores técnicos e operacionais.</p>

          <div className="mt-6 space-y-3">
            <StatusRow icon={<CheckCircle2 />} label="Aplicação web" value="Operacional" />
            <StatusRow icon={<CheckCircle2 />} label="Supabase" value="Ligado" />
            <StatusRow icon={<ShieldCheck />} label="Autenticação" value="Configurada" />
            <StatusRow icon={<CircleAlert />} label="RLS" value="A implementar" warning />
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Próxima etapa</p>
            <p className="mt-2 text-sm font-semibold">Ligar a administração global ao modelo de dados e às regras de acesso.</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              O painel já está organizado para receber dados reais sem alterar a navegação principal.
            </p>
          </div>
        </SuperCard>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <QuickLink to="/super-admin/utilizadores" icon={<Users />} title="Gerir utilizadores" description="Contas globais e atribuição aos municípios." />
        <QuickLink to="/super-admin/permissoes" icon={<ShieldCheck />} title="Perfis e permissões" description="Definir o que cada perfil pode executar." />
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

function Kpi({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <SuperCard className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">{icon}</div>
        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
      </div>
      <p className="mt-5 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </SuperCard>
  );
}

function StatusRow({ icon, label, value, warning = false }: { icon: React.ReactNode; label: string; value: string; warning?: boolean }) {
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
