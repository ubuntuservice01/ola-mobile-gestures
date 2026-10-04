import { RouteIndexBoundary } from "../../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Filter, Plus, Search, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/utilizadores")({ component: UtilizadoresGlobaisRouteBoundary });

const users = [
  { id:"admin-lichinga", name:"Administrador Municipal", email:"admin@municipio.gov.mz", profile:"Administrador Municipal", municipality:"Lichinga", status:"Activo" },
  { id:"tecnico-lichinga", name:"Técnico de Registos", email:"tecnico@municipio.gov.mz", profile:"Técnico", municipality:"Lichinga", status:"Activo" },
  { id:"fiscal-lichinga", name:"Fiscal Municipal", email:"fiscal@municipio.gov.mz", profile:"Fiscal", municipality:"Lichinga", status:"Activo" },
  { id:"financeiro-lichinga", name:"Gestor Financeiro", email:"financeiro@municipio.gov.mz", profile:"Financeiro", municipality:"Lichinga", status:"Suspenso" },
];

function UtilizadoresGlobais() {
  const [query,setQuery]=useState("");
  const [profile,setProfile]=useState("Todos");
  const [status,setStatus]=useState("Todos");
  const filtered=useMemo(()=>users.filter(u=>{
    const q=[u.name,u.email,u.municipality].join(" ").toLowerCase();
    return q.includes(query.toLowerCase()) && (profile==="Todos"||u.profile===profile) && (status==="Todos"||u.status===status);
  }),[query,profile,status]);

  return <SuperAdminShell title="Utilizadores" subtitle="Gestão global das contas, perfis e vínculo aos municípios.">
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><p className="text-sm text-slate-500">Administração global</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Todos os utilizadores</h2></div>
      <Link to="/super-admin/utilizadores/novo" className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"><Plus className="h-4 w-4"/> Novo utilizador</Link>
    </div>
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <Mini icon={<UsersRound/>} value={String(users.length)} label="Contas registadas"/>
      <Mini icon={<ShieldCheck/>} value={String(users.filter(u=>u.status==="Activo").length)} label="Activas"/>
      <Mini icon={<UserRound/>} value={String(new Set(users.map(u=>u.municipality)).size)} label="Municípios com utilizadores"/>
    </div>
    <SuperCard className="mb-6 p-4"><div className="flex flex-col gap-3 xl:flex-row">
      <label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar por nome, email ou município" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-500"/></label>
      <label className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-400"/><select value={profile} onChange={e=>setProfile(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option>Todos</option><option>Administrador Municipal</option><option>Técnico</option><option>Fiscal</option><option>Financeiro</option></select></label>
      <select value={status} onChange={e=>setStatus(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option>Todos</option><option>Activo</option><option>Suspenso</option></select>
    </div></SuperCard>
    <SuperCard className="overflow-hidden">
      <div className="hidden grid-cols-[1.5fr_1.4fr_1.1fr_1fr_auto_auto] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid"><span>Utilizador</span><span>Email</span><span>Perfil</span><span>Município</span><span>Estado</span><span></span></div>
      {filtered.map(u=><div key={u.id} className="grid gap-3 border-b border-slate-100 px-6 py-5 md:grid-cols-[1.5fr_1.4fr_1.1fr_1fr_auto_auto] md:items-center">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"><UserRound className="h-4 w-4 text-slate-500"/></div><div><p className="text-sm font-semibold">{u.name}</p><p className="text-xs text-slate-500 md:hidden">{u.email}</p></div></div>
        <p className="hidden text-sm text-slate-600 md:block">{u.email}</p><span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{u.profile}</span><p className="text-sm text-slate-600">{u.municipality}</p>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${u.status==="Activo"?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700"}`}>{u.status}</span>
        <Link to="/super-admin/utilizadores/$id" params={{id:u.id}} className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-sky-700"><Eye className="h-4 w-4"/> Ver</Link>
      </div>)}
      {filtered.length===0&&<div className="p-10 text-center text-sm text-slate-500">Nenhum utilizador corresponde aos filtros.</div>}
    </SuperCard>
    <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900"><ShieldCheck className="mr-2 inline h-4 w-4"/><b>Segurança:</b> o perfil, município e posto administrativo definirão o âmbito de acesso. A autorização real será aplicada com Supabase Auth, RBAC e RLS.</div>
  </SuperAdminShell>;
}
function Mini({icon,value,label}:{icon:React.ReactNode;value:string;label:string}){return <SuperCard className="p-4"><span className="text-sky-600">{icon}</span><p className="mt-2 text-xl font-bold">{value}</p><p className="text-xs text-slate-500">{label}</p></SuperCard>}


function UtilizadoresGlobaisRouteBoundary() {
  return <RouteIndexBoundary pattern="/super-admin/utilizadores"><UtilizadoresGlobais /></RouteIndexBoundary>;
}
