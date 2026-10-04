import { createFileRoute } from "@tanstack/react-router";
import {
  Bike,
  CarFront,
  Download,
  FileBarChart,
  Printer,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  MobiGestShell,
  PageHeader,
  Card,
} from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — MobiGest" },
      {
        name: "description",
        content: "Relatórios reais de gestão municipal do MobiGest.",
      },
    ],
  }),
  component: Relatorios,
});

type ReportRow = {
  municipality_id: string;
  municipality_name: string;
  municipality_code: string;
  vehicles_total: number;
  motorcycles_total: number;
  cars_total: number;
  bicycles_total: number;
  active_vehicles: number;
  suspended_vehicles: number;
  stolen_vehicles: number;
  seized_vehicles: number;
  owners_total: number;
  registrations_period: number;
  transfers_period: number;
  fiscalizations_period: number;
  irregular_fiscalizations_period: number;
  fines_period: number;
  revenue_period: number;
  pending_amount: number;
  payments_period: number;
  refunds_period: number;
  exemptions_period: number;
};

function Relatorios() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [row, setRow] = useState<ReportRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (from && to && to < from) {
        setRow(null);
        setLoadError(
          "A data final não pode ser anterior à data inicial.",
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase.rpc(
        "municipal_operational_report",
        {
          p_from: from || null,
          p_to: to || null,
        },
      );

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar relatório municipal:", error);
        setLoadError(
          error.message ||
            "Não foi possível carregar o relatório municipal.",
        );
        setRow(null);
        setLoading(false);
        return;
      }

      const report = Array.isArray(data) ? data[0] : data;
      setRow((report as ReportRow | undefined) ?? null);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [from, to]);

  const exportCsv = () => {
    if (!row) return;

    const rows = [
      ["Indicador", "Valor"],
      ["Município", row.municipality_name],
      ["Código", row.municipality_code],
      ["Veículos", row.vehicles_total],
      ["Motorizadas", row.motorcycles_total],
      ["Carros", row.cars_total],
      ["Bicicletas", row.bicycles_total],
      ["Veículos activos", row.active_vehicles],
      ["Veículos suspensos", row.suspended_vehicles],
      ["Veículos roubados", row.stolen_vehicles],
      ["Veículos apreendidos", row.seized_vehicles],
      ["Proprietários", row.owners_total],
      ["Registos no período", row.registrations_period],
      ["Transferências no período", row.transfers_period],
      ["Fiscalizações no período", row.fiscalizations_period],
      [
        "Fiscalizações com ocorrência",
        row.irregular_fiscalizations_period,
      ],
      ["Multas no período", row.fines_period],
      ["Receita paga no período (MZN)", row.revenue_period],
      ["Valor pendente no período (MZN)", row.pending_amount],
      ["Pagamentos confirmados", row.payments_period],
      ["Reembolsos", row.refunds_period],
      ["Isenções", row.exemptions_period],
      ["Data inicial", from || ""],
      ["Data final", to || ""],
    ];

    const csv = rows
      .map((values) => values.map(csvCell).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "mobigest-relatorio-municipal-" +
      new Date().toISOString().slice(0, 10) +
      ".csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <MobiGestShell
      title="Relatórios"
      subtitle="Indicadores reais de gestão municipal e financeira."
    >
      <PageHeader
        title="Relatórios"
        description="Consulte indicadores do município, seleccione o período e exporte os resultados."
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Período do relatório</h2>
            <p className="mt-1 text-xs text-slate-500">
              O período afecta registos, transferências,
              fiscalizações, multas, pagamentos, pendências,
              isenções e reembolsos. A frota e os proprietários
              representam o estado actual.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button
              type="button"
              disabled={!row}
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="Data inicial"
            className={inputClass}
          />
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            aria-label="Data final"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            Limpar período
          </button>
        </div>
      </Card>

      {loadError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      {loading ? (
        <Card className="mt-6 p-10 text-center text-sm text-slate-500">
          A carregar relatório...
        </Card>
      ) : !row ? (
        <Card className="mt-6 p-10 text-center text-sm text-slate-500">
          Nenhum relatório disponível para o contexto actual.
        </Card>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
            <b>{row.municipality_name}</b> · {row.municipality_code}
            {from || to
              ? " · período " +
                (from || "início") +
                " até " +
                (to || "hoje")
              : " · sem restrição de período"}
          </div>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={<Bike />}
              title="Veículos"
              value={formatNumber(row.vehicles_total)}
            />
            <Metric
              icon={<Users />}
              title="Proprietários"
              value={formatNumber(row.owners_total)}
            />
            <Metric
              icon={<FileBarChart />}
              title="Registos no período"
              value={formatNumber(row.registrations_period)}
            />
            <Metric
              icon={<Wallet />}
              title="Receita confirmada"
              value={formatMt(row.revenue_period)}
            />
          </section>

          <h2 className="mb-4 mt-8 text-xl font-bold">
            Frota actual
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ReportCard
              icon={<Bike />}
              title="Motorizadas"
              value={formatNumber(row.motorcycles_total)}
            />
            <ReportCard
              icon={<CarFront />}
              title="Carros"
              value={formatNumber(row.cars_total)}
            />
            <ReportCard
              icon={<Bike />}
              title="Bicicletas"
              value={formatNumber(row.bicycles_total)}
            />
            <ReportCard
              icon={<ShieldAlert />}
              title="Activos"
              value={formatNumber(row.active_vehicles)}
            />
            <ReportCard
              icon={<ShieldAlert />}
              title="Suspensos"
              value={formatNumber(row.suspended_vehicles)}
            />
            <ReportCard
              icon={<ShieldAlert />}
              title="Roubados"
              value={formatNumber(row.stolen_vehicles)}
            />
            <ReportCard
              icon={<ShieldAlert />}
              title="Apreendidos"
              value={formatNumber(row.seized_vehicles)}
            />
          </div>

          <h2 className="mb-4 mt-8 text-xl font-bold">
            Operação no período
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ReportCard
              icon={<FileBarChart />}
              title="Transferências"
              value={formatNumber(row.transfers_period)}
            />
            <ReportCard
              icon={<ShieldAlert />}
              title="Fiscalizações"
              value={formatNumber(row.fiscalizations_period)}
            />
            <ReportCard
              icon={<ShieldAlert />}
              title="Com ocorrência"
              value={formatNumber(
                row.irregular_fiscalizations_period,
              )}
            />
            <ReportCard
              icon={<FileBarChart />}
              title="Multas"
              value={formatNumber(row.fines_period)}
            />
          </div>

          <h2 className="mb-4 mt-8 text-xl font-bold">
            Financeiro no período
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ReportCard
              icon={<Wallet />}
              title="Receita paga"
              value={formatMt(row.revenue_period)}
            />
            <ReportCard
              icon={<Wallet />}
              title="Valor pendente"
              value={formatMt(row.pending_amount)}
            />
            <ReportCard
              icon={<Wallet />}
              title="Pagamentos confirmados"
              value={formatNumber(row.payments_period)}
            />
            <ReportCard
              icon={<Wallet />}
              title="Isenções"
              value={formatNumber(row.exemptions_period)}
            />
            <ReportCard
              icon={<Wallet />}
              title="Reembolsos"
              value={formatNumber(row.refunds_period)}
            />
          </div>
        </>
      )}
    </MobiGestShell>
  );
}

const inputClass =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-500";

function csvCell(value: unknown) {
  let text =
    value === null || value === undefined ? "" : String(value);

  if (/^[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  return '"' + text.replace(/"/g, '""') + '"';
}

function Metric({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        {icon}
      </div>
      <p className="mt-3 text-xs text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function ReportCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-sky-600">{icon}</div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-MZ").format(
    Number(value || 0),
  );
}

function formatMt(value: number) {
  return new Intl.NumberFormat("pt-MZ", {
    style: "currency",
    currency: "MZN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
