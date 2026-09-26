import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Bike, CarFront, LogIn, ShieldCheck, Smartphone } from "lucide-react";

export const Route = createFileRoute("/")({
  component: MobiGestHome,
});

function MobiGestHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.12),_transparent_35%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 lg:px-10">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500 shadow-lg shadow-sky-500/20">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">MobiGest</p>
                <p className="text-xs text-slate-400">Gestão Municipal de Mobilidade</p>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-white/10">
              <LogIn className="h-4 w-4" />
              Entrar
            </button>
          </header>

          <div className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
            <div>
              <span className="inline-flex items-center rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold text-sky-300">
                Plataforma para municípios
              </span>
              <h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                Mobilidade municipal,{" "}
                <span className="text-sky-400">simples e organizada.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Registe e acompanhe motorizadas, carros e bicicletas num único sistema,
                com identificação, consulta e gestão preparada para o município.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400">
                  Aceder ao sistema
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button className="rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                  Consulta pública
                </button>
              </div>

              <div className="mt-12 grid max-w-xl grid-cols-3 gap-3">
                <Stat icon={<Smartphone />} label="Digital" />
                <Stat icon={<ShieldCheck />} label="Seguro" />
                <Stat icon={<ArrowRight />} label="Municipal" />
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-sky-500/10 blur-3xl" />
              <div className="relative rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl">
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-sm font-semibold">Resumo municipal</p>
                      <p className="mt-1 text-xs text-slate-500">Visão geral dos registos</p>
                    </div>
                    <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">Activo</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 py-5">
                    <Metric icon={<Bike />} value="1 284" label="Motorizadas" />
                    <Metric icon={<CarFront />} value="486" label="Carros" />
                    <Metric icon={<Bike />} value="792" label="Bicicletas" />
                  </div>
                  <div className="rounded-xl bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Registos este mês</span>
                      <span className="text-sm font-semibold text-emerald-300">+12,8%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[72%] rounded-full bg-sky-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="border-t border-white/10 py-5 text-xs text-slate-500">
            MobiGest · Sistema Municipal de Gestão de Mobilidade
          </footer>
        </div>
      </section>
    </main>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-slate-300">
      <span className="text-sky-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {label}
    </div>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className="text-sky-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <p className="mt-2 text-lg font-bold">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
