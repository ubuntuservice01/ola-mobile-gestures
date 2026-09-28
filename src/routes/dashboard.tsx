import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bike,
  CarFront,
  ChevronRight,
  CircleCheck,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  QrCode,
  Search,
  ShieldAlert,
  ShoppingCart,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { DashboardFinance } from "../components/financeiro/DashboardFinance";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

const recentRegistrations = [
  { number: "MZ-LIC-004821", owner: "Alberto Manuel", vehicle: "Honda CB 125", type: "Motorizada", date: "26 Set, 2026", status: "Activa" },
  { number: "MZ-LIC-004820", owner: "Maria José", vehicle: "Toyota Corolla", type: "Carro", date: "26 Set, 2026", status: "Activa" },
  { number: "MZ-LIC-004819", owner: "Joaquim Ernesto", vehicle: "Atlas", type: "Bicicleta", date: "25 Set, 2026", status: "À venda" },
  { number: "MZ-LIC-004818", owner: "Salvador João", vehicle: "TVS HLX 125", type: "Motorizada", date: "25 Set, 2026", status: "Pendente" },
  { number: "MZ-LIC-004817", owner: "Ana Cristina", vehicle: "Nissan Note", type: "Carro", date: "24 Set, 2026", status: "Roubada" },
];

const statusData = [
  { label: "Activas", value: 2148, percent: "83,8%", tone: "active", icon: CircleCheck },
  { label: "À venda", value: 156, percent: "6,1%", tone: "sale", icon: ShoppingCart },
  { label: "Roubadas", value: 92, percent: "3,6%", tone: "stolen", icon: ShieldAlert },
  { label: "Apreendidas", value: 61, percent: "2,4%", tone: "seized", icon: AlertTriangle },
  { label: "Pendentes", value: 105, percent: "4,1%", tone: "pending", icon: XCircle },
];

function DashboardPage() {
  const location = useLocation();

  // As rotas /dashboard/bicicletas, /dashboard/carros e /dashboard/motorizadas
  // são filhas desta rota. O Dashboard geral não deve ficar por cima delas.
  if (location.pathname !== "/dashboard") {
    return <Outlet />;
  }

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut({ scope: "local" });
    window.location.replace("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-white shadow-xl transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex h-full flex-col">
            <div className="flex h-20 items-center border-b border-white/10 px-6">
              <img src="/mobigest-logo.svg" alt="MobiGest" className="h-11 w-auto brightness-0 invert" />
            </div>

            <div className="px-4 py-6">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Principal</p>
              <nav className="mt-3 space-y-1">
                <NavItem to="/dashboard" icon={<LayoutDashboard />} label="Dashboard" active />
                <NavItem to="/veiculos" icon={<Bike />} label="Veículos" />
                <NavItem to="/proprietarios" icon={<Users />} label="Proprietários" />
                <NavItem to="/consulta" icon={<QrCode />} label="Consulta pública" />
              </nav>

              <p className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Gestão</p>
              <nav className="mt-3 space-y-1">
                <NavItem to="/registos" icon={<FilePlus2 />} label="Registos" />
                <NavItem to="/fiscalizacao" icon={<ShieldAlert />} label="Fiscalização" />
                <NavItem to="/financeiro" icon={<ShoppingCart />} label="Financeiro" />
                <NavItem to="/relatorios" icon={<Search />} label="Relatórios" />
              </nav>

              <p className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Administração</p>
              <nav className="mt-3 space-y-1">
                <NavItem to="/utilizadores" icon={<UserRound />} label="Utilizadores" />
                <NavItem to="/municipios" icon={<Users />} label="Municípios" />
              </nav>
            </div>

            <div className="mt-auto border-t border-white/10 p-4">
              <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-sm font-bold">AD</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">Administrador</p>
                  <p className="truncate text-xs text-slate-500">Gestor municipal</p>
                </div>
                <button type="button" onClick={handleSignOut} disabled={signingOut} className="text-slate-500 hover:text-white disabled:opacity-50" aria-label="Sair">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <button type="button" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm md:px-8">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">MobiGest</p>
                <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-xl border border-slate-200 bg-slate-50 px-3 md:flex">
                <Search className="h-4 w-4 text-slate-400" />
                <input aria-label="Pesquisar" placeholder="Pesquisar registo..." className="h-10 w-52 bg-transparent px-2 text-sm outline-none placeholder:text-slate-400" />
              </div>
              <div className="hidden h-9 w-px bg-slate-200 sm:block" />
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">AD</div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-slate-800">Administrador</p>
                  <p className="text-[11px] text-slate-400">Área municipal</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-5 md:p-8">
            <div className="mx-auto max-w-[1500px]">
              <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm text-slate-500">Visão geral da gestão de mobilidade</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Resumo do município</h2>
                </div>
                <Link to="/veiculos/novo" className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700">
                  <FilePlus2 className="h-4 w-4" />
                  Registar veículo
                </Link>
              </div>

              <DashboardFinance />


              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Link to="/dashboard/motorizadas" className="block transition hover:-translate-y-0.5">
                  <KpiCard icon={<Bike />} label="Motorizadas" value="1 284" change="+8,4%" detail="vs. mês anterior" />
                </Link>
                <Link to="/dashboard/carros" className="block transition hover:-translate-y-0.5">
                  <KpiCard icon={<CarFront />} label="Carros" value="486" change="+4,7%" detail="vs. mês anterior" />
                </Link>
                <Link to="/dashboard/bicicletas" className="block transition hover:-translate-y-0.5">
                  <KpiCard icon={<Bike />} label="Bicicletas" value="792" change="+12,1%" detail="vs. mês anterior" />
                </Link>
                <KpiCard icon={<CircleCheck />} label="Total registado" value="2 562" change="+9,6%" detail="todos os tipos" />
              </section>

              <section className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">Registos por mês</h3>
                      <p className="mt-1 text-sm text-slate-500">Evolução dos últimos 7 meses</p>
                    </div>
                    <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50" aria-label="Mais opções"><MoreHorizontal className="h-5 w-5" /></button>
                  </div>
                  <div className="mt-8 flex h-64 items-end gap-3 border-b border-slate-100 sm:gap-6">
                    {[42, 54, 48, 64, 58, 78, 94].map((height, index) => (
                      <div key={index} className="flex h-full flex-1 flex-col justify-end">
                        <div className="mb-2 text-center text-[10px] font-semibold text-slate-400">{index === 6 ? "328" : ""}</div>
                        <div className={`mx-auto w-full max-w-12 rounded-t-lg transition ${index === 6 ? "bg-sky-600" : "bg-sky-100"}`} style={{ height: `${height}%` }} />
                        <span className="mt-3 text-center text-[11px] text-slate-400">{["Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set"][index]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">Distribuição por tipo</h3>
                      <p className="mt-1 text-sm text-slate-500">Veículos registados</p>
                    </div>
                    <span className="text-sm font-bold text-slate-700">2 562</span>
                  </div>
                  <div className="mt-7 flex justify-center">
                    <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-[conic-gradient(#0284c7_0deg_181deg,#38bdf8_181deg_292deg,#cbd5e1_292deg_360deg)]">
                      <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
                        <span className="text-2xl font-bold text-slate-900">2 562</span>
                        <span className="text-xs text-slate-400">veículos</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 space-y-2.5">
                    <Legend label="Motorizadas" value="50,1%" dot="bg-sky-600" />
                    <Legend label="Bicicletas" value="30,9%" dot="bg-sky-400" />
                    <Legend label="Carros" value="19,0%" dot="bg-slate-300" />
                  </div>
                </div>
              </section>

              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Estado dos veículos</h3>
                    <p className="mt-1 text-sm text-slate-500">A situação actual dos veículos registados</p>
                  </div>
                  <Link to="/veiculos" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700">
                    Ver veículos <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {statusData.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm">
                        <div className="flex items-start justify-between">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneBg(item.tone)}`}>
                            <Icon className={`h-4 w-4 ${toneText(item.tone)}`} />
                          </span>
                          <span className="text-xs font-semibold text-slate-400">{item.percent}</span>
                        </div>
                        <p className="mt-4 text-xs font-medium text-slate-500">{item.label}</p>
                        <p className="mt-1 text-xl font-bold text-slate-900">{item.value.toLocaleString("pt-PT")}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                      <h3 className="font-semibold text-slate-900">Registos recentes</h3>
                      <p className="mt-1 text-sm text-slate-500">Últimos movimentos no sistema</p>
                    </div>
                    <Link to="/registos" className="text-sm font-semibold text-sky-600 hover:text-sky-700">Ver todos</Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                      <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-6 py-3">Número</th>
                          <th className="px-4 py-3">Proprietário</th>
                          <th className="px-4 py-3">Veículo</th>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentRegistrations.map((item) => (
                          <tr key={item.number} className="hover:bg-slate-50/70">
                            <td className="px-6 py-4 text-sm font-semibold text-slate-700">{item.number}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{item.owner}</td>
                            <td className="px-4 py-4"><p className="text-sm font-medium text-slate-700">{item.vehicle}</p><p className="text-xs text-slate-400">{item.type}</p></td>
                            <td className="px-4 py-4 text-xs text-slate-500">{item.date}</td>
                            <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                            <td className="px-4 py-4"><button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><MoreHorizontal className="h-4 w-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="font-semibold text-slate-900">Acesso rápido</h3>
                  <p className="mt-1 text-sm text-slate-500">Acções frequentes</p>
                  <div className="mt-5 grid gap-3">
                    <QuickAction to="/veiculos/novo" icon={<FilePlus2 />} title="Registar veículo" text="Adicionar novo registo" />
                    <QuickAction to="/proprietarios/novo" icon={<UserRound />} title="Novo proprietário" text="Criar ficha do proprietário" />
                    <QuickAction to="/consulta" icon={<QrCode />} title="Consulta pública" text="Pesquisar por QR ou número" />
                    <QuickAction to="/fiscalizacao" icon={<ShieldAlert />} title="Fiscalização" text="Verificar estado do veículo" />
                  </div>
                </div>
              </section>

              <footer className="mt-8 border-t border-slate-200 py-6 text-xs text-slate-400">
                MobiGest · Área administrativa · Dados de demonstração
              </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, active = false }: { to: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link to={to} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-sky-600 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
      {icon}<span>{label}</span>
    </Link>
  );
}

function KpiCard({ icon, label, value, change, detail }: { icon: React.ReactNode; label: string; value: string; change: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">{icon}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><ArrowUpRight className="h-3.5 w-3.5" />{change}</span>
      </div>
      <p className="mt-5 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function Legend({ label, value, dot }: { label: string; value: string; dot: string }) {
  return <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{label}</span><span className="font-semibold text-slate-700">{value}</span></div>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Activa: "bg-emerald-50 text-emerald-700",
    "À venda": "bg-sky-50 text-sky-700",
    Roubada: "bg-rose-50 text-rose-700",
    Apreendida: "bg-orange-50 text-orange-700",
    Pendente: "bg-amber-50 text-amber-700",
    Transferida: "bg-violet-50 text-violet-700",
    Cancelada: "bg-slate-100 text-slate-600",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

function toneBg(tone: string) {
  const values: Record<string, string> = {
    active: "bg-emerald-50",
    sale: "bg-sky-50",
    stolen: "bg-rose-50",
    seized: "bg-orange-50",
    pending: "bg-amber-50",
  };
  return values[tone] ?? "bg-slate-50";
}

function toneText(tone: string) {
  const values: Record<string, string> = {
    active: "text-emerald-600",
    sale: "text-sky-600",
    stolen: "text-rose-600",
    seized: "text-orange-600",
    pending: "text-amber-600",
  };
  return values[tone] ?? "text-slate-600";
}

function QuickAction({ to, icon, title, text }: { to: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-sky-200 hover:bg-sky-50/50">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</span>
      <span><span className="block text-sm font-semibold text-slate-700">{title}</span><span className="mt-0.5 block text-xs text-slate-400">{text}</span></span>
    </Link>
  );
}
