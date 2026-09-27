import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { CircleDollarSign, ChevronRight } from "lucide-react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
import { DemoNotice, StatusBadge, fmtDate } from "../components/financeiro/ui";
import { municipalityName, useCharges } from "../lib/financeiro/store";
import { methodLabel, mt, serviceLabel } from "../lib/financeiro/types";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — MobiGest" }, { name: "description", content: "Cobranças, pagamentos e taxas municipais." }, { property: "og:title", content: "Financeiro — MobiGest" }, { property: "og:description", content: "Cobranças, pagamentos e taxas municipais." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Layout,
});

function Layout() {
  const m = useMatchRoute();
  return m({ to: "/financeiro", fuzzy: false }) ? <Financeiro /> : <Outlet />;
}

function Financeiro() {
  const charges = useCharges();
  const sum = (f: (s: string) => boolean) => charges.filter((c) => f(c.status)).reduce((a, c) => a + c.appliedAmount, 0);
  return (
    <MobiGestShell title="Financeiro">
      <PageHeader title="Financeiro" description="Cobranças, pagamentos e recibos do município." action="Nova cobrança" actionTo="/financeiro/nova" />
      <DemoNotice />
      <div className="grid gap-4 md:grid-cols-4">
        <K label="Total facturado" v={mt(sum((s) => s !== "cancelado" && s !== "isento"))} />
        <K label="Total pago" v={mt(sum((s) => s === "pago"))} />
        <K label="Total pendente" v={mt(sum((s) => s === "pendente" || s === "em_confirmacao"))} />
        <K label="Cancelado / reembolsado" v={mt(sum((s) => s === "cancelado" || s === "reembolsado"))} />
      </div>
      <Card className="mt-6 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><span className="font-semibold">Operações financeiras recentes</span><Link to="/definicoes/taxas" className="text-xs font-semibold text-sky-600">Taxas municipais</Link></div>
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Referência", "Data", "Município", "Proprietário", "Veículo", "Serviço", "Valor", "Estado", "Método", "Responsável", ""].map((x) => <th key={x} className="px-4 py-3 font-medium">{x}</th>)}</tr></thead>
          <tbody>{charges.map((c) => (
            <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold"><Link to="/financeiro/$id" params={{ id: c.id }}>{c.reference}</Link></td>
              <td className="px-4 py-3 text-slate-500">{fmtDate(c.createdAt)}</td>
              <td className="px-4 py-3">{municipalityName(c.municipalityId)}</td>
              <td className="px-4 py-3">{c.ownerName}</td>
              <td className="px-4 py-3 text-slate-600">{c.vehicle}</td>
              <td className="px-4 py-3">{serviceLabel[c.service]}</td>
              <td className="px-4 py-3 font-semibold">{mt(c.appliedAmount)}</td>
              <td className="px-4 py-3"><StatusBadge s={c.status} /></td>
              <td className="px-4 py-3">{c.payment ? methodLabel[c.payment.method] : "—"}</td>
              <td className="px-4 py-3">{c.payment?.userName ?? c.createdBy}</td>
              <td className="px-4 py-3"><Link to="/financeiro/$id" params={{ id: c.id }}><ChevronRight className="h-4 w-4 text-slate-300" /></Link></td>
            </tr>))}</tbody>
        </table>
      </Card>
    </MobiGestShell>
  );
}
function K({ label, v }: { label: string; v: string }) { return <Card className="p-5"><CircleDollarSign className="h-5 w-5 text-sky-600" /><p className="mt-4 text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{v}</p></Card>; }
