import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import heroAsset from "../assets/hero-mobility-taxi.png.asset.json";
import {
  ArrowRight,
  Bike,
  CarFront,
  FileCheck2,
  QrCode,
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
    <main className="min-h-screen bg-[#F4F7F6] font-sans text-slate-900">
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
            <a href="#inicio" className="text-[#147D92]">Início</a>
            <a href="#sobre" className="transition hover:text-[#147D92]">Sobre</a>
            <a href="#funcionalidades" className="transition hover:text-[#147D92]">Funcionalidades</a>
            <a href="#vantagens" className="transition hover:text-[#147D92]">Vantagens</a>
            <a href="#contacto" className="transition hover:text-[#147D92]">Contacto</a>
          </nav>

          <a
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#147D92] hover:text-[#147D92]"
          >
            <UserRound className="h-4 w-4" />
            Entrar
          </a>
        </div>
      </header>

      <section id="inicio" className="overflow-hidden bg-[#0B172A]">
        <div className="relative mx-auto max-w-7xl lg:min-h-[640px]">
          {/* Imagem do lado esquerdo */}
          <div className="absolute inset-y-0 left-0 hidden w-[58%] overflow-hidden md:block">
            <img
              src={heroAsset.url}
              alt="Moto-taxista identificado com colete e QR Code em circulação urbana"
              className="absolute inset-0 h-full w-full object-cover object-[38%_center]"
              loading="eager"
              decoding="async"
            />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,23,42,0.10),rgba(11,23,42,0.28))]" />

            <div className="absolute inset-y-0 right-0 w-[58%] bg-[linear-gradient(270deg,#0B172A_0%,rgba(11,23,42,0.98)_22%,rgba(11,23,42,0.86)_38%,rgba(11,23,42,0.55)_56%,rgba(11,23,42,0.22)_76%,rgba(11,23,42,0.04)_92%,transparent_100%)]" />

            <div className="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(180deg,transparent_0%,rgba(11,23,42,0.20)_45%,rgba(11,23,42,0.50)_100%)]" />

            <div className="absolute bottom-14 left-6 flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0B172A]/55 px-4 py-3 shadow-2xl backdrop-blur-md lg:left-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D59B42] text-[#0B172A]">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#D59B42]">
                  Identificação por QR
                </p>
                <p className="text-sm font-bold text-white">
                  Condutor MTX-0287 · verificado
                </p>
              </div>
            </div>
          </div>

          {/* Conteúdo do lado direito */}
          <div className="relative z-10 flex min-h-[640px] flex-col justify-center px-6 py-20 md:ml-[46%] md:pl-4 lg:px-10 lg:py-24">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#D59B42]/30 bg-[#D59B42]/10 px-4 py-2 text-sm font-semibold text-[#E9B96A] backdrop-blur-sm">
              <Target className="h-4 w-4" />
              Plataforma para municípios
            </div>

            <h1 className="font-display max-w-2xl text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Mobilidade municipal,
              <span className="block text-[#3FB7CC]">simples e organizada.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              Registe e acompanhe motorizadas, carros e bicicletas num único
              sistema, com identificação, consulta e gestão preparada para o
              município.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-[#147D92] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#147D92]/25 transition hover:-translate-y-0.5 hover:bg-[#1893AB]"
              >
                Aceder ao sistema
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/consulta"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-500 bg-[#0B172A]/40 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white"
              >
                <Search className="h-4 w-4" />
                Consulta pública
              </Link>
            </div>
          </div>

          {/* Versão móvel: imagem atrás, conteúdo por cima */}
          <div className="relative min-h-[560px] overflow-hidden md:hidden">
            <img
              src={heroAsset.url}
              alt="Moto-taxista identificado com colete e QR Code em circulação urbana"
              className="absolute inset-0 h-full w-full object-cover object-[38%_center]"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#0B172A_0%,rgba(11,23,42,0.80)_14%,rgba(11,23,42,0.30)_40%,rgba(11,23,42,0.20)_68%,rgba(11,23,42,0.55)_100%)]" />

            <div className="relative z-10 flex min-h-[560px] flex-col justify-center px-6 py-16">
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#D59B42]/30 bg-[#D59B42]/15 px-3 py-1.5 text-xs font-semibold text-[#E9B96A] backdrop-blur-sm">
                <Target className="h-3.5 w-3.5" />
                Plataforma para municípios
              </div>

              <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-white">
                Mobilidade municipal,
                <span className="block text-[#3FB7CC]">simples e organizada.</span>
              </h1>

              <p className="mt-5 text-base leading-7 text-slate-200">
                Registe e acompanhe motorizadas, carros e bicicletas num único
                sistema, com identificação e consulta pública.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#147D92] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#147D92]/25"
                >
                  Aceder ao sistema
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/consulta"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-[#0B172A]/40 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm"
                >
                  <Search className="h-4 w-4" />
                  Consulta pública
                </Link>
              </div>

              <div className="mt-8 flex w-fit items-center gap-3 rounded-2xl border border-white/15 bg-[#0B172A]/55 px-4 py-3 shadow-2xl backdrop-blur-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D59B42] text-[#0B172A]">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#D59B42]">
                    Identificação por QR
                  </p>
                  <p className="text-xs font-bold text-white">
                    Condutor MTX-0287 · verificado
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="vantagens" className="relative z-10 mx-auto -mt-8 max-w-7xl px-6 lg:px-10">
        <div className="grid rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10 md:grid-cols-4 md:p-7">
          <Stat icon={<Bike />} value="MobiGest" label="Identificação única de veículos" />
          <Stat icon={<QrCode />} value="QR" label="Verificação pública do registo" />
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

      <section id="funcionalidades" className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#147D92]">
              MobiGest
            </p>
            <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Uma base digital para a mobilidade do município.
            </h2>
            <p className="mt-4 text-slate-600">
              Uma solução pensada para simplificar o registo, a consulta e o
              acompanhamento dos veículos.
            </p>
          </div>
        </div>
      </section>

      <footer id="contacto" className="bg-[#0B172A] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-7 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div className="flex items-center gap-4">
            <span className="font-display text-xl font-bold">MobiGest</span>
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
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#147D92]/10 text-[#147D92]">
        {icon}
      </div>
      <div>
        <p className="font-display text-2xl font-bold text-slate-900">{value}</p>
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
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#147D92]/10 text-[#147D92]">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}
