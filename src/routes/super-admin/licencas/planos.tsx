import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, KeyRound, Settings2 } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";

export const Route=createFileRoute("/super-admin/licencas/planos")({component:Planos});

const plans=[
 {name:"Inicial",desc:"Para municípios em fase inicial de operação.",users:"10",vehicles:"1 000",modules:["Veículos","Proprietários","Registos","QR Code","Relatórios"]},
 {name:"Profissional",desc:"Operação municipal completa.",users:"50",vehicles:"5 000",modules:["Todos os módulos operacionais","Fiscalização","Financeiro","Auditoria"]},
 {name:"Enterprise",desc:"Configuração alargada para operações de maior escala.",users:"Configurável",vehicles:"Configurável",modules:["Módulos configuráveis","Limites personalizados","Integrações"]},
 {name:"Demonstração",desc:"Ambiente temporário para apresentação e testes.",users:"5",vehicles:"200",modules:["Módulos seleccionados","Validade limitada"]},
];
function Planos(){return <SuperAdminShell title="Planos de licença" subtitle="Modelos comerciais e limites que podem ser atribuídos aos municípios.">
 <div className="mb-6 flex justify-between gap-3"><Link to="/super-admin/licencas" className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4"/> Licenças</Link><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"><Settings2 className="h-4 w-4"/> Configurar planos</button></div>
 <div className="grid gap-5 xl:grid-cols-4">{plans.map((p)=><SuperCard key={p.name} className="p-6"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><KeyRound/></div><h2 className="mt-5 text-lg font-bold">{p.name}</h2><p className="mt-2 min-h-12 text-sm leading-5 text-slate-500">{p.desc}</p><div className="mt-5 grid grid-cols-2 gap-2"><Limit label="Utilizadores" value={p.users}/><Limit label="Veículos" value={p.vehicles}/></div><div className="mt-5 space-y-2">{p.modules.map(m=><p key={m} className="text-sm"><Check className="mr-2 inline h-4 w-4 text-emerald-500"/>{m}</p>)}</div></SuperCard>)}</div>
 <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><b>Nota:</b> os preços, limites definitivos e módulos comerciais ainda devem ser definidos pela Ubuntu Service. Não foram fixados nesta fase.</div>
 </SuperAdminShell>}
function Limit({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>}
