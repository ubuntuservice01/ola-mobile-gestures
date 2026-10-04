import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, FileText, Hash, Lock, QrCode, Settings2, Wallet } from "lucide-react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
export const Route=createFileRoute("/definicoes")({component: DefRouteBoundary});
function Def(){const items=[[Settings2,"Geral","Dados e preferências do sistema","/definicoes"],[Hash,"Numeração","Regras para geração dos números MobiGest","/definicoes/numeracao"],[Wallet,"Taxas municipais","Configure os serviços, valores e condições de cobrança aplicáveis ao município.","/definicoes/taxas"],[QrCode,"QR Code","Configuração da identificação por QR","/definicoes"],[FileText,"Documentos","Modelos de fichas e etiquetas","/definicoes/documentos"],[Bell,"Notificações","Alertas e preferências","/definicoes"],[Lock,"Segurança","Sessões, acesso e segurança","/definicoes"]];return <MobiGestShell title="Definições"><PageHeader title="Definições" description="Configure o funcionamento do MobiGest."/><div className="grid gap-4 md:grid-cols-2">{items.map(([Icon,title,desc,to])=><Link to={to as string} key={title as string}><Card className="flex h-full items-center gap-4 p-5 transition hover:border-sky-200 hover:bg-sky-50/30"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Icon className="h-5 w-5"/></div><div><p className="font-semibold text-sm">{title as string}</p><p className="mt-1 text-xs text-slate-500">{desc as string}</p></div></Card></Link>)}</div></MobiGestShell>}

function DefRouteBoundary() {
  return <RouteIndexBoundary pattern="/definicoes"><Def /></RouteIndexBoundary>;
}
