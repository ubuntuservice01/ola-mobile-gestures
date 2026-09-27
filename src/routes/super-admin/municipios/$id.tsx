import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, CheckCircle2, MapPin, Settings2, ShieldOff, Users, Pencil, UserPlus } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/municipios/$id")({ component: MunicipioGlobal });

function MunicipioGlobal() {
  const { id } = Route.useParams();

  return (
    <SuperAdminShell title="Município" subtitle="Administração global e configuração da entidade municipal.">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Link to="/super-admin/municipios" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4" /> Municípios</Link>
        <div className="flex gap-2">
          <Link to="/super-admin/municipios/$id/editar" params={{ id }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><Pencil className="h-4 w-4" /> Editar</Link>
          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"><ShieldOff className="h-4 w-4" /> Suspender</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SuperCard className="p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600"><Building2 /></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Município</p><h2 className="text-2xl font-bold">Município de Lichinga</h2><p className="mt-1 text-sm text-slate-500">Código MobiGest: LIC · ID: {id}</p></div></div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Activo</span>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3"><Metric icon={<Building2 />} value="2 562" label="Veículos" /><Metric icon={<Users />} value="18" label="Utilizadores" /><Metric icon={<MapPin />} value="39" label="Localidades / bairros" /></div>
          <h3 className="mt-8 font-semibold">Dados institucionais</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><Info label="Província" value="Niassa" /><Info label="Código MobiGest" value="LIC" /><Info label="Contacto" value="+258 00 000 000" /><Info label="Email" value="municipio@mobigest.co.mz" /></div>
        </SuperCard>

        <div className="space-y-4">
          <SuperCard className="p-6"><h3 className="font-semibold">Gestão do município</h3><div className="mt-4 space-y-2">
            <Link to="/super-admin/utilizadores" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:bg-slate-50"><Users className="h-4 w-4 text-sky-600" /> Utilizadores</Link>
            <Link to="/super-admin/municipios/$id/administrador/novo" params={{ id }} className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-700 hover:bg-sky-100"><UserPlus className="h-4 w-4" /> Criar Administrador Municipal</Link>
            <Link to="/postos-administrativos" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:bg-slate-50"><MapPin className="h-4 w-4 text-sky-600" /> Estrutura territorial</Link>
            <Link to="/definicoes" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:bg-slate-50"><Settings2 className="h-4 w-4 text-sky-600" /> Configurações municipais</Link>
          </div></SuperCard>
          <SuperCard className="p-6"><h3 className="font-semibold">Estado da integração</h3><div className="mt-4 space-y-3 text-sm"><State label="Ambiente municipal" value="Activo" /><State label="Configuração inicial" value="Concluída" /><State label="Isolamento de dados" value="Preparado para RLS" /></div></SuperCard>
        </div>
      </div>
    </SuperAdminShell>
  );
}
function State({label,value}:{label:string;value:string}){return <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-slate-500">{label}</span><span className="font-semibold">{value}</span></div>}
function Metric({icon,value,label}:{icon:React.ReactNode;value:string;label:string}){return <div className="rounded-xl bg-slate-50 p-4"><span className="text-slate-400">{icon}</span><p className="mt-2 text-xl font-bold">{value}</p><p className="text-xs text-slate-500">{label}</p></div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>}
