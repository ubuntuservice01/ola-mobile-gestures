import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, LockKeyhole, Search, ShieldCheck, UsersRound } from "lucide-react";
import heroAsset from "../assets/hero-mobility-taxi.png.asset.json";
import { CTASection, DashboardIllustration, InfoCard, ModuleLinkCard, PublicLayout, SectionTitle, benefits, moduleCards } from "../components/public/PublicSite";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MobiGest | Gestão Municipal de Mobilidade" },
      { name: "description", content: "Plataforma digital para gestão municipal de motorizadas, automóveis, bicicletas, fiscalização, receitas e consulta pública." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const steps = [
    ["01","REGISTO","Cadastro do veículo, proprietário e documentos."],
    ["02","VALIDAÇÃO","Conferência dos dados e documentos necessários."],
    ["03","IDENTIFICAÇÃO","Associação de matrícula, código ou QR quando aplicável."],
    ["04","GESTÃO","Acompanhamento do estado e histórico."],
    ["05","FISCALIZAÇÃO","Consulta rápida pelos utilizadores autorizados."],
    ["06","RELATÓRIOS","Transformação dos dados operacionais em informação de apoio à decisão."],
  ] as const;

  const profiles = [
    ["Administrador Municipal","Visão de gestão, configuração institucional e acompanhamento operacional."],
    ["Técnicos","Registo, validação e actualização da informação autorizada."],
    ["Fiscalização","Consulta e operações de fiscalização conforme permissões."],
    ["Financeiro","Cobranças, pagamentos, recibos e informação financeira autorizada."],
    ["Postos Policiais","Consulta operacional quando integrada e autorizada pelo município."],
    ["Super Administração","Gestão global da plataforma, municípios e configurações permitidas."],
  ] as const;

  return <PublicLayout>
    <main>
      <section className="relative overflow-hidden bg-[#0B172A] text-white">
        <div className="absolute inset-0">
          <img src={heroAsset.url} alt="Mobilidade urbana apoiada pelo MobiGest" className="h-full w-full object-cover object-center opacity-45" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#0B172A_0%,rgba(11,23,42,.94)_46%,rgba(11,23,42,.62)_75%,rgba(11,23,42,.76)_100%)]" />
          <div className="public-grid absolute inset-0 opacity-25" />
        </div>
        <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-center px-6 py-20 lg:px-10">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">Plataforma para municípios</p>
            <h1 className="font-display mt-6 text-5xl font-bold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">Mobilidade municipal,<span className="block text-cyan-300">simples e organizada.</span></h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">Registe e acompanhe motorizadas, carros e bicicletas num único sistema, com identificação, consulta e gestão preparada para o município.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/funcionalidades" className="inline-flex items-center gap-2 rounded-xl bg-[#147D92] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 hover:bg-[#1893AB]">Explorar o sistema <ArrowRight className="h-4 w-4"/></Link>
              <Link to="/consulta" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"><Search className="h-4 w-4"/>Consulta pública</Link>
              <a href="/contacto?assunto=demonstracao" className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/30 px-6 py-3.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/10">Solicitar demonstração</a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1fr_.9fr] lg:items-center lg:px-10">
        <div>
          <SectionTitle eyebrow="Visão geral" title="O que é o MobiGest?" />
          <p className="mt-5 text-base leading-8 text-slate-600">O MobiGest é uma plataforma digital criada para apoiar municípios na gestão organizada da mobilidade local. Centraliza o registo e acompanhamento de motorizadas, automóveis e bicicletas, integrando funcionalidades de fiscalização, multas, receitas, consulta pública e relatórios.</p>
          <p className="mt-4 text-base leading-8 text-slate-600">Da entrada do veículo no sistema à consulta pelas equipas autorizadas, o MobiGest permite substituir processos dispersos por uma gestão centralizada, rastreável e orientada por dados.</p>
        </div>
        <DashboardIllustration />
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <SectionTitle eyebrow="Módulos" title="Uma plataforma. Várias áreas de gestão." text="Estrutura modular para acompanhar os principais processos de mobilidade municipal." center />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{moduleCards.map(item => <ModuleLinkCard key={item[0]} item={item} />)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <SectionTitle eyebrow="Fluxo operacional" title="Como funciona" text="Uma sequência clara do registo até à informação de apoio à decisão." />
        <div className="mt-10 grid gap-4 lg:grid-cols-6">{steps.map(([n,t,d]) => <div key={n} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="font-display text-3xl font-bold text-cyan-600/30">{n}</span><h3 className="mt-4 text-sm font-extrabold tracking-wide text-slate-950">{t}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{d}</p></div>)}</div>
      </section>

      <section className="bg-slate-100">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <SectionTitle eyebrow="Benefícios" title="Mais controlo para o município. Mais organização para todos." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{benefits.map(([t,d]) => <InfoCard key={t} title={t} text={d} icon={<CheckCircle2 className="h-5 w-5"/>} />)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <SectionTitle eyebrow="Perfis" title="Para quem é o MobiGest?" text="Cada utilizador vê apenas aquilo que corresponde ao seu perfil e às permissões atribuídas." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{profiles.map(([t,d]) => <InfoCard key={t} title={t} text={d} icon={<UsersRound className="h-5 w-5"/>} />)}</div>
      </section>

      <section className="bg-[#0B172A] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-10">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Segurança e controlo</p><h2 className="font-display mt-3 text-3xl font-bold sm:text-4xl">Informação municipal com controlo e rastreabilidade.</h2><p className="mt-5 text-slate-300">A arquitectura actual integra autenticação, perfis, políticas de acesso e histórico operacional em áreas já ligadas ao Supabase.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Autenticação","Permissões por perfil","Histórico de operações","Separação por município","Validação de registos","Auditoria","Consulta pública controlada"].map(x => <div key={x} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="h-5 w-5 shrink-0 text-cyan-300"/><span className="text-sm font-semibold">{x}</span></div>)}
          </div>
        </div>
      </section>
      <CTASection />
    </main>
  </PublicLayout>;
}
