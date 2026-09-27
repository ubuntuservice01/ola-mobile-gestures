import { createFileRoute } from "@tanstack/react-router";
import { Download, FileBarChart } from "lucide-react";
import { useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
import { DemoNotice, inputCls } from "../components/financeiro/ui";
import { municipalities, useCharges } from "../lib/financeiro/store";
import { methodLabel, mt, serviceLabel, statusLabel, vehicleLabel } from "../lib/financeiro/types";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — MobiGest" }, { name: "description", content: "Relatórios de gestão e financeiros do município." }, { property: "og:title", content: "Relatórios — MobiGest" }, { property: "og:description", content: "Relatórios de gestão e financeiros." }] }),
  component: Relatorios,
});

function Relatorios() {
  const items = ["Veículos registados por período", "Veículos por tipo", "Veículos por estado", "Novos proprietários", "Transferências de propriedade", "Ocorrências de fiscalização", "Veículos roubados"];
  const all = useCharges();
  const [f, setF] = useState({ m: "", from: "", to: "", s: "", v: "", st: "", pm: "" });
  const c = all.filter((x) => (!f.m || x.municipalityId === f.m) && (!f.from || x.createdAt >= f.from) && (!f.to || x.createdAt.slice(0, 10) <= f.to) && (!f.s || x.service === f.s) && (!f.v || x.vehicleType === f.v) && (!f.st || x.status === f.st) && (!f.pm || x.payment?.method === f.pm));
  const paid = c.filter((x) => x.status === "pago");
  const group = (key: (x: (typeof c)[number]) => string) => Object.entries(paid.reduce<Record<string, number>>((a, x) => ({ ...a, [key(x)]: (a[key(x)] ?? 0) + x.appliedAmount }), {}));
  const count = (s: string) => c.filter((x) => x.status === s);
  const sel = (k: keyof typeof f, opts: Record<string, string>, ph: string) => <select className={inputCls} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}><option value="">{ph}</option>{Object.entries(opts).map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select>;
  const fin: [string, [string, string][]][] = [
    ["Receitas por período", [["Total recebido", mt(paid.reduce((a, x) => a + x.appliedAmount, 0))]]],
    ["Receitas por serviço", group((x) => serviceLabel[x.service]).map(([k, v]) => [k, mt(v)])],
    ["Receitas por tipo de veículo", group((x) => vehicleLabel[x.vehicleType]).map(([k, v]) => [k, mt(v)])],
    ["Receitas por método de pagamento", group((x) => methodLabel[x.payment!.method]).map(([k, v]) => [k, mt(v)])],
    ["Cobranças pendentes", [["Quantidade", String(count("pendente").length + count("em_confirmacao").length)]]],
    ["Cobranças canceladas", [["Quantidade", String(count("cancelado").length)]]],
    ["Isenções", [["Quantidade", String(count("isento").length)]]],
    ["Reembolsos", [["Quantidade", String(count("reembolsado").length)], ["Valor", mt(count("reembolsado").reduce((a, x) => a + x.appliedAmount, 0))]]],
  ];
  return (
    <MobiGestShell title="Relatórios">
      <PageHeader title="Relatórios" description="Consulte e exporte informação de gestão municipal." />
      <div className="grid gap-4 md:grid-cols-2">{items.map((x) => <Card className="flex items-center gap-4 p-5" key={x}><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><FileBarChart /></div><div className="flex-1"><p className="text-sm font-semibold">{x}</p><p className="mt-1 text-xs text-slate-500">Gerar relatório actualizado</p></div><button className="rounded-lg border border-slate-200 p-2 text-slate-500"><Download className="h-4 w-4" /></button></Card>)}</div>
      <h2 className="mt-10 mb-4 text-xl font-bold">Relatórios financeiros</h2>
      <DemoNotice />
      <Card className="mb-4 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {sel("m", Object.fromEntries(municipalities.map((m) => [m.id, m.name])), "Todos os municípios")}
        <input type="date" className={inputCls} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} aria-label="Data inicial" />
        <input type="date" className={inputCls} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} aria-label="Data final" />
        {sel("s", serviceLabel, "Todos os serviços")}
        {sel("v", { motorizada: "Motorizada", carro: "Carro", bicicleta: "Bicicleta" }, "Todos os veículos")}
        {sel("st", statusLabel, "Todos os estados")}
        {sel("pm", methodLabel, "Todos os métodos")}
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{fin.map(([t, rows]) => <Card key={t} className="p-5"><p className="mb-3 text-sm font-semibold">{t}</p>{rows.length ? rows.map(([k, v]) => <div key={k} className="flex justify-between py-1 text-sm"><span className="text-slate-500">{k}</span><b>{v}</b></div>) : <p className="text-xs text-slate-400">Sem dados</p>}</Card>)}</div>
    </MobiGestShell>
  );
}
