import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, QrCode, ShieldCheck } from "lucide-react";
export const Route=createFileRoute("/consulta/$codigo")({component:Resultado});

const publicFields = [
  ["Tipo", "Motorizada"],
  ["Marca", "Honda"],
  ["Modelo", "CB 125"],
  ["Cor", "Preta"],
  ["Ano", "2025"],
  ["Município", "Lichinga"],
];

function Resultado(){
  const {codigo}=Route.useParams();
  return <main className="min-h-screen bg-slate-50 px-5 py-10">
    <div className="mx-auto max-w-xl">
      <Link to="/consulta" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4"/>Nova consulta</Link>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-7 text-center">
          <img src="/mobigest-logo.svg" className="mx-auto h-10 w-auto" alt="MobiGest"/>
          <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50"><ShieldCheck className="h-9 w-9 text-emerald-600"/></div>
          <p className="mt-5 text-xs uppercase tracking-wider text-slate-400">Número MobiGest</p>
          <h1 className="mt-1 text-2xl font-bold">{codigo}</h1>
        </div>
        <div className="p-7">
          <div className="rounded-xl bg-emerald-50 p-5 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600"/>
            <p className="mt-2 font-semibold text-emerald-700">Registo válido</p>
            <p className="mt-1 text-sm text-emerald-700/70">Estado actual: Activa</p>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {publicFields.map(([a,b])=><div className="rounded-xl bg-slate-50 p-4" key={a}><p className="text-xs text-slate-400">{a}</p><p className="mt-1 text-sm font-semibold">{b}</p></div>)}
          </div>
          <div className="mt-5 rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3"><QrCode className="h-5 w-5 text-sky-600"/><div><p className="text-sm font-semibold">Identificação pública</p><p className="text-xs text-slate-500">O número e o QR Code confirmam o registo no MobiGest.</p></div></div>
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
            <b className="text-slate-700">Privacidade:</b> nome do proprietário, BI/NUIT, contactos, morada, chassis/quadro, motor, documentos, histórico de fiscalização, pagamentos e localização detalhada não são apresentados nesta consulta.
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4"/>MobiGest · Consulta pública protegida</div>
    </div>
  </main>
}
