import { createFileRoute } from "@tanstack/react-router";
import { Check, CircleDollarSign, ClipboardList, Search, ShieldCheck, UserRound } from "lucide-react";
import { CTASection, InfoCard, PageHero, PublicLayout, SectionTitle } from "../components/public/PublicSite";

export const Route = createFileRoute("/vantagens")({
  head: () => ({ meta:[{title:"Vantagens | MobiGest"},{name:"description",content:"Benefícios do MobiGest para administração, técnicos, fiscalização, financeiro e cidadãos."}] }),
  component: VantagensPage,
});

function VantagensPage(){
 const groups=[
  ["Para a Administração",["Visão centralizada","Indicadores","Acompanhamento","Relatórios","Tomada de decisão"],<ShieldCheck className="h-5 w-5"/>],
  ["Para os Técnicos",["Registos organizados","Pesquisa rápida","Histórico","Menos duplicação de trabalho"],<ClipboardList className="h-5 w-5"/>],
  ["Para a Fiscalização",["Consulta rápida","Confirmação do estado","Histórico","Informação mais acessível em campo"],<Search className="h-5 w-5"/>],
  ["Para o Financeiro",["Taxas","Pagamentos","Receitas","Relatórios","Reconciliação"],<CircleDollarSign className="h-5 w-5"/>],
  ["Para o Cidadão",["Atendimento mais organizado","Consulta pública quando aplicável","Processos mais claros","Maior transparência"],<UserRound className="h-5 w-5"/>],
 ] as const;
 const before=["Processos manuais","Dados dispersos","Pesquisas demoradas","Relatórios preparados manualmente","Pouca rastreabilidade","Informação fragmentada"];
 const after=["Processos digitalizados","Base centralizada","Pesquisa rápida","Relatórios gerados a partir dos dados","Histórico de operações","Informação organizada"];
 return <PublicLayout><main>
  <PageHero title="Digitalizar não é apenas substituir papel.">É tornar a informação mais acessível, os processos mais claros e a gestão mais preparada para decidir.</PageHero>
  <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10"><SectionTitle eyebrow="Valor por perfil" title="Benefícios no trabalho diário"/><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{groups.map(([title,items,icon])=><InfoCard key={title} title={title} icon={icon} text={items.join(" · ")}/>)}</div></section>
  <section className="bg-white border-y border-slate-200"><div className="mx-auto max-w-7xl px-6 py-20 lg:px-10"><SectionTitle eyebrow="Comparativo" title="Antes x com MobiGest" text="Uma leitura simples da evolução possível quando a informação passa a estar estruturada numa plataforma."/><div className="mt-10 grid gap-6 lg:grid-cols-2"><Compare title="Antes" items={before} muted/><Compare title="Com MobiGest" items={after}/></div></div></section>
  <CTASection/>
 </main></PublicLayout>;
}
function Compare({title,items,muted=false}:{title:string;items:string[];muted?:boolean}){return <div className={"rounded-3xl border p-7 "+(muted?"border-slate-200 bg-slate-50":"border-cyan-200 bg-cyan-50/50")}><h3 className="font-display text-2xl font-bold">{title}</h3><div className="mt-6 space-y-3">{items.map(x=><div key={x} className="flex items-start gap-3"><Check className={"mt-0.5 h-5 w-5 "+(muted?"text-slate-400":"text-[#147D92]")}/><span className="text-sm leading-6 text-slate-700">{x}</span></div>)}</div></div>}
