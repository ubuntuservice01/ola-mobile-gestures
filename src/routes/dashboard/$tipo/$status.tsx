import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Bike, CarFront, ChevronRight, MapPin, Search } from "lucide-react";

export const Route = createFileRoute("/dashboard/$tipo/$status")({
  component: StatusDetailPage,
});

const config = {
  motorizadas: { label: "Motorizadas", singular: "motorizada", icon: Bike, color: "sky", back: "/dashboard/motorizadas", total: 54 },
  carros: { label: "Carros", singular: "carro", icon: CarFront, color: "indigo", back: "/dashboard/carros", total: 17 },
  bicicletas: { label: "Bicicletas", singular: "bicicleta", icon: Bike, color: "emerald", back: "/dashboard/bicicletas", total: 21 },
} as const;

const statusNames: Record<string, string> = {
  activas: "Activas",
  "a-venda": "À venda",
  roubadas: "Roubadas",
  apreendidas: "Apreendidas",
  pendentes: "Pendentes",
  transferidas: "Transferidas",
  canceladas: "Canceladas",
};

const posts = ["Chiuaula", "Massenger", "San Maria", "Lulimile", "Meponda", "Chimbunila"];

function StatusDetailPage() {
  const { tipo, status } = Route.useParams();
  const current = config[tipo as keyof typeof config] ?? config.motorizadas;
  const statusLabel = statusNames[status] ?? status;
  const Icon = current.icon;
  const counts = makeCounts(current.total, tipo, status);
  const max = Math.max(...counts.map((item) => item.value));

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm md:px-8">
        <div className="flex items-center gap-4">
          <Link to={current.back as any} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Icon className="h-5 w-5" /></div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">MobiGest · {current.label}</p>
            <h1 className="text-lg font-bold">Veículos {statusLabel.toLowerCase()}</h1>
          </div>
        </div>
        <Link to={current.back as any} className="hidden items-center gap-2 text-sm font-semibold text-sky-600 sm:flex">
          Dashboard de {current.label} <ChevronRight className="h-4 w-4" />
        </Link>
      </header>

      <main className="p-5 md:p-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-7">
            <Link to={current.back as any} className="inline-flex items-center gap-1 text-sm font-medium text-sky-600">
              <ArrowLeft className="h-4 w-4" /> Voltar ao dashboard
            </Link>
            <div className="mt-4">
              <p className="text-sm text-slate-500">Distribuição por posto administrativo</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">{statusLabel} · {current.label}</h2>
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total {statusLabel.toLowerCase()}</p>
              <p className="mt-2 text-3xl font-bold">{current.total.toLocaleString("pt-PT")}</p>
              <p className="mt-1 text-xs text-slate-400">{current.label.toLowerCase()} no município</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Postos administrativos</p>
              <p className="mt-2 text-3xl font-bold">{counts.length}</p>
              <p className="mt-1 text-xs text-slate-400">com registos nesta situação</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Maior concentração</p>
              <p className="mt-2 text-xl font-bold">{counts[0].post}</p>
              <p className="mt-1 text-xs text-slate-400">{counts[0].value} registos · {Math.round((counts[0].value / current.total) * 100)}%</p>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div><h3 className="font-semibold">Distribuição por posto administrativo</h3><p className="mt-1 text-sm text-slate-500">Número de {current.singular}s {statusLabel.toLowerCase()} por posto</p></div>
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>
              <div className="mt-7 space-y-5">
                {counts.map((item) => (
                  <div key={item.post}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-700"><MapPin className="h-4 w-4 text-slate-400" />{item.post}</span>
                      <span className="font-bold text-slate-900">{item.value}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-sky-600" style={{ width: `${(item.value / max) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-right text-[11px] text-slate-400">{Math.round((item.value / current.total) * 100)}% do total</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between"><div><h3 className="font-semibold">Resumo por posto</h3><p className="mt-1 text-sm text-slate-500">Clique num posto para filtrar</p></div><Search className="h-5 w-5 text-slate-400" /></div>
              <div className="mt-5 space-y-2">
                {counts.map((item) => (
                  <button key={item.post} type="button" className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left hover:border-sky-200 hover:bg-sky-50/50">
                    <span><span className="block text-sm font-semibold">{item.post}</span><span className="text-xs text-slate-400">{item.value} registos</span></span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5"><h3 className="font-semibold">Registos desta situação</h3><p className="mt-1 text-sm text-slate-500">Lista dos {current.label.toLowerCase()} classificados como {statusLabel.toLowerCase()}</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><tr><th className="px-6 py-3">Número MobiGest</th><th className="px-4 py-3">Proprietário</th><th className="px-4 py-3">Posto</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Estado</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {counts.flatMap((item, index) => [0,1].map((n) => (
                    <tr key={item.post + n} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">MZ-{tipo.slice(0,3).toUpperCase()}-{String(4821-index*17-n).padStart(6,"0")}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{["Alberto Manuel","Maria José","Joaquim Ernesto","Paulo Ernesto"][index % 4]}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{item.post}</td>
                      <td className="px-4 py-4 text-xs text-slate-500">Set 2026</td>
                      <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{statusLabel}</span></td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function makeCounts(total: number, tipo: string, status: string) {
  const ratios = tipo === "motorizadas" ? [0.31,0.22,0.18,0.13,0.10,0.06] : tipo === "carros" ? [0.35,0.20,0.17,0.12,0.10,0.06] : [0.28,0.23,0.19,0.13,0.10,0.07];
  const seed = status.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  const raw = ratios.map((r,i)=>Math.max(1,Math.round(total*r + ((seed+i*3)%3)-1)));
  const diff = total - raw.reduce((a,b)=>a+b,0);
  raw[0] += diff;
  return posts.map((post,i)=>({post,value:raw[i]})).sort((a,b)=>b.value-a.value);
}
