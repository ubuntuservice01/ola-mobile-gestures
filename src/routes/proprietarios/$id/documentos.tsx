import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Upload, CheckCircle2, Settings2 } from "lucide-react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";
export const Route = createFileRoute("/proprietarios/$id/documentos")({component:Documentos});

const docs = [
  ["Documento de identificação","Obrigatório","Validado"],
  ["Comprovativo de residência/morada","Conforme regra municipal","Disponível"],
  ["NUIT","Quando aplicável","Pendente"],
  ["Documento de representação/autorização","Quando houver representante","Não apresentado"],
];

function Documentos(){
  const {id}=Route.useParams();
  return <MobiGestShell title="Documentos do proprietário" subtitle={id}>
    <Link to="/proprietarios/$id" params={{id}} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Voltar ao proprietário</Link>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-2xl font-bold">Documentação pessoal</h2><p className="mt-1 text-sm text-slate-500">Documentos necessários à identificação e representação.</p></div>
      <Link to="/definicoes/documentos" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><Settings2 className="h-4 w-4"/>Matriz de requisitos</Link>
    </div>
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 p-6"><h3 className="font-bold">Documentos do proprietário</h3><p className="mt-1 text-sm text-slate-500">A obrigatoriedade de documentos adicionais deve ser configurável.</p></div>
      <div className="divide-y divide-slate-100">{docs.map(([name,rule,status])=><div className="flex flex-wrap items-center gap-4 p-5" key={name}>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50"><FileText className="h-5 w-5 text-slate-500"/></div>
        <div className="min-w-0 flex-1"><p className="font-semibold text-sm">{name}</p><p className="text-xs text-slate-500">{rule}</p></div>
        <span className={status==="Validado"?"rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700":status==="Pendente"?"rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700":"rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"}>{status}</span>
        <button className="rounded-lg border border-slate-200 p-2 text-slate-500"><Upload className="h-4 w-4"/></button>
      </div>)}</div>
    </Card>
    <div className="mt-5 rounded-xl bg-sky-50 p-4 text-sm leading-6 text-sky-800"><CheckCircle2 className="mr-2 inline h-4 w-4"/>A matriz do MobiGest é configurável. Os requisitos legais e administrativos definitivos devem ser confirmados com cada município antes da produção.</div>
  </MobiGestShell>
}