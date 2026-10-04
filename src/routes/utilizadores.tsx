import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ShieldCheck, UserRound, ChevronRight } from "lucide-react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
export const Route=createFileRoute("/utilizadores")({component: UsersPageRouteBoundary});
const rows=[["Administrador Municipal","admin@municipio.gov.mz","Administrador"],["Técnico de Registos","tecnico@municipio.gov.mz","Técnico"],["Fiscal Municipal","fiscal@municipio.gov.mz","Fiscal"]];
function UsersPage(){return <MobiGestShell title="Utilizadores"><PageHeader title="Utilizadores" description="Contas autorizadas a utilizar o MobiGest." action="+ Novo utilizador" actionTo="/utilizadores/novo"/><Card className="overflow-hidden">{rows.map(r=><Link to="/utilizadores/$id" params={{id:r[0]}} className="flex items-center gap-4 border-b border-slate-100 p-5 hover:bg-slate-50" key={r[1]}><div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100"><UserRound/></div><div className="min-w-0 flex-1"><p className="font-semibold text-sm">{r[0]}</p><p className="text-xs text-slate-500">{r[1]}</p></div><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{r[2]}</span><ShieldCheck className="h-4 w-4 text-emerald-500"/><ChevronRight className="h-4 w-4 text-slate-300"/></Link>)}</Card></MobiGestShell>}

function UsersPageRouteBoundary() {
  return <RouteIndexBoundary pattern="/utilizadores"><UsersPage /></RouteIndexBoundary>;
}
