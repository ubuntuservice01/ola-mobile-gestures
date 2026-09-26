import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Clock3, FileText, MapPin, ShieldAlert } from "lucide-react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";

export const Route = createFileRoute("/fiscalizacao/historico")({ component: HistoricoFiscalizacao });

const rows = [
  ["MZ-LIC-004821","Fiscalização","Regular","26 Set 2026 · 14:40","Administrador"],
  ["MZ-LIC-004817","Infração","Com observação","26 Set 2026 · 12:18","Fiscal"],
  ["MZ-LIC-004701","Apreensão","Apreendida","25 Set 2026 · 16:03","Fiscal"],
  ["MZ-LIC-003992","Roubo","Roubada","24 Set 2026 · 09:45","Fiscal"],
];

function HistoricoFiscalizacao() {
  return <MobiGestShell title="Histórico de fiscalização" subtitle="Consultas e ocorrências registadas pelos agentes">
    <Link to="/fiscalizacao" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Voltar à fiscalização</Link>
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 p-5"><div className="flex flex-col gap-3 md:flex-row"><input placeholder="Pesquisar número MobiGest..." className="h-11 flex-1 rounded-xl border border-slate-300 px-4"/><select className="h-11 rounded-xl border border-slate-300 px-3"><option>Todos os tipos</option><option>Fiscalização</option><option>Infração</option><option>Apreensão</option><option>Roubo</option><option>Recuperação</option></select><input type="date" className="h-11 rounded-xl border border-slate-300 px-3"/></div></div>
      <div className="divide-y divide-slate-100">{rows.map(([codigo,tipo,resultado,data,utilizador])=><div key={codigo+data} className="grid gap-3 p-5 md:grid-cols-[1.3fr_1fr_1fr_1.3fr_1fr] md:items-center"><div><p className="font-semibold text-sm">{codigo}</p><p className="text-xs text-slate-400">Motorizada · Chiuaula</p></div><div className="text-sm">{tipo}</div><div><span className={resultado==="Regular"?"rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700":"rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"}>{resultado}</span></div><div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-4 w-4"/>{data}</div><div className="text-xs text-slate-500">{utilizador}</div></div>)}</div>
      <div className="grid gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:grid-cols-3"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600"/><div><p className="text-xs text-slate-400">Regulares</p><p className="font-bold">284</p></div></div><div className="flex items-center gap-3"><ShieldAlert className="h-5 w-5 text-amber-600"/><div><p className="text-xs text-slate-400">Com ocorrências</p><p className="font-bold">37</p></div></div><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-sky-600"/><div><p className="text-xs text-slate-400">Este mês</p><p className="font-bold">96</p></div></div></div>
    </Card>
  </MobiGestShell>;
}
