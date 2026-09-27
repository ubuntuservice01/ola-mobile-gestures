import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, QrCode, Search, ShieldAlert, ShieldCheck, MapPin, Plus } from "lucide-react";
import { MobiGestShell, Card, PageHeader } from "../components/MobiGestShell";

export const Route = createFileRoute("/fiscalizacao")({ component: Fiscalizacao });

const recentes = [
  ["MOBI-LIC-004821", "Motorizada", "Regular", "26 Set 2026 · 14:40", "Fiscal"],
  ["MOBI-LIC-004817", "Motorizada", "Irregularidade documental", "26 Set 2026 · 12:18", "Fiscal"],
  ["MOBI-LIC-004701", "Carro", "Apreendida", "25 Set 2026 · 16:03", "Fiscal"],
];

function Fiscalizacao() {
  return (
    <MobiGestShell title="Fiscalização" subtitle="Verificação de veículos e registo de ocorrências.">
      <PageHeader
        title="Fiscalização"
        description="Consulte um veículo, registe uma fiscalização e acompanhe ocorrências."
        actions={
          <Link to="/fiscalizacao/nova" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> Nova fiscalização
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><ShieldCheck /></div>
            <div>
              <h2 className="text-xl font-bold">Verificar um veículo</h2>
              <p className="mt-1 text-sm text-slate-500">Introduza o número MobiGest ou leia o QR Code.</p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <div className="flex flex-1 items-center rounded-xl border border-slate-300 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input placeholder="MOBI-LIC-000000" className="h-12 flex-1 bg-transparent px-3 outline-none" />
            </div>
            <button className="rounded-xl border border-slate-300 px-4" title="Ler QR Code"><QrCode className="h-5 w-5" /></button>
            <button className="rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white">Consultar</button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Fiscalizações hoje" value="12" />
            <Stat label="Veículos regulares" value="284" />
            <Stat label="Ocorrências abertas" value="37" />
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
            A consulta deve respeitar o município e as permissões do agente. Dados pessoais e informação financeira não são apresentados por defeito.
          </div>
        </Card>

        <Card className="p-7">
          <h3 className="font-semibold">Acções rápidas</h3>
          <div className="mt-4 space-y-3">
            <Link to="/fiscalizacao/nova" className="block rounded-xl bg-sky-600 px-4 py-3 text-center text-sm font-semibold text-white">Nova fiscalização</Link>
            <Link to="/fiscalizacao/historico" className="block rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold">Histórico de fiscalizações</Link>
          </div>
          <div className="mt-6 rounded-xl border border-slate-200 p-4">
            <div className="flex items-start gap-3"><MapPin className="h-5 w-5 text-sky-600" /><div><p className="text-sm font-semibold">Âmbito da fiscalização</p><p className="mt-1 text-xs leading-5 text-slate-500">Município, posto administrativo e localidade/bairro ficam associados ao acto.</p></div></div>
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div><h3 className="font-semibold">Fiscalizações recentes</h3><p className="mt-1 text-xs text-slate-400">Dados demonstrativos até à ligação ao Supabase.</p></div>
          <Link to="/fiscalizacao/historico" className="text-sm font-semibold text-sky-700">Ver histórico</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recentes.map(([codigo, tipo, resultado, data, fiscal]) => (
            <div key={codigo} className="grid gap-3 p-5 md:grid-cols-[1.3fr_1fr_1.4fr_1.3fr_1fr] md:items-center">
              <div><p className="text-sm font-semibold">{codigo}</p><p className="text-xs text-slate-400">{tipo}</p></div>
              <div className="text-sm">{resultado}</div>
              <span className={resultado === "Regular" ? "w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"}>{resultado}</span>
              <div className="text-xs text-slate-500">{data}</div>
              <div className="text-xs text-slate-500">{fiscal}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Fiscalizações este mês" value="96" />
        <StatCard label="Ocorrências abertas" value="37" />
        <StatCard label="Veículos apreendidos" value="8" />
      </div>
    </MobiGestShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
}
function StatCard({ label, value }: { label: string; value: string }) {
  return <Card className="p-5"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>;
}
