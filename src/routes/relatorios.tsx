import { createFileRoute } from "@tanstack/react-router";
import { Download, FileBarChart, Printer, ShieldAlert, Bike, CarFront, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
import { DemoNotice, inputCls } from "../components/financeiro/ui";
import { municipalities, useCharges } from "../lib/financeiro/store";
import { methodLabel, mt, serviceLabel, statusLabel, vehicleLabel } from "../lib/financeiro/types";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — MobiGest" }, { name: "description", content: "Relatórios de gestão municipal do MobiGest." }] }),
  component: Relatorios,
});

const managementReports = [
  { title: "Veículos registados", description: "Registos por período, município e tipo.", icon: Bike },
  { title: "Veículos por estado", description: "Activos, suspensos, roubados, apreendidos e cancelados.", icon: ShieldAlert },
  { title: "Proprietários", description: "Novos proprietários e distribuição por município.", icon: Users },
  { title: "Transferências", description: "Transferências de propriedade realizadas.", icon: FileBarChart },
  { title: "Fiscalização", description: "Fiscalizações, ocorrências e resultados.", icon: ShieldAlert },
  { title: "Receitas", description: "Receitas por serviço e método de pagamento.", icon: Wallet },
  { title: "Veículos roubados", description: "Relação de veículos com esse estado.", icon: CarFront },
];

function Relatorios() {
  const charges = useCharges();
  const [f, setF] = useState({ municipality: "", from: "", to: "", service: "", vehicle: "", status: "", method: "" });

  const filtered = charges.filter((x) =>
    (!f.municipality || x.municipalityId === f.municipality) &&
    (!f.from || x.createdAt.slice(0, 10) >= f.from) &&
    (!f.to || x.createdAt.slice(0, 10) <= f.to) &&
    (!f.service || x.service === f.service) &&
    (!f.vehicle || x.vehicleType === f.vehicle) &&
    (!f.status || x.status === f.status) &&
    (!f.method || x.payment?.method === f.method)
  );

  const paid = filtered.filter((x) => x.status === "pago");
  const revenue = paid.reduce((sum, x) => sum + x.appliedAmount, 0);
  const pending = filtered.filter((x) => x.status === "pendente" || x.status === "em_confirmacao").length;
  const exemptions = filtered.filter((x) => x.status === "isento").length;

  const set = (key: keyof typeof f, value: string) => setF((old) => ({ ...old, [key]: value }));
  const downloadCsv = () => {
    const header = "Referência,Data,Município,Proprietário,Veículo,Serviço,Valor,Estado";
    const rows = filtered.map((x) => [x.reference, x.createdAt.slice(0, 10), x.municipalityId, x.ownerName, x.vehicle, serviceLabel[x.service], x.appliedAmount, statusLabel[x.status]].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mobigest-relatorio.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <MobiGestShell title="Relatórios" subtitle="Informação de gestão municipal e financeira.">
      <PageHeader title="Relatórios" description="Consulte indicadores, filtre os dados e prepare relatórios para impressão ou exportação." />
      <DemoNotice />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Registos financeiros" value={String(filtered.length)} />
        <Metric title="Receita confirmada" value={mt(revenue)} />
        <Metric title="Cobranças pendentes" value={String(pending)} />
        <Metric title="Isenções" value={String(exemptions)} />
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Filtros do relatório</h2><p className="mt-1 text-xs text-slate-500">Os mesmos filtros serão usados nos relatórios ligados ao Supabase.</p></div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"><Printer className="h-4 w-4" />Imprimir</button>
            <button onClick={downloadCsv} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"><Download className="h-4 w-4" />Exportar CSV</button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select className={inputCls} value={f.municipality} onChange={(e) => set("municipality", e.target.value)}><option value="">Todos os municípios</option>{municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <input type="date" className={inputCls} value={f.from} onChange={(e) => set("from", e.target.value)} aria-label="Data inicial" />
          <input type="date" className={inputCls} value={f.to} onChange={(e) => set("to", e.target.value)} aria-label="Data final" />
          <select className={inputCls} value={f.service} onChange={(e) => set("service", e.target.value)}><option value="">Todos os serviços</option>{Object.entries(serviceLabel).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className={inputCls} value={f.vehicle} onChange={(e) => set("vehicle", e.target.value)}><option value="">Todos os veículos</option>{Object.entries(vehicleLabel).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value)}><option value="">Todos os estados</option>{Object.entries(statusLabel).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className={inputCls} value={f.method} onChange={(e) => set("method", e.target.value)}><option value="">Todos os métodos</option>{Object.entries(methodLabel).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button onClick={() => setF({ municipality: "", from: "", to: "", service: "", vehicle: "", status: "", method: "" })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Limpar filtros</button>
        </div>
      </Card>

      <h2 className="mb-4 mt-8 text-xl font-bold">Relatórios de gestão</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {managementReports.map(({ title, description, icon: Icon }) => (
          <Card key={title} className="p-5">
            <div className="flex items-start gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Icon className="h-5 w-5" /></div><div className="flex-1"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{description}</p></div></div>
            <div className="mt-5 flex gap-2"><button onClick={() => window.print()} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Imprimir</button><button onClick={downloadCsv} className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Exportar</button></div>
          </Card>
        ))}
      </div>

      <h2 className="mb-4 mt-8 text-xl font-bold">Resumo financeiro</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Receita por período" value={mt(revenue)} />
        <ReportCard title="Receita por serviço" value={mt(paid.reduce((a,x)=>a+x.appliedAmount,0))} />
        <ReportCard title="Pagamentos confirmados" value={String(paid.length)} />
        <ReportCard title="Reembolsos" value={String(filtered.filter((x)=>x.status==="reembolsado").length)} />
      </div>
    </MobiGestShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) { return <Card className="p-5"><p className="text-xs text-slate-400">{title}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>; }
function ReportCard({ title, value }: { title: string; value: string }) { return <Card className="p-5"><p className="text-sm font-semibold">{title}</p><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-400">Dados demonstrativos</p></Card>; }
