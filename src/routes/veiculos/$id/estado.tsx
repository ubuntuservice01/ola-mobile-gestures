import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";

export const Route = createFileRoute("/veiculos/$id/estado")({ component: AlterarEstado });

const estados = [
  ["Activa","O veículo está regular e disponível para circulação."],
  ["Pendente de validação","Registo criado mas ainda não validado."],
  ["À venda","Proprietário declarou o veículo disponível para venda."],
  ["Roubada","Veículo declarado como roubado."],
  ["Apreendida","Veículo retido pelas autoridades competentes."],
  ["Transferida","Propriedade transferida para outro proprietário."],
  ["Cancelada","Registo cancelado administrativamente."]
];

function AlterarEstado() {
  const { id } = Route.useParams();
  return <MobiGestShell title="Alterar estado" subtitle="Registar uma mudança de situação do veículo">
    <Link to="/veiculos/$id" params={{ id }} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600">
      <ArrowLeft className="h-4 w-4"/>Voltar ao veículo
    </Link>
    <div className="mx-auto max-w-3xl">
      <Card className="p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><AlertTriangle/></div>
          <div><p className="text-xs text-slate-400">Número MobiGest</p><h2 className="text-xl font-bold">{id}</h2><p className="mt-1 text-sm text-slate-500">Estado actual: <b>Activa</b></p></div>
        </div>

        <div className="mt-7">
          <h3 className="font-semibold">Nova situação</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {estados.map(([nome, descricao]) => <label key={nome} className="cursor-pointer rounded-xl border border-slate-200 p-4 hover:border-sky-300 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50">
              <input type="radio" name="estado" className="sr-only"/>
              <span className="flex items-center gap-2 font-semibold text-sm"><CheckCircle2 className="h-4 w-4 text-sky-600"/>{nome}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{descricao}</span>
            </label>)}
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Motivo<select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"><option>Seleccione o motivo</option><option>Declaração do proprietário</option><option>Fiscalização</option><option>Transferência</option><option>Decisão administrativa</option><option>Outro</option></select></label>
          <label className="text-sm font-medium">Data da ocorrência<input type="date" className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"/></label>
          <label className="text-sm font-medium">Posto administrativo<select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"><option>Seleccione</option><option>Chiuaula</option><option>Massenger</option><option>Meponda</option></select></label>
          <label className="text-sm font-medium">Referência do processo<input placeholder="Opcional" className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"/></label>
        </div>

        <label className="mt-4 block text-sm font-medium">Observações<textarea placeholder="Descreva o motivo e os elementos que justificam a alteração." className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-sky-500"/></label>
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><b>Atenção:</b> cada alteração deverá ficar associada ao histórico do veículo e ao utilizador que a efectuou.</div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Link to="/veiculos/$id" params={{ id }} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold">Cancelar</Link>
          <button className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">Guardar alteração</button>
        </div>
      </Card>
    </div>
  </MobiGestShell>;
}
