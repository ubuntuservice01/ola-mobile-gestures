import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Globe2, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/permissoes")({ component: PermissoesGlobais });

const profiles = [
  { key:"super-administrador", name:"Super Administrador", scope:"Plataforma inteira", description:"Administração global, municípios, segurança e configuração da plataforma." },
  { key:"administrador-municipal", name:"Administrador Municipal", scope:"Município atribuído", description:"Gestão operacional, utilizadores e configurações do município." },
  { key:"tecnico", name:"Técnico", scope:"Município / posto", description:"Registo, documentação, validação e actualização de processos." },
  { key:"fiscal", name:"Fiscal", scope:"Município / posto", description:"Consulta, fiscalização e registo de ocorrências." },
  { key:"financeiro", name:"Financeiro", scope:"Município", description:"Taxas, cobranças, pagamentos e informação financeira." },
];

const actions=["Consultar","Criar","Editar","Validar","Alterar estado","Transferir","Financeiro","Utilizadores"];
const matrix=[
  ["Dashboard",      ["✓","✓","✓","✓","✓","✓","✓","✓"]],
  ["Veículos",       ["✓","✓","✓","—","✓","✓","—","—"]],
  ["Proprietários",  ["✓","✓","✓","—","—","—","—","—"]],
  ["Registos",       ["✓","✓","✓","✓","—","—","—","—"]],
  ["Documentos",     ["✓","✓","✓","✓","—","—","—","—"]],
  ["Fiscalização",   ["✓","✓","✓","—","✓","—","—","—"]],
  ["Financeiro",     ["✓","✓","✓","—","—","—","✓","—"]],
  ["Relatórios",     ["✓","✓","✓","—","—","—","✓","—"]],
  ["Utilizadores",   ["✓","—","—","—","—","—","—","✓"]],
  ["Municípios",     ["✓","✓","✓","—","—","—","—","✓"]],
  ["Auditoria",      ["✓","—","—","—","—","—","—","—"]],
  ["Definições",     ["✓","✓","✓","—","—","—","✓","—"]],
];

const profilePermissions: Record<string,Record<string,string[]>>={
  "Super Administrador": Object.fromEntries(matrix.map(([m])=>[m,actions])),
  "Administrador Municipal":{
    "Dashboard":["Consultar"],"Veículos":["Consultar","Criar","Editar","Alterar estado","Transferir"],"Proprietários":["Consultar","Criar","Editar"],
    "Registos":["Consultar","Criar","Editar","Validar"],"Documentos":["Consultar","Criar","Editar","Validar"],"Fiscalização":["Consultar"],
    "Financeiro":["Consultar"],"Relatórios":["Consultar"],"Utilizadores":["Consultar","Utilizadores"],"Municípios":["Consultar"],"Auditoria":["Consultar"],"Definições":["Consultar","Editar"],
  },
  "Técnico":{
    "Dashboard":["Consultar"],"Veículos":["Consultar","Criar","Editar","Alterar estado"],"Proprietários":["Consultar","Criar","Editar"],
    "Registos":["Consultar","Criar","Editar","Validar"],"Documentos":["Consultar","Criar","Editar","Validar"],"Fiscalização":["Consultar","Criar","Editar"],
    "Financeiro":["Consultar"],"Relatórios":["Consultar"],"Utilizadores":[],"Municípios":["Consultar"],"Auditoria":["Consultar"],"Definições":["Consultar"],
  },
  "Fiscal":{
    "Dashboard":["Consultar"],"Veículos":["Consultar","Alterar estado"],"Proprietários":["Consultar"],"Registos":["Consultar"],"Documentos":["Consultar"],
    "Fiscalização":["Consultar","Criar","Editar","Alterar estado"],"Financeiro":[],"Relatórios":["Consultar"],"Utilizadores":[],"Municípios":["Consultar"],
    "Auditoria":["Consultar"],"Definições":[],
  },
  "Financeiro":{
    "Dashboard":["Consultar"],"Veículos":["Consultar"],"Proprietários":["Consultar"],"Registos":["Consultar"],"Documentos":["Consultar"],
    "Fiscalização":["Consultar"],"Financeiro":["Consultar","Criar","Editar"],"Relatórios":["Consultar","Financeiro"],"Utilizadores":[],"Municípios":["Consultar"],
    "Auditoria":["Consultar"],"Definições":["Consultar","Financeiro"],
  },
};

function PermissoesGlobais(){
 return <SuperAdminShell title="Perfis e permissões" subtitle="Modelo de autorização do MobiGest antes da aplicação de Auth, RBAC e RLS.">
  <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{profiles.map(p=><SuperCard key={p.key} className="p-5"><ShieldCheck className="h-5 w-5 text-sky-600"/><h3 className="mt-3 text-sm font-bold">{p.name}</h3><p className="mt-2 text-xs font-semibold text-slate-500">{p.scope}</p><p className="mt-1 text-xs leading-5 text-slate-500">{p.description}</p><Link to="/super-admin/permissoes/$perfil" params={{perfil:p.key}} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-sky-700">Ver perfil <ChevronRight className="h-3.5 w-3.5"/></Link></SuperCard>)}</div>

  <SuperCard className="overflow-x-auto">
   <div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Matriz global de operações</h2><p className="mt-1 text-sm text-slate-500">Define quais operações podem existir em cada módulo. O âmbito territorial é uma camada adicional.</p></div>
   <table className="min-w-[1150px] w-full text-left text-sm">
    <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Módulo</th>{actions.map(a=><th key={a} className="px-4 py-4">{a}</th>)}</tr></thead>
    <tbody>{matrix.map(([module,values])=><tr key={module} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{module}</td>{(values as string[]).map((v,i)=><td key={i} className="px-4 py-4">{v==="—"?<span className="text-slate-300">—</span>:<Check className="h-4 w-4 text-emerald-500"/>}</td>)}</tr>)}</tbody>
   </table>
  </SuperCard>

  <div className="mt-6 grid gap-4 lg:grid-cols-3">
   <SuperCard className="p-5"><LockKeyhole className="h-5 w-5 text-sky-600"/><h3 className="mt-3 font-semibold">Âmbito territorial</h3><p className="mt-2 text-sm leading-6 text-slate-500">Super Administrador: global. Administrador Municipal: município. Técnico e Fiscal: município e, quando definido, posto administrativo. Financeiro: município.</p></SuperCard>
   <SuperCard className="p-5"><Users className="h-5 w-5 text-sky-600"/><h3 className="mt-3 font-semibold">Princípio do menor privilégio</h3><p className="mt-2 text-sm leading-6 text-slate-500">Um utilizador recebe apenas as operações necessárias ao seu perfil. Permissões especiais não devem ser concedidas apenas por estar num município.</p></SuperCard>
   <SuperCard className="p-5"><Globe2 className="h-5 w-5 text-sky-600"/><h3 className="mt-3 font-semibold">Separação global / municipal</h3><p className="mt-2 text-sm leading-6 text-slate-500">A autorização terá duas dimensões: operação permitida pelo perfil e dados acessíveis pelo âmbito. No Supabase, isto será reforçado com RLS.</p></SuperCard>
  </div>
  <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><b>Nota técnica:</b> esta matriz é a regra funcional. Ainda não concede permissões reais. A fase Supabase deverá criar perfis, relações de município/posto, políticas RLS e testes de acesso permitido e negado.</div>
 </SuperAdminShell>;
}
