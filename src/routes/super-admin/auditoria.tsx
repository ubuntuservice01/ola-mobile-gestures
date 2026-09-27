import { createFileRoute } from "@tanstack/react-router";
import { Activity, Filter, Search, ShieldAlert } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/auditoria")({
  component: AuditoriaGlobal,
});

const events = [
  ["26 Set, 2026 · 08:42", "Administrador Municipal", "Criação de registo", "Veículo MOBI-LIC-000128", "Lichinga"],
  ["26 Set, 2026 · 08:31", "Técnico de Registos", "Validação", "Processo REG-00128", "Lichinga"],
  ["26 Set, 2026 · 08:18", "Super Administrador", "Alteração de permissões", "Perfil Técnico", "Global"],
  ["25 Set, 2026 · 17:46", "Fiscal Municipal", "Fiscalização", "Veículo MOBI-LIC-000121", "Lichinga"],
];

function AuditoriaGlobal() {
  return (
    <SuperAdminShell title="Auditoria" subtitle="Visão global dos eventos críticos da plataforma.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Eventos hoje" value="84" />
        <Kpi label="Alterações críticas" value="12" />
        <Kpi label="Utilizadores activos" value="18" />
        <Kpi label="Alertas" value="3" />
      </div>

      <SuperCard className="mt-6 overflow-hidden">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center">
          <div>
            <h3 className="font-semibold">Actividade recente</h3>
            <p className="mt-1 text-sm text-slate-500">Eventos que afectam a configuração ou os dados do sistema.</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input className="h-10 w-44 bg-transparent px-2 text-sm outline-none" placeholder="Pesquisar..." />
            </div>
            <button type="button" className="rounded-xl border border-slate-200 p-2.5 text-slate-500" aria-label="Filtrar">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {events.map(([date, user, action, target, municipality]) => (
            <div key={date + target} className="grid gap-3 px-5 py-5 md:grid-cols-[1.2fr_1.2fr_1fr_1.4fr_1fr] md:items-center">
              <span className="text-xs text-slate-500">{date}</span>
              <span className="text-sm font-semibold">{user}</span>
              <span className="text-sm">{action}</span>
              <span className="text-sm text-slate-600">{target}</span>
              <span className="text-xs font-semibold text-slate-500">{municipality}</span>
            </div>
          ))}
        </div>
      </SuperCard>

      <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
        <ShieldAlert className="mr-2 inline h-4 w-4" />
        <b>Princípio:</b> os eventos de auditoria devem ser imutáveis e conter utilizador, perfil, município, data/hora, módulo, acção, entidade, resultado e, para alterações críticas, valores anterior e novo.
      </div>
    </SuperAdminShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <SuperCard className="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Activity className="h-3 w-3" /> período actual</p>
    </SuperCard>
  );
}
