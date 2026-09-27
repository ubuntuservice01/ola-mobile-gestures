import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/permissoes/$perfil")({ component: PerfilDetalhe });

const profiles: Record<string,{name:string;scope:string;description:string}> = {
 "super-administrador":{name:"Super Administrador",scope:"Plataforma inteira",description:"Acesso global à administração da plataforma e a todos os municípios."},
 "administrador-municipal":{name:"Administrador Municipal",scope:"Município atribuído",description:"Administração operacional do município e dos utilizadores desse município."},
 "tecnico":{name:"Técnico",scope:"Município / posto",description:"Registo, documentação, validação e actualização de processos."},
 "fiscal":{name:"Fiscal",scope:"Município / posto",description:"Consulta de veículos, fiscalização e ocorrências."},
 "financeiro":{name:"Financeiro",scope:"Município",description:"Taxas, cobranças, pagamentos e relatórios financeiros."},
};

const permissions: Record<string,Record<string,string[]>>={
 "super-administrador":{
  Dashboard:["Consultar","Criar","Editar","Validar","Alterar estado","Transferir","Financeiro","Utilizadores"],
  Veículos:["Consultar","Criar","Editar","Alterar estado","Transferir"],Proprietários:["Consultar","Criar","Editar"],Registos:["Consultar","Criar","Editar","Validar"],
  Documentos:["Consultar","Criar","Editar","Validar"],Fiscalização:["Consultar","Criar","Editar","Alterar estado"],Financeiro:["Consultar","Criar","Editar","Financeiro"],
  Relatórios:["Consultar","Financeiro"],Utilizadores:["Consultar","Utilizadores"],Municípios:["Consultar","Criar","Editar"],Auditoria:["Consultar"],Definições:["Consultar","Editar","Financeiro"],
 },
 "administrador-municipal":{
  Dashboard:["Consultar"],Veículos:["Consultar","Criar","Editar","Alterar estado","Transferir"],Proprietários:["Consultar","Criar","Editar"],Registos:["Consultar","Criar","Editar","Validar"],
  Documentos:["Consultar","Criar","Editar","Validar"],Fiscalização:["Consultar"],Financeiro:["Consultar"],Relatórios:["Consultar"],Utilizadores:["Consultar","Utilizadores"],Municípios:["Consultar"],Auditoria:["Consultar"],Definições:["Consultar","Editar"],
 },
 "tecnico":{
  Dashboard:["Consultar"],Veículos:["Consultar","Criar","Editar","Alterar estado"],Proprietários:["Consultar","Criar","Editar"],Registos:["Consultar","Criar","Editar","Validar"],
  Documentos:["Consultar","Criar","Editar","Validar"],Fiscalização:["Consultar","Criar","Editar"],Financeiro:["Consultar"],Relatórios:["Consultar"],Utilizadores:[],Municípios:["Consultar"],Auditoria:["Consultar"],Definições:["Consultar"],
 },
 "fiscal":{
  Dashboard:["Consultar"],Veículos:["Consultar","Alterar estado"],Proprietários:["Consultar"],Registos:["Consultar"],Documentos:["Consultar"],
  Fiscalização:["Consultar","Criar","Editar","Alterar estado"],Financeiro:[],Relatórios:["Consultar"],Utilizadores:[],Municípios:["Consultar"],Auditoria:["Consultar"],Definições:[],
 },
 "financeiro":{
  Dashboard:["Consultar"],Veículos:["Consultar"],Proprietários:["Consultar"],Registos:["Consultar"],Documentos:["Consultar"],Fiscalização:["Consultar"],
  Financeiro:["Consultar","Criar","Editar","Financeiro"],Relatórios:["Consultar","Financeiro"],Utilizadores:[],Municípios:["Consultar"],Auditoria:["Consultar"],Definições:["Consultar","Financeiro"],
 },
};

function PerfilDetalhe(){
 const {perfil}=Route.useParams();
 const p=profiles[perfil]??profiles["administrador-municipal"];
 const rows=permissions[perfil]??permissions["administrador-municipal"];
 return <SuperAdminShell title={p.name} subtitle="Detalhe do perfil e operações autorizadas.">
  <Link to="/super-admin/permissoes" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/> Perfis e permissões</Link>
  <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
   <SuperCard className="p-7"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><ShieldCheck/></div><h2 className="mt-5 text-2xl font-bold">{p.name}</h2><p className="mt-2 text-sm font-semibold text-sky-700">{p.scope}</p><p className="mt-3 text-sm leading-6 text-slate-500">{p.description}</p><div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><LockKeyhole className="mr-2 inline h-4 w-4 text-slate-500"/><b>Âmbito:</b> as permissões abaixo só se aplicam aos dados que o utilizador está autorizado a aceder.</div></SuperCard>
   <SuperCard className="overflow-hidden"><div className="border-b border-slate-100 bg-slate-50 px-5 py-4"><h3 className="font-semibold">Operações permitidas</h3><p className="mt-1 text-xs text-slate-500">Uma célula vazia significa que a operação não faz parte deste perfil.</p></div>
    <div className="divide-y divide-slate-100">{Object.entries(rows).map(([module,ops])=><div key={module} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_2fr]"><div className="text-sm font-semibold">{module}</div><div className="flex flex-wrap gap-2">{ops.length?ops.map(op=><span key={op} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Check className="h-3 w-3"/>{op}</span>):<span className="text-xs text-slate-400">Sem operações específicas</span>}</div></div>)}</div>
   </SuperCard>
  </div>
  <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900"><b>Aplicação futura:</b> este perfil será associado ao utilizador no Supabase. As políticas RLS deverão verificar o perfil e o município/posto antes de permitir a operação.</div>
 </SuperAdminShell>;
}
