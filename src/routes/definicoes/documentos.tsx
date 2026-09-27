import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, FileCheck2, Info, Settings2 } from "lucide-react";
import { MobiGestShell, PageHeader, Card } from "../../components/MobiGestShell";

export const Route = createFileRoute("/definicoes/documentos")({component:RequisitosDocumentais});

const rows = [
  ["Identificação do proprietário","Todos","Obrigatório","Identificar o titular do registo."],
  ["Comprovativo de residência/morada","Todos","Configurável","Associar o proprietário à morada declarada."],
  ["Documento/título do veículo ou comprovativo de propriedade","Motorizada / Carro","Obrigatório","Comprovar a titularidade ou base documental do veículo."],
  ["Comprovativo de aquisição/propriedade","Todos","Configurável","Usado quando a documentação municipal exigir prova adicional."],
  ["Fotografia do veículo","Todos","Obrigatório","Apoiar a identificação visual do registo."],
  ["Número de chassis","Motorizada / Carro","Obrigatório","Identificador técnico do veículo."],
  ["Número do quadro","Bicicleta","Obrigatório quando existente","Identificador da bicicleta quando disponível."],
  ["Número do motor","Motorizada / Carro","Configurável","Registar quando aplicável ao veículo."],
  ["Matrícula","Motorizada / Carro","Configurável","Registar quando aplicável."],
  ["Documento de inspecção/regularidade","Motorizada / Carro","Configurável","Usar quando for exigido para o processo."],
  ["Documento de representação/autorização","Todos","Condicional","Necessário quando alguém actua em representação do proprietário."],
  ["Outros documentos municipais","Todos","Configurável","Permitir requisitos específicos por município ou tipo."],
];

const status = ["Não apresentado","Em validação","Validado","Rejeitado","Expirado"];

function RequisitosDocumentais(){
  return <MobiGestShell title="Requisitos documentais" subtitle="Matriz funcional dos documentos do MobiGest.">
    <PageHeader title="Documentos obrigatórios por tipo" description="Configure os requisitos do processo antes de ligar a documentação ao Supabase."/>
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <Card className="p-5"><FileCheck2 className="h-5 w-5 text-sky-600"/><p className="mt-3 text-sm font-bold">Obrigatório</p><p className="mt-1 text-xs leading-5 text-slate-500">Sem o documento, o processo não pode avançar para aprovação.</p></Card>
      <Card className="p-5"><Settings2 className="h-5 w-5 text-amber-600"/><p className="mt-3 text-sm font-bold">Configurável</p><p className="mt-1 text-xs leading-5 text-slate-500">Pode variar conforme município, tipo de veículo ou regra administrativa.</p></Card>
      <Card className="p-5"><CheckCircle2 className="h-5 w-5 text-emerald-600"/><p className="mt-3 text-sm font-bold">Validação</p><p className="mt-1 text-xs leading-5 text-slate-500">Cada documento terá estado, responsável e data de validação.</p></Card>
    </div>
    <Card className="overflow-x-auto">
      <table className="min-w-[1050px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Documento / requisito</th><th className="px-5 py-4">Tipo</th><th className="px-5 py-4">Regra</th><th className="px-5 py-4">Finalidade</th></tr></thead>
        <tbody>{rows.map(([name,type,rule,purpose])=><tr key={name} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{name}</td><td className="px-5 py-4 text-slate-600">{type}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{rule}</span></td><td className="px-5 py-4 text-slate-500">{purpose}</td></tr>)}</tbody>
      </table>
    </Card>
    <Card className="mt-5 p-5">
      <div className="flex items-start gap-3"><Info className="mt-0.5 h-5 w-5 text-sky-600"/><div><p className="font-semibold text-sm">Estados documentais</p><p className="mt-1 text-sm text-slate-500">{status.join(" · ")}.</p><p className="mt-2 text-xs leading-5 text-slate-400">Esta é a matriz funcional do produto, não uma declaração de requisitos legais nacionais. Antes da produção, cada município deverá confirmar quais documentos são efectivamente exigidos.</p></div></div>
    </Card>
  </MobiGestShell>
}