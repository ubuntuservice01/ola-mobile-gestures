import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Bike,
  CarFront,
  FileCheck2,
  Search,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: MobiGestHome,
});

function MobiGestHome() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                MobiGest
              </div>
              <div className="text-xs font-medium text-slate-500">
                Gestão Municipal de Mobilidade
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#inicio" className="text-sky-600">Início</a>
            <a href="#sobre" className="hover:text-sky-600">Sobre</a>
            <a href="#funcionalidades" className="hover:text-sky-600">Funcionalidades</a>
            <a href="#vantagens" className="hover:text-sky-600">Vantagens</a>
            <a href="#contacto" className="hover:text-sky-600">Contacto</a>
          </nav>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-500 hover:text-sky-600"
          >
            <UserRound className="h-4 w-4" />
            Entrar
          </button>
        </div>
      </header>

      <section id="inicio" className="overflow-hidden bg-slate-950">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col justify-center px-6 py-20 lg:px-10 lg:py-24">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-300">
              <Target className="h-4 w-4" />
              Plataforma para municípios
            </div>

            <h1 className="max-w-2xl text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Mobilidade municipal,
              <span className="block text-sky-400">simples e organizada.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              Registe e acompanhe motorizadas, carros e bicicletas num único
              sistema, com identificação, consulta e gestão preparada para o
              município.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400"
              >
                Aceder ao sistema
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white"
              >
                <Search className="h-4 w-4" />
                Consulta pública
              </button>
            </div>
          </div>

          <div className="relative min-h-[480px] overflow-hidden bg-slate-900">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(14,165,233,0.35),transparent_40%),linear-gradient(135deg,#0f2748,#123e69_55%,#0b203b)]" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-slate-800/80 [clip-path:polygon(0_45%,100%_0,100%_100%,0_100%)]" />
            <div className="absolute right-10 top-16 h-44 w-44 rounded-full bg-sky-300/10 blur-3xl" />

            <div className="absolute bottom-24 left-10 right-10 grid grid-cols-3 items-end gap-5">
              <VehicleVisual icon={<Bike className="h-16 w-16" />} label="Motorizadas" />
              <VehicleVisual icon={<CarFront className="h-24 w-24" />} label="Carros" featured />
              <VehicleVisual icon={<Bike className="h-14 w-14" />} label="Bicicletas" />
            </div>

            <div className="absolute bottom-8 left-8 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-xs font-medium text-white backdrop-blur-md">
              Gestão municipal em tempo real
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-8 max-w-7xl px-6 lg:px-10">
        <div className="grid rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10 md:grid-cols-4 md:p-7">
          <Stat icon={<Bike />} value="1 284" label="Motorizadas registadas" />
          <Stat icon={<CarFront />} value="486" label="Carros registados" />
          <Stat icon={<Bike />} value="792" label="Bicicletas registadas" />
          <Stat icon={<ShieldCheck />} value="100%" label="Gestão segura e organizada" />
        </div>
      </section>

      <section id="sobre" className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="grid gap-10 md:grid-cols-4">
          <Info
            icon={<Target />}
            title="Identificação precisa"
            text="Cada veículo recebe um número único e pode ser associado a um QR Code."
          />
          <Info
            icon={<FileCheck2 />}
            title="Gestão eficiente"
            text="Registe, actualize e consulte informações de forma rápida e organizada."
          />
          <Info
            icon={<ShieldCheck />}
            title="Mais segurança"
            text="Informação centralizada para apoiar o controlo e a gestão municipal."
          />
          <Info
            icon={<UserRound />}
            title="Serviço ao cidadão"
            text="Consulta pública para facilitar a verificação dos registos."
          />
        </div>
      </section>

      <section id="funcionalidades" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-sky-600">
              MobiGest
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Uma base digital para a mobilidade do município.
            </h2>
            <p className="mt-4 text-slate-600">
              Uma solução pensada para simplificar o registo, a consulta e o
              acompanhamento dos veículos.
            </p>
          </div>
        </div>
      </section>

      <footer id="contacto" className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-7 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold">MobiGest</span>
            <span className="hidden h-5 w-px bg-white/20 sm:block" />
            <span className="text-sm text-slate-400">
              Sistema Municipal de Gestão de Mobilidade
            </span>
          </div>
          <span className="text-xs text-slate-500">
            © 2026 MobiGest. Todos os direitos reservados.
          </span>
        </div>
      </footer>
    </main>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 border-slate-200 px-3 py-4 md:border-r last:border-r-0">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function Info({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="border-slate-200 md:border-r md:pr-7 last:border-r-0">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function VehicleVisual({
  icon,
  label,
  featured = false,
}: {
  icon: React.ReactNode;
  label: string;
  featured?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-end text-white ${featured ? "scale-110" : ""}`}>
      <div className="flex h-32 items-center justify-center text-sky-200 drop-shadow-2xl">
        {icon}
      </div>
      <span className="mt-2 rounded-full bg-black/25 px-3 py-1 text-xs font-medium backdrop-blur">
        {label}
      </span>
    </div>
  );
}
