import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { fmtDate } from "../../../components/financeiro/ui";
import { municipalityName, useCharges } from "../../../lib/financeiro/store";
import { methodLabel, mt, serviceLabel, statusLabel } from "../../../lib/financeiro/types";

export const Route = createFileRoute("/financeiro/recibo/$id")({
  head: () => ({ meta: [{ title: "Recibo — MobiGest" }, { name: "description", content: "Recibo de pagamento MobiGest." }] }),
  component: Recibo,
});

// Preparado para futura geração de PDF (mesmo layout).
function Recibo() {
  const { id } = Route.useParams();
  const c = useCharges().find((x) => x.id === id);
  if (!c) return <p className="p-10 text-center text-sm">Recibo não encontrado.</p>;
  const rows: [string, string][] = [["Referência", c.reference], ["Data", c.payment ? fmtDate(c.payment.paidAt) : fmtDate(c.createdAt)], ["Proprietário", c.ownerName], ["Veículo", c.vehicle], ["Serviço", serviceLabel[c.service]], ["Valor", mt(c.appliedAmount)], ["Método de pagamento", c.payment ? methodLabel[c.payment.method] : "—"], ["Estado", statusLabel[c.status]], ["Utilizador responsável", c.payment?.userName ?? c.createdBy]];
  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-xl justify-between print:hidden"><Link to="/financeiro/$id" params={{ id }} className="text-sm text-slate-500">← Voltar</Link><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><Printer className="h-4 w-4" />Imprimir recibo</button></div>
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-200 pb-5"><img src="/mobigest-logo.svg" alt="MobiGest" className="h-10" /><div className="text-right"><p className="font-bold">{municipalityName(c.municipalityId)}</p><p className="text-xs text-slate-500">Recibo de pagamento</p></div></div>
        <div className="mt-6 space-y-3">{rows.map(([l, v]) => <div key={l} className="flex justify-between border-b border-slate-100 pb-2 text-sm"><span className="text-slate-500">{l}</span><b>{v}</b></div>)}</div>
        <p className="mt-8 text-center text-[10px] text-slate-400">Documento de demonstração — sem validade fiscal.</p>
      </div>
    </div>
  );
}
