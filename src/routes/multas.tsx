import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ReceiptText, Search, Settings2, ShieldAlert } from "lucide-react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
export const Route=createFileRoute("/multas")({component: MultasRouteBoundary});
const data=[
["MLT-2026-0012","MTX-0001","Alberto Manuel","Excesso de lotação","1 500 MT","Pendente"],
["MLT-2026-0011","MTX-0003","Paulo Ernesto","Documentação irregular","2 500 MT","Paga"],
["MLT-2026-0010","CDT-0042","Joaquim Ernesto","Estacionamento proibido","1 000 MT","Pendente"],
];
function Multas(){return <MobiGestShell title="Multas" subtitle="Infracções aplicadas a taxistas e outros condutores.">
<PageHeader title="Multas" description="Consulte, registe e acompanhe multas emitidas no município." action="+ Aplicar multa" actionTo="/multas/nova"/>
<div className="mb-5 flex justify-end"><Link to="/multas/tipos" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Settings2 className="h-4 w-4"/>Tipos de multa</Link></div>
<div className="mb-5 grid gap-4 sm:grid-cols-3"><K l="Multas emitidas" v="12"/><K l="Pendentes" v="8"/><K l="Pagas" v="4"/></div>
<Card><div className="flex items-center gap-3 border-b border-slate-100 p-5"><Search className="h-4 w-4 text-slate-400"/><input placeholder="Pesquisar multa, condutor ou referência..." className="h-11 flex-1 bg-transparent text-sm outline-none"/></div>
<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Multa","Código condutor","Condutor","Infracção","Valor","Estado"].map(x=><th key={x} className="px-5 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.map(x=><tr key={x[0]}><td className="px-5 py-4 font-bold text-sky-700">{x[0]}</td><td className="px-5 py-4 font-semibold">{x[1]}</td><td className="px-5 py-4">{x[2]}</td><td className="px-5 py-4">{x[3]}</td><td className="px-5 py-4 font-semibold">{x[4]}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${x[5]==="Paga"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{x[5]}</span></td></tr>)}</tbody></table></div></Card></MobiGestShell>}
function K({l,v}:{l:string;v:string}){return <Card className="p-5"><ReceiptText className="h-5 w-5 text-sky-600"/><p className="mt-3 text-xs text-slate-500">{l}</p><p className="mt-1 text-2xl font-bold">{v}</p></Card>}

function MultasRouteBoundary() {
  return <RouteIndexBoundary pattern="/multas"><Multas /></RouteIndexBoundary>;
}
