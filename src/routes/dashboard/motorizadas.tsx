import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bike,
  ChevronRight,
  CircleCheck,
  FilePlus2,
  MoreHorizontal,
  QrCode,
  Search,
  ShieldAlert,
  ShoppingCart,
  UserRound,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/motorizadas")({
  component: MotorizadasDashboard,
});

const statusCards = [
  { label: "Activas", value: "1 012", percent: "78,8%", tone: "emerald", icon: CircleCheck },
  { label: "À venda", value: "86", percent: "6,7%", tone: "sky", icon: ShoppingCart },
  { label: "Roubadas", value: "54", percent: "4,2%", tone: "rose", icon: ShieldAlert },
  { label: "Apreendidas", value: "38", percent: "3,0%", tone: "orange", icon: AlertTriangle },
  { label: "Pendentes", value: "94", percent: "7,3%", tone: "amber", icon: XCircle },
];

const recent = [
  { number: "MZ-LIC-004821", owner: "Alberto Manuel", vehicle: "Honda CB 125", date: "26 Set, 2026", status: "Activa" },
  { number: "MZ-LIC-004818", owner: "Salvador João", vehicle: "TVS HLX 125", date: "25 Set, 2026", status: "Pendente" },
  { number: "MZ-LIC-004816", owner: "Paulo Ernesto", vehicle: "Honda ACE 125", date: "24 Set, 2026", status: "À venda" },
  { number: "MZ-LIC-004809", owner: "João Alberto", vehicle: "TVS Star 125", date: "23 Set, 2026", status: "Roubada" },
  { number: "MZ-LIC-004801", owner: "Maria José", vehicle: "Honda Wave", date: "22 Set, 2026", status: "Activa" },
];

function MotorizadasDashboard() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm md:px-8">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50" aria-label="Voltar ao dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Bike className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">MobiGest</p>
              <h1 className="text-lg font-bold text-slate-900">Dashboard de Motorizadas</h1>
            </div>
          </div>
        </div>
        <Link to="/veiculos/novo/motorizada" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
          <FilePlus2 className="h-4 w-4" />
          Registar motorizada
        </Link>
      </header>

      <main className="p-5 md:p-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-7">
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700">
              <ArrowLeft className="h-4 w-4" /> Dashboard geral
            </Link>
            <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm text-slate-500">Visão exclusiva das motorizadas</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Motorizadas</h2>
              </div>
              <Link to="/veiculos" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Ver todos os registos <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Total de motorizadas" value="1 284" detail="registadas no município" icon={<Bike />} />
            <Metric label="Registos este mês" value="164" detail="+12,4% vs. mês anterior" icon={<FilePlus2 />} />
            <Metric label="À venda" value="86" detail="6,7% do total" icon={<ShoppingCart />} />
            <Metric label="Roubadas" value="54" detail="a requerer atenção" icon={<ShieldAlert />} />
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">Estado das motorizadas</h3>
                <p className="mt-1 text-sm text-slate-500">Distribuição por situação actual</p>
              </div>
              <Link to="/veiculos" className="text-sm font-semibold text-sky-600">Abrir lista</Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {statusCards.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.label} to="/dashboard/$tipo/$status" params={{ tipo: "motorizadas", status: statusSlug(item.label) }} className="block rounded-xl border border-slate-200 p-4 hover:border-sky-200 hover:bg-sky-50/30 hover:shadow-sm">
                    <div className="flex items-start justify-between">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-${item.tone}-50 text-${item.tone}-600`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-semibold text-slate-400">{item.percent}</span>
                    </div>
                    <p className="mt-4 text-xs font-medium text-slate-500">{item.label}</p>
                    <p className="mt-1 text-xl font-bold">{item.value}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">Registos de motorizadas</h3>
                  <p className="mt-1 text-sm text-slate-500">Evolução dos últimos 7 meses</p>
                </div>
                <MoreHorizontal className="h-5 w-5 text-slate-400" />
              </div>
              <div className="mt-8 flex h-64 items-end gap-3 border-b border-slate-100 sm:gap-6">
                {[48, 55, 46, 67, 60, 76, 92].map((height, index) => (
                  <div key={index} className="flex h-full flex-1 flex-col justify-end">
                    <div className={`mx-auto w-full max-w-12 rounded-t-lg ${index === 6 ? "bg-sky-600" : "bg-sky-100"}`} style={{ height: `${height}%` }} />
                    <span className="mt-3 text-center text-[11px] text-slate-400">{["Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set"][index]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold">Acções rápidas</h3>
              <p className="mt-1 text-sm text-slate-500">Operações frequentes</p>
              <div className="mt-5 grid gap-3">
                <Action to="/veiculos/novo/motorizada" icon={<FilePlus2 />} title="Registar motorizada" text="Novo registo" />
                <Action to="/consulta" icon={<QrCode />} title="Consultar QR Code" text="Verificar uma motorizada" />
                <Action to="/proprietarios/novo" icon={<UserRound />} title="Novo proprietário" text="Criar ficha" />
                <Action to="/fiscalizacao" icon={<ShieldAlert />} title="Fiscalização" text="Verificar estado" />
              </div>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="font-semibold">Últimas motorizadas</h3>
                <p className="mt-1 text-sm text-slate-500">Registos mais recentes e respectivo estado</p>
              </div>
              <div className="hidden items-center rounded-xl border border-slate-200 bg-slate-50 px-3 sm:flex">
                <Search className="h-4 w-4 text-slate-400" />
                <input placeholder="Pesquisar..." className="h-9 w-40 bg-transparent px-2 text-sm outline-none" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3">Número MobiGest</th>
                    <th className="px-4 py-3">Proprietário</th>
                    <th className="px-4 py-3">Motorizada</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.map((item) => (
                    <tr key={item.number} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{item.number}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{item.owner}</td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-700">{item.vehicle}</td>
                      <td className="px-4 py-4 text-xs text-slate-500">{item.date}</td>
                      <td className="px-4 py-4"><Status status={item.status} /></td>
                      <td className="px-4 py-4"><Link to="/veiculos/$id" params={{ id: item.number }} className="text-sky-600"><ChevronRight className="h-4 w-4" /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="mt-8 border-t border-slate-200 py-6 text-xs text-slate-400">MobiGest · Dashboard de Motorizadas · Dados de demonstração</footer>
        </div>
      </main>
    </div>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">{icon}</span><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>;
}

function Action({ to, icon, title, text }: { to: string; icon: React.ReactNode; title: string; text: string }) {
  return <Link to={to} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-sky-200 hover:bg-sky-50/50"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</span><span><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs text-slate-400">{text}</span></span></Link>;
}

function Status({ status }: { status: string }) {
  const styles: Record<string, string> = { Activa: "bg-emerald-50 text-emerald-700", "À venda": "bg-sky-50 text-sky-700", Roubada: "bg-rose-50 text-rose-700", Pendente: "bg-amber-50 text-amber-700" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

function statusSlug(status: string) {
  const map: Record<string, string> = { Activas: "activas", "À venda": "a-venda", Roubadas: "roubadas", Apreendidas: "apreendidas", Pendentes: "pendentes", Transferidas: "transferidas", Canceladas: "canceladas" };
  return map[status] ?? status.toLowerCase().replace(/\\s+/g, "-");
}
