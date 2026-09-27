import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Ban, CheckCircle2, KeyRound, Mail, MapPin, Pencil, Phone, ShieldCheck, UserRound } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/utilizadores/$id")({ component: UtilizadorGlobal });

function UtilizadorGlobal(){
 const {id}=Route.useParams();
 return <SuperAdminShell title="Detalhe do utilizador" subtitle="Conta, vínculo institucional e âmbito de acesso.">
  <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><Link to="/super-admin/utilizadores" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/> Utilizadores</Link><div className="flex gap-2"><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"><Pencil className="h-4 w-4"/> Editar</button><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700"><Ban className="h-4 w-4"/> Suspender</button></div></div>
  <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
   <SuperCard className="p-7"><div className="flex items-start gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100"><UserRound className="h-7 w-7 text-slate-500"/></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Utilizador</p><h2 className="text-2xl font-bold">Administrador Municipal</h2><p className="mt-1 text-sm text-slate-500">ID: {id}</p></div><span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5"/> Activo</span></div>
   <div className="mt-7 grid gap-3 sm:grid-cols-2"><Info icon={<Mail/>} label="Email" value="admin@municipio.gov.mz"/><Info icon={<Phone/>} label="Contacto" value="+258 84 000 0000"/><Info icon={<ShieldCheck/>} label="Perfil" value="Administrador Municipal"/><Info icon={<MapPin/>} label="Município" value="Lichinga"/><Info icon={<KeyRound/>} label="Autenticação" value="Supabase Auth"/></div></SuperCard>
   <SuperCard className="p-6"><h3 className="font-semibold">Âmbito de acesso</h3><div className="mt-4 space-y-2">{["Município: Lichinga","Posto administrativo: Todos","Estado: Activo"].map(x=><div key={x} className="rounded-xl bg-slate-50 p-3 text-sm font-medium">{x}</div>)}</div><div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-xs leading-5 text-sky-900"><b>RBAC + RLS:</b> o perfil define as operações e o município limita os dados acessíveis.</div></SuperCard>
  </div>
  <SuperCard className="mt-6 p-6"><h3 className="font-semibold">Actividade e segurança</h3><div className="mt-4 grid gap-3 sm:grid-cols-3"><Info label="Último acesso" value="—"/><Info label="Conta criada" value="—"/><Info label="Auditoria" value="Registada"/></div><p className="mt-4 text-sm text-slate-500">Os eventos reais de autenticação e alterações serão carregados após a integração com Supabase Auth e a auditoria do MobiGest.</p></SuperCard>
 </SuperAdminShell>;
}
function Info({icon,label,value}:{icon?:React.ReactNode;label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-4">{icon&&<span className="text-slate-500">{icon}</span>}<p className="mt-1 text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-700">{value}</p></div>}
