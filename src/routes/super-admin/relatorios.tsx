
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bike,
  Building2,
  Download,
  FileBarChart,
  Landmark,
  Printer,
  ShieldCheck,
  Users,
  Wallet,
  KeyRound,
} from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";

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
  | "licencas"
  | "auditoria";

const municipalities = [
  { name: "Município de Lichinga", code: "LIC", vehicles: 2562, owners: 1984, users: 18, registrations: 328, revenue: 184500 },
  { name: "Município de Pemba", code: "PEM", vehicles: 1184, owners: 932, users: 11, registrations: 146, revenue: 92300 },
];

const reportOptions: { value: ReportType; label: string }[] = [
  { value: "visao-geral", label: "Visão geral" },
  { value: "veiculos", label: "Veículos" },
  { value: "registos", label: "Registos" },
  { value: "utilizadores", label: "Utilizadores" },
  { value: "financeiro", label: "Financeiro" },
  { value: "fiscalizacao", label: "Fiscalização" },
  { value: "licencas", label: "Licenças" },
  { value: "auditoria", label: "Auditoria" },
];

function RelatoriosGlobais() {
  const [municipality, setMunicipality] = useState("");
  const [type, setType] = useState<ReportType>("visao-geral");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const selectedMunicipalities = useMemo(
    () => municipalities.filter((item) => !municipality || item.code === municipality),
    [municipality],
  );

  const totals = useMemo(
    () =>
      selectedMunicipalities.reduce(
        (acc, item) => ({
          vehicles: acc.vehicles + item.vehicles,
          owners: acc.owners + item.owners,
          users: acc.users + item.users,
          registrations: acc.registrations + item.registrations,
          revenue: acc.revenue + item.revenue,
        }),
        { vehicles: 0, owners: 0, users: 0, registrations: 0, revenue: 0 },
      ),
    [selectedMunicipalities],
  );

  const exportCsv = () => {
    const rows = [
      ["Município", "Código", "Veículos", "Proprietários", "Utilizadores", "Registos", "Receita demonstrativa (MT)"],
      ...selectedMunicipalities.map((item) => [
        item.name,
        item.code,
        item.vehicles,
        item.owners,
        item.users,
        item.registrations,
        item.revenue,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => '"' + String(value).replaceAll('"', '""') + '"').join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mobigest-relatorio-global.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SuperAdminShell
      title="Relatórios globais"
      subtitle="Visão consolidada de toda a plataforma MobiGest, com análise por município."
    >
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500">Administração global</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Relatórios globais</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        </div>
      </div>

      <SuperCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Filtros</h3>
            <p className="mt-1 text-sm text-slate-500">Os filtros serão ligados aos dados reais quando o Supabase estiver integrado.</p>
          </div>
          <button
            type="button"
            onClick={() => { setMunicipality(""); setType("visao-geral"); setFrom(""); setTo(""); }}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={municipality} onChange={(event) => setMunicipality(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500">
            <option value="">Todos os municípios</option>
            {municipalities.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>

          <select value={type} onChange={(event) => setType(event.target.value as ReportType)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500">
            {reportOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>

          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="Data inicial" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500" />
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="Data final" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500" />
        </div>
      </SuperCard>

      <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
        <strong>Relatório:</strong> {reportOptions.find((option) => option.value === type)?.label}
        {from || to ? " · período " + (from || "início") + " até " + (to || "fim") : " · período não definido"}
        {" · " + selectedMunicipalities.length + " município(s) incluído(s)."}
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<Building2 />} label="Municípios" value={String(selectedMunicipalities.length)} />
        <Metric icon={<Bike />} label="Veículos" value={formatNumber(totals.vehicles)} />
        <Metric icon={<Users />} label="Proprietários" value={formatNumber(totals.owners)} />
        <Metric icon={<FileBarChart />} label="Registos" value={formatNumber(totals.registrations)} />
        <Metric icon={<Wallet />} label="Receita demonstrativa" value={formatMt(totals.revenue)} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <SuperCard className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="font-semibold">Resumo por município</h3>
            <p className="mt-1 text-sm text-slate-500">Comparação operacional para leitura global. Os valores abaixo são demonstrativos.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Município</th>
                  <th className="px-4 py-3 font-semibold">Veículos</th>
                  <th className="px-4 py-3 font-semibold">Proprietários</th>
                  <th className="px-4 py-3 font-semibold">Utilizadores</th>
                  <th className="px-4 py-3 font-semibold">Registos</th>
                  <th className="px-4 py-3 font-semibold">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedMunicipalities.map((item) => (
                  <tr key={item.code} className="hover:bg-slate-50">
                    <td className="px-6 py-4"><p className="font-semibold">{item.name}</p><p className="mt-1 text-xs text-slate-400">{item.code}</p></td>
                    <td className="px-4 py-4">{formatNumber(item.vehicles)}</td>
                    <td className="px-4 py-4">{formatNumber(item.owners)}</td>
                    <td className="px-4 py-4">{formatNumber(item.users)}</td>
                    <td className="px-4 py-4">{formatNumber(item.registrations)}</td>
                    <td className="px-4 py-4 font-semibold">{formatMt(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SuperCard>

        <SuperCard className="p-6">
          <h3 className="font-semibold">Áreas disponíveis</h3>
          <p className="mt-1 text-sm text-slate-500">Relatórios preparados para receber dados reais.</p>
          <div className="mt-5 space-y-3">
            <Area icon={<Bike />} title="Veículos" text="Tipos, estados e distribuição territorial." />
            <Area icon={<FileBarChart />} title="Registos" text="Novos registos, validações e evolução." />
            <Area icon={<Users />} title="Utilizadores" text="Contas, perfis e actividade." />
            <Area icon={<ShieldCheck />} title="Fiscalização" text="Fiscalizações e ocorrências." />
            <Area icon={<Wallet />} title="Financeiro" text="Cobranças, pagamentos e receitas." />
            <Area icon={<KeyRound />} title="Licenças" text="Planos, validade e utilização." />
            <Area icon={<Activity />} title="Auditoria" text="Eventos e alterações críticas." />
          </div>
        </SuperCard>
      </section>

      <SuperCard className="mt-6 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Landmark className="h-5 w-5" /></div>
          <div>
            <h3 className="font-semibold">Regra de acesso</h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">
              O Super Administrador poderá consultar dados consolidados de toda a plataforma. Os relatórios municipais continuarão limitados ao respectivo âmbito. Quando o Supabase estiver ligado, esta separação será reforçada por autorização e RLS.
            </p>
          </div>
        </div>
      </SuperCard>
    </SuperAdminShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <SuperCard className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">{icon}</div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">Dados demonstrativos</p>
    </SuperCard>
  );
}

function Area({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</div>
      <div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-slate-500">{text}</p></div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-PT").format(value);
}

function formatMt(value: number) {
  return new Intl.NumberFormat("pt-PT").format(value) + " MT";
}
