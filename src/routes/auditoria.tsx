import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, Download, Filter, History, Search, ShieldCheck } from "lucide-react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";

export const Route = createFileRoute("/auditoria")({ component: Auditoria });

const events = [
  ["26 Set 2026 · 15:02", "Técnico", "Actualizou proprietário", "Proprietário #128", "Proprietários", "Alteração"],
  ["26 Set 2026 · 14:40", "Fiscal", "Registou fiscalização", "MOBI-LIC-004821", "Fiscalização", "Criação"],
  ["26 Set 2026 · 14:35", "Administrador", "Gerou QR Code", "MOBI-LIC-004821", "Veículos", "Criação"],
  ["26 Set 2026 · 14:32", "Administrador", "Aprovou registo", "REG-2026-004821", "Registos", "Validação"],
  ["26 Set 2026 · 13:18", "Financeiro", "Confirmou pagamento", "PAG-2026-00931", "Financeiro", "Pagamento"],
];

function Auditoria() {
  return (
    <MobiGestShell title="Auditoria" subtitle="Rastreabilidade das acções realizadas no MobiGest.">
      <PageHeader title="Auditoria" description="Consulte quem realizou uma acção, quando, sobre qual registo e qual foi o resultado." />

      <div className="grid gap-4 md:grid-cols-4">
        <Summary title="Eventos hoje" value="48" />
        <Summary title="Utilizadores activos" value="12" />
        <Summary title="Alterações críticas" value="7" />
        <Summary title="Ocorrências" value="3" />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center rounded-xl border border-slate-300 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input className="h-11 w-full bg-transparent px-3 text-sm outline-none" placeholder="Pesquisar utilizador, referência ou acção..." />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"><Filter className="h-4 w-4" />Filtros</button>
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"><Download className="h-4 w-4" />Exportar</button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 md:grid-cols-4">
          <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option>Todos os utilizadores</option><option>Administrador</option><option>Técnico</option><option>Fiscal</option><option>Financeiro</option></select>
          <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option>Todas as áreas</option><option>Veículos</option><option>Proprietários</option><option>Fiscalização</option><option>Financeiro</option><option>Registos</option></select>
          <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option>Todas as acções</option><option>Criação</option><option>Alteração</option><option>Validação</option><option>Pagamento</option></select>
          <input type="date" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" />
        </div>

        <div className="divide-y divide-slate-100">
          {events.map(([date,user,action,target,area,type]) => (
            <div key={date + target} className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr_1.6fr_1.2fr_1fr] md:items-center">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100"><History className="h-4 w-4 text-slate-500" /></div>
                <div><p className="text-sm font-semibold">{action}</p><p className="mt-1 text-xs text-slate-400">{date}</p></div>
              </div>
              <div><p className="text-sm">{user}</p><p className="text-xs text-slate-400">{area}</p></div>
              <div className="text-sm">{target}</div>
              <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{type}</span>
              <button className="text-left text-xs font-semibold text-sky-700 hover:text-sky-900">Ver detalhes</button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-sky-600" />
          Os registos de auditoria devem ser imutáveis, associados ao município e protegidos por permissões. Os dados acima são demonstrativos nesta fase.
        </div>
      </Card>

      <Card className="mt-6 p-5">
        <div className="flex items-start gap-3">
          <ClipboardCheck className="mt-0.5 h-5 w-5 text-sky-600" />
          <div>
            <h3 className="font-semibold">Regras de auditoria</h3>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-500">
              <li>• Registar utilizador, perfil, município, data/hora, acção e entidade afectada.</li>
              <li>• Guardar referência do registo e resultado da operação.</li>
              <li>• Alterações críticas devem conservar o valor anterior e o novo valor quando aplicável.</li>
              <li>• Não permitir apagar ou alterar silenciosamente eventos de auditoria.</li>
              <li>• Aplicar isolamento por município e permissões quando a base de dados estiver ligada.</li>
            </ul>
          </div>
        </div>
      </Card>
    </MobiGestShell>
  );
}

function Summary({ title, value }: { title: string; value: string }) {
  return <Card className="p-5"><p className="text-xs text-slate-400">{title}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>;
}
