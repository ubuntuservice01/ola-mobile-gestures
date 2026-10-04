import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Search, ChevronRight } from "lucide-react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
export const Route=createFileRoute("/registos")({component: RegistosRouteBoundary});
const rows=[
 {id:"REG-00281",date:"26 Set 2026 · 14:32",op:"Registo de veículo",vehicle:"MZ-LIC-004821",user:"Administrador",status:"Concluído"},
 {id:"REG-00280",date:"26 Set 2026 · 13:48",op:"QR Code gerado",vehicle:"MZ-LIC-004820",user:"Administrador",status:"Concluído"},
 {id:"REG-00279",date:"25 Set 2026 · 16:10",op:"Alteração de proprietário",vehicle:"MZ-LIC-004819",user:"Técnico",status:"Concluído"},
];
function Registos(){return <MobiGestShell title="Registos"><PageHeader title="Registos" description="Histórico das operações realizadas no sistema."/><Card className="overflow-hidden"><div className="flex items-center border-b border-slate-100 p-5"><Search className="h-4 w-4 text-slate-400"/><input placeholder="Pesquisar operação, veículo ou utilizador..." className="h-11 flex-1 bg-transparent px-3 text-sm outline-none"/></div><div className="divide-y divide-slate-100">{rows.map(r=><Link key={r.id} to="/registos/$id" params={{id:r.id}} className="flex items-center gap-4 p-5 transition hover:bg-slate-50"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50"><FileText className="h-5 w-5 text-slate-500"/></div><div className="min-w-0 flex-1"><p className="font-semibold text-sm">{r.op}</p><p className="text-xs text-slate-500">{r.id} · {r.vehicle} · {r.user}</p></div><span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:block">{r.status}</span><span className="text-xs text-slate-400">{r.date}</span><ChevronRight className="h-4 w-4 text-slate-300"/></Link>)}</div></Card></MobiGestShell>}

function RegistosRouteBoundary() {
  return <RouteIndexBoundary pattern="/registos"><Registos /></RouteIndexBoundary>;
}
