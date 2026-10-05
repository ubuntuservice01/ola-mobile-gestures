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
import { ReactNode, useEffect, useState } from "react";
import {
  MobiGestShell,
  PageHeader,
  Card,
} from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";
import {
  AnimatedNumber,
  EmptyState,
  NetworkErrorState,
  SkeletonCard,
  notify,
} from "../components/mobigest/Experience";
import {
  formatMoneyMt,
  formatNumber as formatNumberPt,
} from "../lib/format";

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
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [from, to, reloadKey]);

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
    notify.success("Relatório exportado", "O ficheiro CSV foi preparado com sucesso.");
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
        <div className="mt-4">
          <NetworkErrorState
            message={loadError}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        </div>
      )}

      {loading ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </section>
      ) : !row ? (
        <Card className="mt-6">
          <EmptyState
            title="Ainda não existem dados suficientes para este relatório"
            description="Quando existirem operações no período seleccionado, os indicadores serão apresentados aqui."
          />
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
              value={row.vehicles_total}
            />
            <Metric
              icon={<Users />}
              title="Proprietários"
              value={row.owners_total}
            />
            <Metric
              icon={<FileBarChart />}
              title="Registos no período"
              value={row.registrations_period}
            />
            <Metric
              icon={<Wallet />}
              title="Receita confirmada"
              value={row.revenue_period}
              money
            />
          </section>

          <h2 className="mb-4 mt-8 text-xl font-bold">
            Frota actual
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ReportCard
              icon={<Bike />}
              title="Motorizadas"
              value={row.motorcycles_total}
            />
            <ReportCard
              icon={<CarFront />}
              title="Carros"
              value={row.cars_total}
            />
            <ReportCard
              icon={<Bike />}
              title="Bicicletas"
              value={row.bicycles_total}
            />
            <ReportCard
              icon={<ShieldAlert />}
              title="Activos"
              value={row.active_vehicles}
            />
            <ReportCard
              icon={<ShieldAlert />}
              title="Suspensos"
              value={row.suspended_vehicles}
            />
            <ReportCard
              icon={<ShieldAlert />}
              title="Roubados"
              value={row.stolen_vehicles}
            />
            <ReportCard
              icon={<ShieldAlert />}
              title="Apreendidos"
              value={row.seized_vehicles}
            />
          </div>

          <h2 className="mb-4 mt-8 text-xl font-bold">
            Operação no período
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ReportCard
              icon={<FileBarChart />}
              title="Transferências"
              value={row.transfers_period}
            />
            <ReportCard
              icon={<ShieldAlert />}
              title="Fiscalizações"
              value={row.fiscalizations_period}
            />
            <ReportCard
              icon={<ShieldAlert />}
              title="Com ocorrência"
              value={row.irregular_fiscalizations_period}
            />
            <ReportCard
              icon={<FileBarChart />}
              title="Multas"
              value={row.fines_period}
            />
          </div>

          <h2 className="mb-4 mt-8 text-xl font-bold">
            Financeiro no período
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ReportCard
              icon={<Wallet />}
              title="Receita paga"
              value={row.revenue_period}
              money
            />
            <ReportCard
              icon={<Wallet />}
              title="Valor pendente"
              value={row.pending_amount}
              money
            />
            <ReportCard
              icon={<Wallet />}
              title="Pagamentos confirmados"
              value={row.payments_period}
            />
            <ReportCard
              icon={<Wallet />}
              title="Isenções"
              value={row.exemptions_period}
            />
            <ReportCard
              icon={<Wallet />}
              title="Reembolsos"
              value={row.refunds_period}
            />
          </div>
        </>
      )}
    </MobiGestShell>
  );
}

const inputClass =
  "mobigest-input h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10";

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
  money = false,
}: {
  icon: ReactNode;
  title: string;
  value: number;
  money?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        {icon}
      </div>
      <p className="mt-3 text-xs text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-bold">
        <AnimatedNumber
          value={value}
          formatter={money ? formatMoneyMt : formatNumberPt}
        />
      </p>
    </Card>
  );
}

function ReportCard({
  icon,
  title,
  value,
  money = false,
}: {
  icon: ReactNode;
  title: string;
  value: number;
  money?: boolean;
}) {
  return (
    <Card className="mobigest-card-interactive p-5">
      <div className="text-sky-600">{icon}</div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-2 text-2xl font-bold">
        <AnimatedNumber
          value={value}
          formatter={money ? formatMoneyMt : formatNumberPt}
        />
      </p>
    </Card>
  );
}
