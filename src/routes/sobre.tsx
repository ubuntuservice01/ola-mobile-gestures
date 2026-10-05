import { createFileRoute } from "@tanstack/react-router";
import { Building2, Database, FileSearch, Gauge, Layers3, Target } from "lucide-react";
import { CTASection, InfoCard, PageHero, PublicLayout, SectionTitle } from "../components/public/PublicSite";
import { company } from "../config/company";

export const Route = createFileRoute("/sobre")({
  head: () => ({ meta: [{ title: "Sobre o MobiGest | Gestão Municipal de Mobilidade" }, { name:"description", content:"Conheça a missão, visão e abordagem do MobiGest para modernização da gestão municipal de mobilidade." }] }),
  component: SobrePage,
});

function SobrePage() {
  const challenges=[["Registos manuais","Informação que pode ficar dependente de processos físicos e consulta demorada."],["Informação dispersa","Dados distribuídos dificultam uma visão centralizada."],["Pesquisa lenta","Localizar um registo pode exigir vários passos e fontes."],["Pouca rastreabilidade","Históricos incompletos dificultam o acompanhamento de alterações."],["Relatórios demorados","Consolidação manual aumenta o esforço de preparação."],["Receitas fragmentadas","Cobranças e pagamentos precisam de ligação clara aos processos."],["Fiscalização limitada","Equipas no terreno beneficiam de consulta autorizada e rápida."]];
  return <PublicLayout><main>
    <PageHero eyebrow="Conheça a plataforma" title="Tecnologia pensada para a gestão municipal.">O MobiGest transforma processos de mobilidade que antes estavam dispersos em informação organizada, consultável e preparada para apoiar a administração municipal.</PageHero>

    <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10"><SectionTitle eyebrow="Contexto" title="O desafio" text="A digitalização começa por organizar problemas concretos do dia-a-dia municipal."/><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{challenges.map(([t,d])=><InfoCard key={t} title={t} text={d} icon={<FileSearch className="h-5 w-5"/>}/>)}</div></section>

    <section className="bg-white border-y border-slate-200"><div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2 lg:px-10"><div><SectionTitle eyebrow="A nossa resposta" title="Uma única plataforma para organizar operações."/><p className="mt-5 text-base leading-8 text-slate-600">O MobiGest centraliza registos, proprietários, veículos, fiscalização, multas, finanças, consulta pública e relatórios, preservando acessos por perfil e âmbito municipal.</p></div><div className="grid gap-4 sm:grid-cols-2"><InfoCard title="Missão" text="Apoiar municípios na organização, controlo e modernização dos processos ligados à mobilidade, através de ferramentas digitais simples, seguras e adaptáveis." icon={<Target className="h-5 w-5"/>}/><InfoCard title="Visão" text="Contribuir para uma administração municipal mais digital, eficiente e orientada por dados em Moçambique." icon={<Gauge className="h-5 w-5"/>}/></div></div></section>

    <section className="mx-auto grid max-w-7xl gap-8 px-6 py-20 lg:grid-cols-2 lg:px-10"><InfoCard title="Pensado para crescer" text="A plataforma possui estrutura multi-município e organização territorial por postos administrativos e localidades, permitindo expansão controlada conforme a implementação institucional." icon={<Layers3 className="h-5 w-5"/>}/><InfoCard title="Base centralizada" text="Os módulos partilham uma base de dados estruturada, permitindo pesquisa, histórico e indicadores sem duplicar informação desnecessariamente." icon={<Database className="h-5 w-5"/>}/></section>

    <section className="bg-slate-100"><div className="mx-auto max-w-7xl px-6 py-20 lg:px-10"><div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#147D92]/10 text-[#147D92]"><Building2 className="h-6 w-6"/></div><h2 className="font-display mt-6 text-3xl font-bold">Desenvolvido pela Ubuntu Service, Lda.</h2><p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">O MobiGest é uma solução tecnológica desenvolvida pela Ubuntu Service, Lda., empresa moçambicana dedicada ao desenvolvimento de software, plataformas digitais, automação e soluções tecnológicas para empresas, instituições e comunidades.</p><p className="mt-6 font-display text-xl font-bold text-[#147D92]">“{company.tagline}”</p></div></div></section>
    <CTASection/>
  </main></PublicLayout>;
}
