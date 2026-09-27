import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Building2, CalendarClock, CheckCircle2, Clock3, KeyRound, Plus, Search, Settings2, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/licencas")({ component: Licencas });

const licenses=[
 {id:"LIC-001",municipality:"Município de Lichinga",code:"LIC",plan:"Profissional",status:"Activa",start:"01/09/2026",end:"31/08/2027",users:18,vehicles:"2 562"},
 {id:"PEM-001",municipality:"Município de Pemba",code:"PEM",plan:"Inicial",status:"Em configuração",start:"—",end:"—",users:11,vehicles:"1 184"},
 {id:"DEMO-001",municipality:"Município de Demonstração",code:"DEM",plan:"Demonstração",status:"Expirada",start:"01/06/2026",end:"30/06/2026",users:4,vehicles:"218"},
];

function Licencas(){
 const [query,setQuery]=useState(""); const [status,setStatus]=useState("Todos"); const [plan,setPlan]=useState("Todos");
 const filtered=useMemo(()=>licenses.filter(l=>[l.id,l.municipality,l.code].join(" ").toLowerCase().includes(query.toLowerCase())&&(status==="Todos"||l.status===status)&&(plan==="Todos"||l.plan===plan)),[query,status,plan]);
 const active=licenses.filter(l=>l.status==="Activa").length;
 const expiring=licenses.filter(l=>l.status==="Activa"&&l.end==="31/08/2027").length;
 return <SuperAdminShell title="Licenças MobiGest" subtitle="Gestão das licenças de utilização do software atribuídas aos municípios.">
  <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm text-slate-500">Administração comercial e operacional</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Licenças</h2></div><div className="flex flex-wrap gap-2"><Link to="/super-admin/licencas/planos" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"><Settings2 className="h-4 w-4"/> Planos</Link><Link to="/super-admin/licencas/novo" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"><Plus className="h-4 w-4"/> Nova licença</Link></div></div>
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
   <Kpi icon={<KeyRound/>} value={String(licenses.length)} label="Licenças" detail="registos no sistema"/>
   <Kpi icon={<CheckCircle2/>} value={String(active)} label="Activas" detail="em utilização"/>
   <Kpi icon={<Clock3/>} value={String(expiring)} label="A acompanhar" detail="renovação futura"/>
   <Kpi icon={<ShieldAlert/>} value={String(licenses.filter(l=>l.status==="Expirada").length)} label="Expiradas" detail="requerem atenção"/>
  </div>
  <SuperCard className="mt-6 p-4"><div className="flex flex-col gap-3 lg:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar por município, código ou licença" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-500"/></label><select value={status} onChange={e=>setStatus(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option>Todos</option><option>Activa</option><option>Em configuração</option><option>Expirada</option><option>Suspensa</option></select><select value={plan} onChange={e=>setPlan(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option>Todos</option><option>Inicial</option><option>Profissional</option><option>Enterprise</option><option>Demonstração</option></select></div></SuperCard>
  <SuperCard className="mt-4 overflow-hidden"><div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid"><span>Município</span><span>Plano</span><span>Período</span><span>Utilização</span><span>Estado</span><span></span></div>{filtered.map(l=><div key={l.id} className="grid gap-3 border-b border-slate-100 px-6 py-5 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] md:items-center"><div><p className="font-semibold">{l.municipality}</p><p className="text-xs text-slate-400">{l.id} · {l.code}</p></div><span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{l.plan}</span><p className="text-sm text-slate-600">{l.start} → {l.end}</p><p className="text-sm text-slate-600">{l.users} utilizadores · {l.vehicles} veículos</p><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${l.status==="Activa"?"bg-emerald-50 text-emerald-700":l.status==="Expirada"?"bg-rose-50 text-rose-700":"bg-amber-50 text-amber-700"}`}>{l.status}</span><Link to="/super-admin/licencas/$id" params={{id:l.id}} className="text-sm font-semibold text-sky-700">Ver</Link></div>)}{filtered.length===0&&<div className="p-10 text-center text-sm text-slate-500">Nenhuma licença corresponde aos filtros.</div>}</SuperCard>
  <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900"><b>Regra:</b> a licença do software é independente das licenças, taxas ou autorizações municipais aplicadas aos veículos. Os limites e módulos devem ser configuráveis por plano e por município.</div>
 </SuperAdminShell>;
}
function Kpi({icon,value,label,detail}:{icon:React.ReactNode;value:string;label:string;detail:string}){return <SuperCard className="p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">{icon}</div><p className="mt-4 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></SuperCard>}
