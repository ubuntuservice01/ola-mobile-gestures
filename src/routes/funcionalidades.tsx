import { createFileRoute } from "@tanstack/react-router";
import { Bike, CarFront, CircleDollarSign, FileBarChart, Gavel, Search, ShieldCheck, Smartphone, UsersRound } from "lucide-react";
import { CheckList, PageHero, PublicLayout, SectionTitle } from "../components/public/PublicSite";

export const Route = createFileRoute("/funcionalidades")({
  head: () => ({ meta:[{title:"Funcionalidades | MobiGest"},{name:"description",content:"Conheça os módulos de veículos, proprietários, taxistas, multas, finanças, consulta pública e relatórios do MobiGest."}] }),
  component: FuncionalidadesPage,
});

const modules=[
 {id:"motorizadas",title:"Gestão de Motorizadas",text:"Registe e acompanhe motorizadas com dados do veículo, proprietário, identificação, documentos, estado e histórico.",items:["Cadastro","Identificação","Chassi","Proprietário","Documentos","Estado","Histórico","Pesquisa","Transferência de propriedade"],icon:Bike},
 {id:"automoveis",title:"Gestão de Automóveis",text:"Organize os dados essenciais dos automóveis e acompanhe o respetivo histórico operacional.",items:["Matrícula","Chassi","Proprietário","Categoria","Documentos","Estado","Histórico","Pesquisa"],icon:CarFront},
 {id:"bicicletas",title:"Gestão de Bicicletas",text:"Registo adaptado para bicicletas dentro da estrutura territorial do município.",items:["Cadastro simplificado","Identificação","Proprietário","Localização administrativa","Estado","Histórico"],icon:Bike},
 {id:"proprietarios",title:"Cadastro de Proprietários",text:"Centralize dados dos titulares associados aos veículos e permita consulta do respetivo histórico.",items:["Dados do titular","Documento","Contactos","Morada","Associação a veículos","Histórico"],icon:UsersRound},
 {id:"taxistas",title:"Gestão de Taxistas",text:"O sistema já possui estrutura de condutores e taxistas, associação ao veículo, referência própria e estado.",items:["Cadastro do operador","Associação ao veículo","Documentos","Estado","Pesquisa","Referência e QR quando disponível"],icon:Smartphone},
 {id:"licencas",title:"Licenciamento e autorizações",text:"A plataforma está preparada para acompanhar configurações e processos relacionados com autorizações e taxas municipais, conforme a implementação de cada município.",items:["Configuração por município","Associação a processos","Validade quando aplicável","Histórico operacional"],icon:ShieldCheck},
 {id:"multas",title:"Gestão de Multas",text:"Registo estruturado de infrações e acompanhamento da situação da multa.",items:["Criação","Infração","Valor","Situação","Pagamento","Histórico"],icon:Gavel},
 {id:"apreensoes",title:"Apreensões e estados do veículo",text:"O modelo de veículos suporta o estado apreendido e histórico de alterações, permitindo rastrear ocorrências ligadas ao estado operacional.",items:["Veículo","Estado","Motivo/ocorrência","Data","Responsável","Histórico"],icon:ShieldCheck},
 {id:"receitas",title:"Gestão de Receitas",text:"Fluxo financeiro com cobranças, pagamentos, recibos, reembolsos e relatórios.",items:["Taxas","Multas","Pagamentos","Recibos","Filtros","Totais","Relatórios"],icon:CircleDollarSign},
 {id:"consulta-publica",title:"Consulta Pública",text:"Permite consultar informações autorizadas através dos identificadores disponíveis no sistema, sem revelar dados pessoais, documentos ou outros campos privados.",items:["Pesquisa por identificador","Resultado controlado","Estado autorizado","Protecção de dados privados"],icon:Search},
 {id:"relatorios",title:"Relatórios e indicadores",text:"Relatórios municipais e indicadores operacionais para apoiar o acompanhamento e a decisão.",items:["Veículos","Categorias","Estado","Registos","Receitas","Multas","Localização administrativa"],icon:FileBarChart},
 {id:"utilizadores",title:"Utilizadores e Permissões",text:"Acesso diferenciado por perfil, combinando autenticação, permissões e âmbito municipal.",items:["Super Administrador","Administrador Municipal","Técnico","Fiscal","Financeiro"],icon:UsersRound},
 {id:"territorio",title:"Gestão territorial",text:"A informação pode ser organizada pela estrutura administrativa de cada município.",items:["Município","Postos administrativos","Localidades / bairros"],icon:ShieldCheck},
] as const;

function FuncionalidadesPage(){return <PublicLayout><main>
 <PageHero title="Tudo o que precisa para gerir a mobilidade municipal.">Do cadastro à fiscalização, o MobiGest reúne numa única plataforma as principais operações de gestão municipal de mobilidade.</PageHero>
 <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10"><SectionTitle eyebrow="Módulos" title="Gestão organizada, por área"/><div className="mt-12 space-y-6">{modules.map((m,i)=><ModuleSection key={m.id} m={m} index={i}/>)}</div></section>
 </main></PublicLayout>}
function ModuleSection({m,index}:{m:typeof modules[number];index:number}){const Icon=m.icon;return <article id={m.id} className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"><div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr]"><div><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#147D92]/10 text-[#147D92]"><Icon className="h-6 w-6"/></div><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-slate-400">Módulo {String(index+1).padStart(2,"0")}</p><h2 className="font-display mt-2 text-2xl font-bold text-slate-950">{m.title}</h2><p className="mt-4 text-sm leading-7 text-slate-600">{m.text}</p></div><div className="rounded-2xl bg-slate-50 p-6"><p className="text-sm font-bold text-slate-950">Principais capacidades</p><CheckList items={m.items}/></div></div></article>}
