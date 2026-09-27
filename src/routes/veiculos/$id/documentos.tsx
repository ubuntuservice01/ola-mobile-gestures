import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Upload, CheckCircle2, Clock3, Settings2 } from "lucide-react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";
export const Route = createFileRoute("/veiculos/$id/documentos")({component:Documentos});

const docs = [
  ["Documento de identificação do proprietário","Obrigatório","Validado"],
  ["Documento/título do veículo ou comprovativo de propriedade","Obrigatório","Validado"],
  ["Fotografia do veículo","Obrigatório","Disponível"],
  ["Comprovativo de aquisição/propriedade","Conforme regra municipal","Pendente"],
  ["Documento de inspecção/regularidade","Conforme aplicável","Não apresentado"],
  ["Outros documentos exigidos","Configurável pelo município","Não apresentado"],
];

function Documentos(){
  const {id}=Route.useParams();
  return <MobiGestShell title="Documentos do veículo" subtitle={id}>
    <Link to="/veiculos/$id" params={{id}} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Voltar ao veículo</Link>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-2xl font-bold">Documentação</h2><p className="mt-1 text-sm text-slate-500">Requisitos e documentos associados ao registo.</p></div>
      <Link to="/definicoes/documentos" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><Settings2 className="h-4 w-4"/>Ver matriz de requisitos</Link>
    </div>
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 p-6"><h3 className="font-bold">Documentos do processo</h3><p className="mt-1 text-sm text-slate-500">A obrigatoriedade final depende do tipo de veículo e das regras configuradas para o município.</p></div>
      <div className="divide-y divide-slate-100">{docs.map(([name,rule,status])=><div className="flex flex-wrap items-center gap-4 p-5" key={name}>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50"><FileText className="h-5 w-5 text-slate-500"/></div>
        <div className="min-w-0 flex-1"><p className="font-semibold text-sm">{name}</p><p className="text-xs text-slate-500">{rule}</p></div>
        <span className={status==="Validado"?"rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700":status==="Pendente"?"rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700":"rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"}>{status}</span>
        <button className="rounded-lg border border-slate-200 p-2 text-slate-500" title="Adicionar ou substituir documento"><Upload className="h-4 w-4"/></button>
      </div>)}</div>
    </Card>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <Card className="p-5"><CheckCircle2 className="h-5 w-5 text-emerald-600"/><p className="mt-3 font-semibold text-sm">Regra de validação</p><p className="mt-1 text-xs leading-5 text-slate-500">Um processo não deve ser aprovado enquanto existir documento obrigatório em falta, rejeitado ou, quando aplicável, expirado.</p></Card>
      <Card className="p-5"><Clock3 className="h-5 w-5 text-amber-600"/><p className="mt-3 font-semibold text-sm">Validade</p><p className="mt-1 text-xs leading-5 text-slate-500">O sistema poderá guardar data de emissão e validade e gerar alertas para documentos sujeitos a prazo.</p></Card>
    </div>
  </MobiGestShell>
}