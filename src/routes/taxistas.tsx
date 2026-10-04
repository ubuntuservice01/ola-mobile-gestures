import { createFileRoute } from "@tanstack/react-router";
import { Eye, QrCode, Search, UserRoundCheck } from "lucide-react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";

export const Route = createFileRoute("/taxistas")({ component: Taxistas });

const taxistas = [
  { ref: "MTX-0001", nome: "Alberto Manuel", telefone: "+258 84 000 0000", moto: "MZ-LIC-004821", zona: "Centro", estado: "Activo" },
  { ref: "MTX-0002", nome: "Salvador João", telefone: "+258 86 111 1111", moto: "MZ-LIC-004818", zona: "Chiuaula", estado: "Activo" },
  { ref: "MTX-0003", nome: "Paulo Ernesto", telefone: "+258 87 222 2222", moto: "MZ-LIC-004816", zona: "Massenger", estado: "Suspenso" },
];

function Taxistas() {
  return (
    <MobiGestShell title="Taxistas" subtitle="Gestão e identificação dos taxistas registados no município.">
      <PageHeader title="Taxistas" description="Cada taxista recebe uma referência MobiGest e QR Code individual para identificação." action="+ Novo taxista" actionTo="/taxistas/novo" />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Metric label="Taxistas registados" value="3" />
        <Metric label="Activos" value="2" />
        <Metric label="Suspensos" value="1" />
      </div>
      <Card>
        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
          <Search className="h-4 w-4 text-slate-400" />
          <input placeholder="Pesquisar por nome, referência, telefone ou motorizada..." className="h-11 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Referência","Taxista","Contacto","Motorizada","Zona","Estado","QR / Acções"].map(x=><th className="px-5 py-3" key={x}>{x}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {taxistas.map(t=><tr key={t.ref} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 font-bold text-sky-700">{t.ref}</td>
                <td className="px-5 py-4 font-semibold">{t.nome}</td>
                <td className="px-5 py-4 text-slate-600">{t.telefone}</td>
                <td className="px-5 py-4">{t.moto}</td>
                <td className="px-5 py-4">{t.zona}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.estado==="Activo"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{t.estado}</span></td>
                <td className="px-5 py-4"><div className="flex gap-2"><button title="QR Code" className="rounded-lg p-2 text-sky-600 hover:bg-sky-50"><QrCode className="h-4 w-4"/></button><button title="Ver ficha" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4"/></button></div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </MobiGestShell>
  );
}
function Metric({label,value}:{label:string;value:string}){return <Card className="p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><UserRoundCheck className="h-5 w-5"/></span><div><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p></div></div></Card>}