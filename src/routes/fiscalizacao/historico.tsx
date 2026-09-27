import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Clock3, FileText, ShieldAlert, Search, SlidersHorizontal } from "lucide-react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";

export const Route = createFileRoute("/fiscalizacao/historico")({ component: HistoricoFiscalizacao });

const rows = [
  ["MOBI-LIC-004821","Fiscalização","Regular","26 Set 2026 · 14:40","Fiscal"],
  ["MOBI-LIC-004817","Irregularidade documental","Em análise","26 Set 2026 · 12:18","Fiscal"],
  ["MOBI-LIC-004701","Apreensão","Veículo apreendido","25 Set 2026 · 16:03","Fiscal"],
  ["MOBI-LIC-003992","Roubo","Veículo reportado como roubado","24 Set 2026 · 09:45","Fiscal"],
];

function HistoricoFiscalizacao() {
  return <MobiGestShell title="Histórico de fiscalização" subtitle="Consultas e ocorrências registadas pelos agentes">
    <Link to="/fiscalizacao" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Voltar à fiscalização</Link>
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4 text-sky-600"/>Filtros</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-center rounded-xl border border-slate-300 px-3"><Search className="h-4 w-4 text-slate-400"/><input placeholder="Número MobiGest..." className="h-11 w-full bg-transparent px-3 outline-none"/></div>
          <select className="h-11 rounded-xl border border-slate-300 px-3"><option>Todos os tipos</option><option>Motorizada</option><option>Carro</option><option>Bicicleta</option></select>
          <select className="h-11 rounded-xl border border-slate-300 px-3"><option>Todos os resultados</option><option>Regular</option><option>Irregularidade documental</option><option>Roubado</option><option>Apreendido</option></select>
          <input type="date" className="h-11 rounded-xl border border-slate-300 px-3"/>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map(([codigo,tipo,resultado,data,fiscal])=><div key={codigo+data} className="grid gap-3 p-5 md:grid-cols-[1.25fr_1.2fr_1.5fr_1.3fr_1fr] md:items-center"><div><p className="font-semibold text-sm">{codigo}</p><p className="text-xs text-slate-400">Motorizada · Chiuaula</p></div><div className="text-sm">{tipo}</div><div><span className={resultado==="Regular"?"rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700":"rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"}>{resultado}</span></div><div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-4 w-4"/>{data}</div><div className="text-xs text-slate-500">{fiscal}</div></div>)}
      </div>
      <div className="grid gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:grid-cols-3"><Summary icon={<CheckCircle2 className="h-5 w-5 text-emerald-600"/>} label="Regulares" value="284"/><Summary icon={<ShieldAlert className="h-5 w-5 text-amber-600"/>} label="Com ocorrências" value="37"/><Summary icon={<FileText className="h-5 w-5 text-sky-600"/>} label="Este mês" value="96"/></div>
    </Card>
  </MobiGestShell>;
}

function Summary({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) {
  return <div className="flex items-center gap-3">{icon}<div><p className="text-xs text-slate-400">{label}</p><p className="font-bold">{value}</p></div></div>;
}
