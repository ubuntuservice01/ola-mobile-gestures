import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, QrCode, Save } from "lucide-react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";

export const Route = createFileRoute("/taxistas/novo")({ component: NovoTaxista });

function NovoTaxista(){
 const campos=["Nome completo","Tipo de documento","Número do documento","NUIT","Telefone","Email","Data de nascimento","Morada","Localidade / Bairro","Número MobiGest da motorizada"];
 return <MobiGestShell title="Novo taxista" subtitle="Registe o taxista e associe-o à respectiva motorizada.">
  <Link to="/taxistas" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Taxistas</Link>
  <Card className="mx-auto max-w-4xl p-7">
   <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Dados do taxista</h2><p className="mt-2 text-sm text-slate-500">A referência e o QR Code serão atribuídos pelo MobiGest após o registo.</p></div><QrCode className="h-8 w-8 text-sky-600"/></div>
   <div className="mt-6 grid gap-4 md:grid-cols-2">{campos.map(x=><label key={x} className="text-sm font-medium">{x}<input className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"/></label>)}</div>
   <label className="mt-4 block text-sm font-medium">Estado<select className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-sky-500"><option>Activo</option><option>Suspenso</option><option>Inactivo</option></select></label>
   <button type="button" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700"><Save className="h-4 w-4"/>Guardar e gerar referência</button>
  </Card>
 </MobiGestShell>
}