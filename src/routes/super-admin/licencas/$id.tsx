import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Ban, CalendarDays, CheckCircle2, KeyRound, Pencil, RefreshCw, ShieldCheck } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";

export const Route=createFileRoute("/super-admin/licencas/$id")({component:LicencaDetalhe});

function LicencaDetalhe(){
 const {id}=Route.useParams();
 return <SuperAdminShell title="Detalhe da licença" subtitle="Estado, período, plano e limites da licença de utilização.">
  <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><Link to="/super-admin/licencas" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/> Licenças</Link><div className="flex flex-wrap gap-2"><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"><Pencil className="h-4 w-4"/> Editar</button><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700"><Ban className="h-4 w-4"/> Suspender</button></div></div>
  <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
   <SuperCard className="p-7"><div className="flex items-start gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600"><KeyRound className="h-7 w-7"/></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Licença</p><h2 className="text-2xl font-bold">Profissional</h2><p className="mt-1 text-sm text-slate-500">{id} · Município de Lichinga</p></div><span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5"/> Activa</span></div>
    <div className="mt-7 grid gap-3 sm:grid-cols-2"><Info label="Início" value="01/09/2026" icon={<CalendarDays/>}/><Info label="Fim" value="31/08/2027" icon={<CalendarDays/>}/><Info label="Utilizadores" value="Até 50"/><Info label="Veículos" value="Até 5 000"/></div>
   </SuperCard>
   <SuperCard className="p-6"><h3 className="font-semibold">Estado da licença</h3><div className="mt-4 space-y-3"><State label="Município" value="Lichinga"/><State label="Plano" value="Profissional"/><State label="Estado" value="Activa"/><State label="Renovação" value="Manual"/></div></SuperCard>
  </div>
  <div className="mt-6 grid gap-6 lg:grid-cols-2">
   <SuperCard className="p-6"><h3 className="font-semibold">Módulos incluídos</h3><div className="mt-4 grid gap-2 sm:grid-cols-2">{["Veículos","Proprietários","Registos","QR Code","Fiscalização","Financeiro","Relatórios","Auditoria"].map(x=><div key={x} className="rounded-xl bg-slate-50 p-3 text-sm font-medium"><CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-500"/>{x}</div>)}</div></SuperCard>
   <SuperCard className="p-6"><h3 className="font-semibold">Renovação</h3><p className="mt-2 text-sm leading-6 text-slate-500">A renovação deverá prolongar a validade sem alterar o histórico da licença anterior.</p><button type="button" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"><RefreshCw className="h-4 w-4"/> Preparar renovação</button></SuperCard>
  </div>
  <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900"><ShieldCheck className="mr-2 inline h-4 w-4"/><b>Segurança:</b> a licença é uma regra de acesso ao software. Suspender uma licença deverá impedir o acesso municipal conforme as políticas de Auth/RLS, sem apagar os dados históricos.</div>
 </SuperAdminShell>;
}
function Info({label,value,icon}:{label:string;value:string;icon?:React.ReactNode}){return <div className="rounded-xl bg-slate-50 p-4">{icon&&<span className="text-slate-400">{icon}</span>}<p className="mt-1 text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>}
function State({label,value}:{label:string;value:string}){return <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">{label}</span><span className="font-semibold">{value}</span></div>}
