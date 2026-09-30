import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileCheck2, Save } from "lucide-react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";

export const Route = createFileRoute("/registos/correcao/$id")({ component: Correcao });

function Correcao() {
  const { id } = Route.useParams();
  return <MobiGestShell title="Solicitar correcção" subtitle="Devolver o processo ao requerente com as informações em falta">
    <Link to="/registos/validacao" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Voltar à validação</Link>
    <div className="mx-auto max-w-3xl">
      <Card className="p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><FileCheck2/></div>
          <div><p className="text-xs text-slate-400">Processo</p><h2 className="text-xl font-bold">REG-2026-{id}</h2><p className="mt-1 text-sm text-slate-500">Solicitação de correcção</p></div>
        </div>
        <label className="mt-7 block text-sm font-medium">Elementos a corrigir
          <textarea className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-sky-500" placeholder="Indique claramente o que deve ser corrigido ou apresentado..." />
        </label>
        <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">O processo ficará pendente até que a informação solicitada seja corrigida e submetida novamente.</div>
        <div className="mt-6 flex justify-end gap-3"><Link to="/registos/validacao" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold">Cancelar</Link><button className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white"><Save className="h-4 w-4"/>Enviar solicitação</button></div>
      </Card>
    </div>
  </MobiGestShell>;
}
