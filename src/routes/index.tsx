import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Bike,
  CarFront,
  LogIn,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  component: MobiGestHome,
});

function MobiGestHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 lg:px-10">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold">MobiGest</p>
                <p className="text-xs text-slate-400">
                  Gestão Municipal de Mobilidade
                </p>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium"
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </button>
          </header>

          <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-2">
            <div>
              <span className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold text-sky-300">
                Plataforma para municípios
              </span>

              <h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
                Mobilidade municipal,{" "}
                <span className="text-sky-400">simples e organizada.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Registe e acompanhe motorizadas, carros e bicicletas num único
                sistema, com identificação, consulta e gestão preparada para o
                município.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3.5 text-sm font-semibold"
                >
                  Aceder ao sistema
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-white/15 px-5 py-3.5 text-sm font-semibold"
                >
                  Consulta pública
                </button>
              </div>

              <div className="mt-12 grid max-w-xl grid-cols-3 gap-3">
                <Feature icon={<Smartphone />} label="Digital" />
                <Feature icon={<ShieldCheck />} label="Seguro" />
                <Feature icon={<ArrowRight />} label="Municipal" />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-sm font-semibold">Resumo municipal</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Visão geral dos registos
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                    Activo
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 py-5">
                  <Metric icon={<Bike />} value="1 284" label="Motorizadas" />
                  <Metric icon={<CarFront />} value="486" label="Carros" />
                  <Metric icon={<Bike />} value="792" label="Bicicletas" />
                </div>

                <div className="rounded-xl bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Registos este mês
                    </span>
                    <span className="text-sm font-semibold text-emerald-300">
                      +12,8%
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-3/4 rounded-full bg-sky-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

      <footer className="border-t border-white/10 bg-black px-6 py-10 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">MobiGest</p>
                  <p className="text-xs text-slate-400">
                    Gestão Municipal de Mobilidade
                  </p>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-xs leading-5 text-slate-500">
                Sistema municipal de registo e gestão de motorizadas, carros e
                bicicletas.
              </p>
            </div>

            <nav className="grid gap-2 text-sm text-slate-400">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Navegação
              </p>
              <a href="#" className="transition-colors hover:text-white">
                Início
              </a>
              <a href="#" className="transition-colors hover:text-white">
                Consulta pública
              </a>
              <a href="#" className="transition-colors hover:text-white">
                Aceder ao sistema
              </a>
            </nav>

            <div className="grid gap-2 text-sm text-slate-400">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Contacto
              </p>
              <a href="mailto:geral@mobigest.pt" className="transition-colors hover:text-white">
                geral@mobigest.pt
              </a>
              <span>Município · Portugal</span>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-5 text-xs text-slate-600">
            © 2026 MobiGest · Sistema Municipal de Gestão de Mobilidade
          </div>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-300">
      <span className="text-sky-400">{icon}</span>
      {label}
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <span className="text-sky-400">{icon}</span>
      <p className="mt-2 text-lg font-bold">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
