import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search, ShieldAlert } from "lucide-react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
export const Route=createFileRoute("/multas/nova")({component:NovaMulta});
function NovaMulta(){return <MobiGestShell title="Aplicar multa" subtitle="Identifique primeiro o condutor antes de registar a infracção.">
<Link to="/multas" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4"/>Multas</Link>
<div className="mx-auto max-w-4xl space-y-5">
<Card className="p-7"><div className="flex items-start gap-3"><ShieldAlert className="h-6 w-6 text-sky-600"/><div><h2 className="text-lg font-bold">1. Identificar condutor</h2><p className="mt-1 text-sm text-slate-500">Introduza a referência do taxista ou de outro condutor.</p></div></div><div className="mt-5 flex gap-2"><div className="flex flex-1 items-center rounded-xl border border-slate-300 px-3"><Search className="h-4 w-4 text-slate-400"/><input placeholder="Ex.: MTX-0001 ou CDT-0042" className="h-12 flex-1 px-3 outline-none"/></div><button className="rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white">Consultar</button></div></Card>
<Card className="p-7"><h2 className="text-lg font-bold">2. Dados da multa</h2><p className="mt-1 text-sm text-slate-500">Após a identificação, seleccione uma infracção configurada pelo município.</p><div className="mt-5 grid gap-4 md:grid-cols-2">
<label className="text-sm font-medium">Tipo de multa<select className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"><option>Seleccione uma infracção</option><option>Excesso de lotação — 1 500 MT</option><option>Documentação irregular — 2 500 MT</option><option>Estacionamento proibido — 1 000 MT</option></select></label>
<label className="text-sm font-medium">Local da infracção<input className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"/></label>
<label className="text-sm font-medium md:col-span-2">Observações<textarea className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3"/></label></div>
<button className="mt-6 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">Emitir multa</button></Card></div></MobiGestShell>}