import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, MapPin, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/q/$codigo")({ component: QRConsulta });

function QRConsulta() {
  const { codigo } = Route.useParams();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-md">
        <Link to="/consulta" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-sky-600">
          <ArrowLeft className="h-4 w-4" /> Consulta pública
        </Link>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-7 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-100 bg-white">
              <QRCodeSVG value={`${window.location.origin}/q/${codigo}`} size={78} level="M" includeMargin />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Número MobiGest</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{codigo}</h1>
          </div>

          <div className="p-7">
            <div className="rounded-xl bg-emerald-50 p-5 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="mt-2 font-semibold text-emerald-700">Registo válido</p>
              <p className="mt-1 text-sm text-emerald-700/70">Veículo com estado Activa</p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["Tipo", "Motorizada"],
                ["Marca", "Honda"],
                ["Modelo", "CB 125"],
                ["Cor", "Preta"],
                ["Município", "Município"],
                ["Situação", "Activa"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
              <MapPin className="h-4 w-4 shrink-0 text-sky-600" />
              Registo municipal verificado
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
              Esta consulta confirma o estado do registo. Dados pessoais do proprietário não são apresentados publicamente.
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4" /> Consulta pública MobiGest
        </div>
      </div>
    </main>
  );
}
