import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, FileText, MapPin, ShieldAlert, UserRound } from "lucide-react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";
export const Route=createFileRoute("/veiculos/$id/historico")({component:Historico});
const events=[
 ["26 Set 2026 15:02","Estado actual","Activa","O registo encontra-se activo.","green"],
 ["26 Set 2026 14:40","Proprietário associado","Alberto Manuel","Proprietário confirmado no acto de registo.","blue"],
 ["26 Set 2026 14:35","QR Code gerado","MZ-LIC-004821","Código de identificação criado para o veículo.","blue"],
 ["26 Set 2026 14:32","Registo criado","Pendente de validação","Registo inicial criado pelo técnico.","amber"],
];
function Historico(){const {id}=Route.useParams();return <MobiGestShell title="Histórico do veículo" subtitle="Linha temporal das alterações e ocorrências">
 <Link to="/veiculos/$id" params={{id}} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Voltar ao veículo</Link>
 <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
  <Card className="p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-slate-400">Número MobiGest</p><h2 className="text-xl font-bold">{id}</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Activa</span></div>
   <div className="relative mt-8 space-y-7 before:absolute before:left-5 before:top-2 before:h-[calc(100%-12px)] before:w-px before:bg-slate-200">{events.map(([date,title,value,desc,tone])=><div className="relative flex gap-4" key={date+title}><div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white ${tone==="green"?"bg-emerald-100 text-emerald-600":tone==="amber"?"bg-amber-100 text-amber-600":"bg-sky-100 text-sky-600"}`}>{title.includes("Estado")?<ShieldAlert className="h-4 w-4"/>:<CheckCircle2 className="h-4 w-4"/>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{title}</p><span className="text-xs text-slate-400">{date}</span></div><p className="mt-1 text-sm font-medium text-slate-600">{value}</p><p className="mt-1 text-sm text-slate-500">{desc}</p><p className="mt-2 flex items-center gap-1 text-xs text-slate-400"><UserRound className="h-3 w-3"/>Administrador</p></div></div>)}</div>
  </Card>
  <div className="space-y-4"><Card className="p-5"><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-sky-600"/><div><p className="text-xs text-slate-400">Última actualização</p><p className="text-sm font-semibold">26 Set 2026 · 15:02</p></div></div></Card><Card className="p-5"><div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-sky-600"/><div><p className="text-xs text-slate-400">Localização administrativa</p><p className="text-sm font-semibold">Chiuaula</p><p className="text-xs text-slate-500">Município de Lichinga</p></div></div></Card><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600"/><div><p className="text-sm font-semibold text-amber-900">Registo de ocorrência</p><p className="mt-1 text-xs leading-5 text-amber-800">Alterações como roubo, apreensão ou recuperação devem ficar associadas ao histórico.</p></div></div></div></div>
 </div>
 </MobiGestShell>}
