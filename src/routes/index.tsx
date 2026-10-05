import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { heroMobilityImage } from "../assets/hero-mobility";
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
          <a href="/" className="flex items-center">
            <img
              src="/mobigest-logo.svg"
              alt="MobiGest — Gestão de Motos, Carros e Bicicletas"
              className="h-12 w-auto"
            />
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#inicio" className="text-sky-600">Início</a>
            <a href="#sobre" className="hover:text-sky-600">Sobre</a>
            <a href="#funcionalidades" className="hover:text-sky-600">Funcionalidades</a>
            <a href="#vantagens" className="hover:text-sky-600">Vantagens</a>
            <a href="#contacto" className="hover:text-sky-600">Contacto</a>
          </nav>

          <a
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-500 hover:text-sky-600"
          >
            <UserRound className="h-4 w-4" />
            Entrar
          </a>
        </div>
      </header>

      <section id="inicio" className="overflow-hidden bg-slate-950">
        <div className="relative mx-auto max-w-7xl lg:min-h-[620px]">
          <div className="absolute inset-y-0 right-0 hidden w-[68%] overflow-hidden md:block">
            <img
              src={heroMobilityImage}
              alt="Moto-taxistas em circulação urbana"
              className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
              loading="eager"
              decoding="async"
            />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,23,0.05),rgba(2,8,23,0.22))]" />

            <div className="absolute inset-y-0 left-0 w-[58%] bg-[linear-gradient(90deg,#020817_0%,rgba(2,8,23,0.98)_24%,rgba(2,8,23,0.88)_40%,rgba(2,8,23,0.60)_58%,rgba(2,8,23,0.28)_76%,rgba(2,8,23,0.06)_92%,transparent_100%)]" />

            <div className="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(180deg,transparent_0%,rgba(2,8,23,0.18)_45%,rgba(2,8,23,0.45)_100%)]" />

            <div className="absolute bottom-20 left-[20%] right-8 grid grid-cols-3 items-end gap-5">
              <VehicleVisual
                icon={<Bike className="h-14 w-14" />}
                label="Motorizadas"
              />
              <VehicleVisual
                icon={<CarFront className="h-20 w-20" />}
                label="Carros"
                featured
              />
              <VehicleVisual
                icon={<Bike className="h-12 w-12" />}
                label="Bicicletas"
              />
            </div>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-slate-950/45 px-4 py-2.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
              Gestão municipal em tempo real
            </div>
          </div>

          <div className="relative z-10 flex min-h-[620px] flex-col justify-center px-6 py-20 md:max-w-[56%] md:pr-4 lg:max-w-[53%] lg:px-10 lg:py-24">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-300 backdrop-blur-sm">
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
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-400"
              >
                Aceder ao sistema
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/consulta"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-500 bg-slate-950/25 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white"
              >
                <Search className="h-4 w-4" />
                Consulta pública
              </Link>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden md:hidden">
            <img
              src={heroMobilityImage}
              alt="Moto-taxistas em circulação urbana"
              className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#020817_0%,rgba(2,8,23,0.78)_13%,rgba(2,8,23,0.26)_38%,rgba(2,8,23,0.16)_68%,rgba(2,8,23,0.48)_100%)]" />

            <div className="absolute bottom-16 left-4 right-4 grid grid-cols-3 items-end gap-2">
              <VehicleVisual
                icon={<Bike className="h-10 w-10" />}
                label="Motorizadas"
              />
              <VehicleVisual
                icon={<CarFront className="h-14 w-14" />}
                label="Carros"
                featured
              />
              <VehicleVisual
                icon={<Bike className="h-9 w-9" />}
                label="Bicicletas"
              />
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-slate-950/45 px-4 py-2 text-[11px] font-semibold text-white backdrop-blur-md">
              Gestão municipal em tempo real
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-8 max-w-7xl px-6 lg:px-10">
        <div className="grid rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10 md:grid-cols-4 md:p-7">
          <Stat icon={<Bike />} value="MobiGest" label="Identificação única de veículos" />
          <Stat icon={<CarFront />} value="QR" label="Verificação pública do registo" />
          <Stat icon={<UserRound />} value="MTX / CDT" label="Identificação de condutores" />
          <Stat icon={<ShieldCheck />} value="Municipal" label="Gestão por município e perfil" />
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
    <div
      className={`flex flex-col items-center justify-end text-white ${featured ? "scale-105" : ""}`}
    >
      <div className="flex h-20 items-center justify-center text-sky-100 drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)] sm:h-24 lg:h-28">
        {icon}
      </div>
      <span className="mt-1 rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md sm:text-xs">
        {label}
      </span>
    </div>
  );
}
