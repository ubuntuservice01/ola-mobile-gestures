import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight, Bike, Building2, CarFront, CheckCircle2, ChevronRight,
  CircleDollarSign, ClipboardCheck, FileBarChart, FileCheck2, Gavel,
  Menu, Search, ShieldCheck, Smartphone, UsersRound, X
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { company, product } from "../../config/company";

const nav = [
  ["/", "Início"],
  ["/sobre", "Sobre"],
  ["/funcionalidades", "Funcionalidades"],
  ["/vantagens", "Vantagens"],
  ["/contacto", "Contacto"],
] as const;

export function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="public-site min-h-screen bg-slate-50 text-slate-900"><PublicHeader />{children}<PublicFooter /></div>;
}

export function PublicHeader() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className={"public-header sticky top-0 z-50 border-b transition-all " + (scrolled ? "border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl" : "border-transparent bg-white/90 backdrop-blur-lg")}>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-10">
        <Link to="/" className="inline-flex items-center rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/15" aria-label="MobiGest — página inicial">
          <img src="/mobigest-logo.svg" alt="MobiGest" className="h-11 w-auto sm:h-12" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
          {nav.map(([to,label]) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return <Link key={to} to={to} className={"rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-sky-500/10 " + (active ? "bg-sky-50 text-[#147D92]" : "text-slate-600 hover:bg-slate-50 hover:text-[#147D92]")}>{label}</Link>;
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/consulta" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#147D92]">Consulta pública</Link>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-[#0B172A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#147D92]">Entrar <ArrowRight className="h-4 w-4" /></Link>
        </div>

        <button type="button" onClick={() => setOpen(v => !v)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className={"overflow-hidden border-t border-slate-100 bg-white transition-[max-height,opacity] duration-300 lg:hidden " + (open ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0")}>
        <nav className="mx-auto max-w-7xl space-y-1 px-5 py-5" aria-label="Navegação móvel">
          {nav.map(([to,label]) => <Link key={to} to={to} className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">{label}</Link>)}
          <Link to="/consulta" className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Consulta pública</Link>
          <Link to="/login" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#0B172A] px-5 py-3 text-sm font-semibold text-white">Entrar <ArrowRight className="h-4 w-4" /></Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-[#07111f] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
        <div>
          <img src="/mobigest-logo.svg" alt="MobiGest" className="h-11 w-auto brightness-0 invert" />
          <p className="mt-5 max-w-xs text-sm leading-6 text-slate-400">{product.description}</p>
        </div>
        <FooterLinks title="Plataforma" links={[["/","Início"],["/sobre","Sobre"],["/funcionalidades","Funcionalidades"],["/vantagens","Vantagens"],["/consulta","Consulta pública"]]} />
        <FooterLinks title="Institucional" links={[["/contacto","Contacto"],["/contacto?assunto=demonstracao","Solicitar demonstração"],["/login","Entrar"]]} />
        <div>
          <p className="text-sm font-bold">Contacto</p>
          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <a href={company.phoneHref} className="block hover:text-white">{company.phone}</a>
            <a href={"mailto:"+company.email} className="block break-all hover:text-white">{company.email}</a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <p>Uma plataforma desenvolvida pela Ubuntu Service, Lda.</p>
          <p>© {new Date().getFullYear()} MobiGest. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: readonly (readonly [string,string])[] }) {
  return <div><p className="text-sm font-bold">{title}</p><div className="mt-4 space-y-3">{links.map(([to,label]) => <a key={to} href={to} className="block text-sm text-slate-400 transition hover:text-white">{label}</a>)}</div></div>;
}

export function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children: ReactNode }) {
  return (
    <section className="public-tech-bg relative overflow-hidden bg-[#0B172A] text-white">
      <div className="public-orb public-orb-a" /><div className="public-orb public-orb-b" />
      <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-24 lg:px-10 lg:py-28">
        {eyebrow && <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</p>}
        <h1 className="font-display mt-4 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
        <div className="mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">{children}</div>
      </div>
    </section>
  );
}

export function SectionTitle({ eyebrow, title, text, center=false }: { eyebrow?: string; title: string; text?: string; center?: boolean }) {
  return <div className={(center ? "mx-auto text-center " : "")+"max-w-3xl"}>{eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#147D92]">{eyebrow}</p>}<h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h2>{text && <p className="mt-4 text-base leading-7 text-slate-600">{text}</p>}</div>;
}

export function CTASection() {
  return (
    <section className="public-tech-bg relative overflow-hidden bg-[#0B172A]">
      <div className="public-orb public-orb-a" /><div className="public-orb public-orb-b" />
      <div className="relative mx-auto max-w-7xl px-6 py-16 text-center text-white lg:px-10 lg:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Modernização municipal</p>
        <h2 className="font-display mx-auto mt-3 max-w-3xl text-3xl font-bold sm:text-4xl">Está preparado para modernizar a gestão da mobilidade?</h2>
        <p className="mx-auto mt-5 max-w-2xl text-slate-300">Conheça uma forma mais simples, organizada e digital de gerir a mobilidade no seu município.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="/contacto?assunto=demonstracao" className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-400">Solicitar demonstração <ArrowRight className="h-4 w-4" /></a>
          <Link to="/contacto" className="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10">Falar connosco</Link>
        </div>
      </div>
    </section>
  );
}

export const moduleCards = [
  ["motorizadas","Motorizadas","Registo, identificação, documentos, estado e histórico.", Bike],
  ["automoveis","Automóveis","Dados do veículo, matrícula, proprietário, documentos e pesquisa.", CarFront],
  ["bicicletas","Bicicletas","Cadastro simplificado, identificação, proprietário e localização.", Bike],
  ["proprietarios","Proprietários","Titulares associados aos veículos e respetivo histórico.", UsersRound],
  ["taxistas","Taxistas","Cadastro de operadores, associação a veículos e estado.", Smartphone],
  ["licencas","Licenças","Acompanhamento de autorizações e validade quando aplicável.", FileCheck2],
  ["multas","Multas","Registo de infrações, valores, situação e histórico.", Gavel],
  ["apreensoes","Apreensões","Acompanhamento de veículos com estado de apreensão e histórico.", ShieldCheck],
  ["receitas","Receitas","Taxas, cobranças, pagamentos, recibos e indicadores financeiros.", CircleDollarSign],
  ["consulta-publica","Consulta pública","Verificação autorizada de informação sem expor dados privados.", Search],
  ["relatorios","Relatórios","Indicadores operacionais e informação de apoio à decisão.", FileBarChart],
  ["utilizadores","Utilizadores e permissões","Acesso por perfil e responsabilidades.", UsersRound],
] as const;

export const benefits = [
  ["Dados centralizados","Informação operacional reunida numa única plataforma."],
  ["Rastreabilidade","Histórico para acompanhar alterações e operações relevantes."],
  ["Fiscalização mais rápida","Consulta de informação autorizada no momento da fiscalização."],
  ["Menos processos manuais","Fluxos digitais para reduzir dispersão e duplicação de trabalho."],
  ["Melhor controlo de receitas","Cobranças, pagamentos e recibos ligados aos respetivos processos."],
  ["Relatórios operacionais","Indicadores gerados a partir dos dados registados."],
  ["Gestão por perfis","Acessos adequados às responsabilidades de cada utilizador."],
  ["Estrutura territorial","Município, postos administrativos e localidades organizados."],
] as const;

export function InfoCard({ icon, title, text }: { icon?: ReactNode; title: string; text: string }) {
  return <div className="public-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{icon && <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-[#147D92]">{icon}</div>}<h3 className="font-display text-lg font-bold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>;
}

export function CheckList({ items }: { items: readonly string[] }) {
  return <ul className="mt-5 grid gap-3 sm:grid-cols-2">{items.map(item => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-600"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#147D92]" />{item}</li>)}</ul>;
}

export function ModuleLinkCard({ item }: { item: typeof moduleCards[number] }) {
  const [id,title,text,Icon]=item;
  return <Link to="/funcionalidades" hash={id} className="public-card group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#147D92]/10 text-[#147D92]"><Icon className="h-5 w-5" /></div><h3 className="font-display mt-5 text-lg font-bold">{title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{text}</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#147D92]">Saber mais <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>;
}

export function DashboardIllustration() {
  return <div className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10"><div className="flex items-center gap-2 border-b border-slate-100 pb-4"><div className="h-3 w-3 rounded-full bg-slate-200"/><div className="h-3 w-3 rounded-full bg-slate-200"/><div className="h-3 w-3 rounded-full bg-slate-200"/><span className="ml-2 text-xs font-bold text-slate-400">MobiGest · Painel municipal</span></div><div className="mt-5 grid grid-cols-3 gap-3">{["Veículos","Registos","Receitas"].map((x,i)=><div key={x} className="rounded-xl bg-slate-50 p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{x}</p><div className={"mt-3 h-2 rounded-full "+(i===1?"w-2/3":"w-full")+" bg-sky-200"}/><div className="mt-2 h-2 w-1/2 rounded-full bg-slate-200"/></div>)}</div><div className="mt-4 rounded-2xl bg-[#0B172A] p-5"><div className="flex items-center justify-between"><p className="text-xs font-bold text-white">Actividade operacional</p><ClipboardCheck className="h-4 w-4 text-cyan-300"/></div><div className="mt-5 flex h-28 items-end gap-2">{[40,65,48,82,58,90,72,96].map((h,i)=><div key={i} className="flex-1 rounded-t bg-cyan-400/80" style={{height:h+"%"}}/>)}</div></div></div>;
}
