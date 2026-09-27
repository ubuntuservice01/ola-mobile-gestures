import { Link } from "@tanstack/react-router";
import { useCharges } from "@/lib/financeiro/store";
import { mt } from "@/lib/financeiro/types";

export function DashboardFinance() {
  const c = useCharges();
  const paid = c.filter((x) => x.status === "pago");
  const items = [["Receitas do período", mt(paid.reduce((a, x) => a + x.appliedAmount, 0))], ["Cobranças pendentes", String(c.filter((x) => x.status === "pendente" || x.status === "em_confirmacao").length)], ["Pagamentos confirmados", String(paid.length)], ["Isenções", String(c.filter((x) => x.status === "isento").length)]];
  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold">Resumo financeiro</h3><p className="text-xs text-amber-700">Dados de demonstração</p></div><Link to="/financeiro" className="text-xs font-semibold text-sky-600">Ver financeiro</Link></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map(([l, v]) => <div key={l} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{l}</p><p className="mt-1 text-xl font-bold">{v}</p></div>)}</div>
    </section>
  );
}
