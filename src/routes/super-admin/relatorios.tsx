import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bike,
  Building2,
  Download,
  FileBarChart,
  KeyRound,
  Landmark,
  Printer,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  SuperAdminShell,
  SuperCard,
} from "../../components/SuperAdminShell";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/super-admin/relatorios")({
  component: RelatoriosGlobais,
});

type ReportType =
  | "visao-geral"
  | "veiculos"
  | "registos"
  | "utilizadores"
  | "financeiro"
  | "fiscalizacao"
  | "multas"
  | "licencas";

type ReportRow = {
  municipality_id: string;
  municipality_name: string;
  municipality_code: string;
  municipality_status: string;
  vehicles_total: number;
  owners_total: number;
  users_active: number;
  registrations_period: number;
  fiscalizations_period: number;
  fines_period: number;
  revenue_period: number;
  pending_amount: number;
  license_code: string | null;
  license_plan: string | null;
  license_status: string | null;
  license_ends_at: string | null;
};

const reportOptions: { value: ReportType; label: string }[] = [
  { value: "visao-geral", label: "Visão geral" },
  { value: "veiculos", label: "Veículos" },
  { value: "registos", label: "Registos" },
  { value: "utilizadores", label: "Utilizadores" },
  { value: "financeiro", label: "Financeiro" },
  { value: "fiscalizacao", label: "Fiscalização" },
  { value: "multas", label: "Multas" },
  { value: "licencas", label: "Licenças" },
];

function RelatoriosGlobais() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [municipality, setMunicipality] = useState("");
  const [type, setType] = useState<ReportType>("visao-geral");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (from && to && to < from) {
        setLoadError("A data final não pode ser anterior à data inicial.");
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase.rpc(
        "super_admin_global_report",
        {
          p_from: from || null,
          p_to: to || null,
        },
      );

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar relatório global:", error);
        setLoadError(
          error.message ||
            "Não foi possível carregar o relatório global.",
        );
        setLoading(false);
        return;
      }

      setRows((Array.isArray(data) ? data : []) as ReportRow[]);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [from, to]);

  const municipalityOptions = useMemo(
    () =>
      rows
        .map((item) => ({
          id: item.municipality_id,
          name: item.municipality_name,
          code: item.municipality_code,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [rows],
  );

  const selectedRows = useMemo(
    () =>
      rows.filter(
        (item) =>
          !municipality || item.municipality_id === municipality,
      ),
    [rows, municipality],
  );

  const totals = useMemo(
    () =>
      selectedRows.reduce(
        (acc, item) => ({
          vehicles: acc.vehicles + Number(item.vehicles_total || 0),
          owners: acc.owners + Number(item.owners_total || 0),
          users: acc.users + Number(item.users_active || 0),
          registrations:
            acc.registrations +
            Number(item.registrations_period || 0),
          fiscalizations:
            acc.fiscalizations +
            Number(item.fiscalizations_period || 0),
          fines: acc.fines + Number(item.fines_period || 0),
          revenue: acc.revenue + Number(item.revenue_period || 0),
          pending:
            acc.pending + Number(item.pending_amount || 0),
          activeLicenses:
            acc.activeLicenses +
            (item.license_status === "activa" ? 1 : 0),
        }),
        {
          vehicles: 0,
          owners: 0,
          users: 0,
          registrations: 0,
          fiscalizations: 0,
          fines: 0,
          revenue: 0,
          pending: 0,
          activeLicenses: 0,
        },
      ),
    [selectedRows],
  );

  const clearFilters = () => {
    setMunicipality("");
    setType("visao-geral");
    setFrom("");
    setTo("");
  };

  const exportCsv = () => {
    if (selectedRows.length === 0) return;

    const headers = [
      "Município",
      "Código",
      "Estado municipal",
      "Veículos",
      "Proprietários",
      "Utilizadores activos",
      "Registos no período",
      "Fiscalizações no período",
      "Multas no período",
      "Receita paga no período (MZN)",
      "Valor pendente (MZN)",
      "Licença",
      "Plano",
      "Estado da licença",
      "Fim da licença",
    ];

    const dataRows = selectedRows.map((item) => [
      item.municipality_name,
      item.municipality_code,
      item.municipality_status,
      item.vehicles_total,
      item.owners_total,
      item.users_active,
      item.registrations_period,
      item.fiscalizations_period,
      item.fines_period,
      item.revenue_period,
      item.pending_amount,
      item.license_code ?? "",
      item.license_plan ?? "",
      item.license_status ?? "sem_licenca",
      item.license_ends_at ?? "",
    ]);

    const csv = [headers, ...dataRows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "mobigest-relatorio-global-" +
      new Date().toISOString().slice(0, 10) +
      ".csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <SuperAdminShell
      title="Relatórios globais"
      subtitle="Visão consolidada e real da plataforma MobiGest por município."
    >
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500">
            Administração global
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Relatórios globais
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>

          <button
            type="button"
            disabled={selectedRows.length === 0}
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <SuperCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Filtros</h3>
            <p className="mt-1 text-sm text-slate-500">
              O período é aplicado a registos, fiscalizações, multas
              e pagamentos. Os totais de veículos, proprietários e
              utilizadores representam o estado actual.
            </p>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={municipality}
            onChange={(event) =>
              setMunicipality(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500"
          >
            <option value="">Todos os municípios</option>
            {municipalityOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.code}
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as ReportType)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500"
          >
            {reportOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="Data inicial"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
          />

          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            aria-label="Data final"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
          />
        </div>
      </SuperCard>

      {loadError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
        <strong>Relatório:</strong>{" "}
        {reportOptions.find((option) => option.value === type)
          ?.label ?? "Visão geral"}
        {from || to
          ? " · período " +
            (from || "início") +
            " até " +
            (to || "hoje")
          : " · sem restrição de período"}
        {" · "}
        {selectedRows.length} município(s) incluído(s).
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {type === "financeiro" ? (
          <>
            <Metric
              icon={<Wallet />}
              label="Receita paga"
              value={loading ? "—" : formatMt(totals.revenue)}
            />
            <Metric
              icon={<Wallet />}
              label="Pendente"
              value={loading ? "—" : formatMt(totals.pending)}
            />
            <Metric
              icon={<Building2 />}
              label="Municípios"
              value={loading ? "—" : String(selectedRows.length)}
            />
            <Metric
              icon={<Users />}
              label="Utilizadores activos"
              value={loading ? "—" : formatNumber(totals.users)}
            />
            <Metric
              icon={<KeyRound />}
              label="Licenças activas"
              value={
                loading ? "—" : String(totals.activeLicenses)
              }
            />
          </>
        ) : type === "fiscalizacao" ? (
          <>
            <Metric
              icon={<ShieldCheck />}
              label="Fiscalizações"
              value={
                loading
                  ? "—"
                  : formatNumber(totals.fiscalizations)
              }
            />
            <Metric
              icon={<Activity />}
              label="Multas"
              value={loading ? "—" : formatNumber(totals.fines)}
            />
            <Metric
              icon={<Bike />}
              label="Veículos actuais"
              value={
                loading ? "—" : formatNumber(totals.vehicles)
              }
            />
            <Metric
              icon={<Users />}
              label="Proprietários"
              value={
                loading ? "—" : formatNumber(totals.owners)
              }
            />
            <Metric
              icon={<Building2 />}
              label="Municípios"
              value={loading ? "—" : String(selectedRows.length)}
            />
          </>
        ) : (
          <>
            <Metric
              icon={<Bike />}
              label="Veículos"
              value={
                loading ? "—" : formatNumber(totals.vehicles)
              }
            />
            <Metric
              icon={<Users />}
              label="Proprietários"
              value={
                loading ? "—" : formatNumber(totals.owners)
              }
            />
            <Metric
              icon={<Users />}
              label="Utilizadores activos"
              value={loading ? "—" : formatNumber(totals.users)}
            />
            <Metric
              icon={<FileBarChart />}
              label="Registos no período"
              value={
                loading
                  ? "—"
                  : formatNumber(totals.registrations)
              }
            />
            <Metric
              icon={<Wallet />}
              label="Receita no período"
              value={loading ? "—" : formatMt(totals.revenue)}
            />
          </>
        )}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <SuperCard className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="font-semibold">
              Resumo por município
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Valores agregados directamente da base de dados.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">
                    Município
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Veículos
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Proprietários
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Utilizadores
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Registos
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Fiscalizações
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Multas
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Receita
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Pendente
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Licença
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      A carregar relatório...
                    </td>
                  </tr>
                ) : selectedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      Nenhum município corresponde aos filtros.
                    </td>
                  </tr>
                ) : (
                  selectedRows.map((item) => (
                    <tr
                      key={item.municipality_id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold">
                          {item.municipality_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.municipality_code} ·{" "}
                          {municipalityStatusLabel(
                            item.municipality_status,
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {formatNumber(item.vehicles_total)}
                      </td>
                      <td className="px-4 py-4">
                        {formatNumber(item.owners_total)}
                      </td>
                      <td className="px-4 py-4">
                        {formatNumber(item.users_active)}
                      </td>
                      <td className="px-4 py-4">
                        {formatNumber(
                          item.registrations_period,
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {formatNumber(
                          item.fiscalizations_period,
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {formatNumber(item.fines_period)}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {formatMt(item.revenue_period)}
                      </td>
                      <td className="px-4 py-4">
                        {formatMt(item.pending_amount)}
                      </td>
                      <td className="px-4 py-4">
                        <LicenseBadge
                          status={item.license_status}
                          plan={item.license_plan}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SuperCard>

        <SuperCard className="p-6">
          <h3 className="font-semibold">Áreas disponíveis</h3>
          <p className="mt-1 text-sm text-slate-500">
            A selecção altera os indicadores principais; a tabela
            consolidada mantém o contexto completo.
          </p>

          <div className="mt-5 space-y-3">
            <Area
              icon={<Bike />}
              title="Veículos"
              text="Frota municipal actualmente registada."
            />
            <Area
              icon={<FileBarChart />}
              title="Registos"
              text="Processos criados no período seleccionado."
            />
            <Area
              icon={<Users />}
              title="Utilizadores"
              text="Contas activas por município."
            />
            <Area
              icon={<ShieldCheck />}
              title="Fiscalização"
              text="Fiscalizações e multas no período."
            />
            <Area
              icon={<Wallet />}
              title="Financeiro"
              text="Pagamentos confirmados e pendências."
            />
            <Area
              icon={<KeyRound />}
              title="Licenças"
              text="Plano e estado efectivo da licença."
            />
          </div>
        </SuperCard>
      </section>

      <SuperCard className="mt-6 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Regra de acesso</h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">
              O relatório global só é devolvido a um Super
              Administrador fora de uma sessão de acesso municipal.
              Durante assistência a um município, esta consulta é
              bloqueada no servidor para evitar mistura de contextos.
            </p>
          </div>
        </div>
      </SuperCard>
    </SuperAdminShell>
  );
}

function csvCell(value: unknown) {
  let text =
    value === null || value === undefined
      ? ""
      : String(value);

  if (/^[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  return '"' + text.replace(/"/g, '""') + '"';
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <SuperCard className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        {icon}
      </div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </SuperCard>
  );
}

function Area({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function LicenseBadge({
  status,
  plan,
}: {
  status: string | null;
  plan: string | null;
}) {
  const normalized = status ?? "sem_licenca";
  const className =
    normalized === "activa"
      ? "bg-emerald-50 text-emerald-700"
      : normalized === "suspensa" ||
          normalized === "em_configuracao" ||
          normalized === "aguarda_inicio"
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";

  return (
    <span
      className={
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold " +
        className
      }
    >
      {plan
        ? plan + " · " + licenseStatusLabel(normalized)
        : "Sem licença"}
    </span>
  );
}

function licenseStatusLabel(status: string) {
  const labels: Record<string, string> = {
    activa: "Activa",
    suspensa: "Suspensa",
    em_configuracao: "Em configuração",
    expirada: "Expirada",
    cancelada: "Cancelada",
    aguarda_inicio: "Aguarda início",
    sem_licenca: "Sem licença",
  };

  return labels[status] ?? status;
}

function municipalityStatusLabel(status: string) {
  const labels: Record<string, string> = {
    activo: "Activo",
    configuracao: "Configuração",
    suspenso: "Suspenso",
    inactivo: "Inactivo",
  };

  return labels[status] ?? status;
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
