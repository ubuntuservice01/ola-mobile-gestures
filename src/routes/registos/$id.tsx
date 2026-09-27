import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Clock3, FileText, UserRound, CarFront } from "lucide-react";
import { MobiGestShell, Card, PageHeader } from "../../components/MobiGestShell";

export const Route = createFileRoute("/registos/$id")({ component: RegistoDetalhe });

function RegistoDetalhe() {
  const { id } = Route.useParams();
  return <MobiGestShell title="Detalhe do registo">
    <div className="mx-auto max-w-5xl">
      <Link to="/registos" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Voltar aos registos</Link>
      <PageHeader title={id} description="Detalhe da operação e respectivo histórico." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><FileText/></div>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Operação</p><h2 className="mt-1 text-xl font-bold">Registo de veículo</h2><p className="mt-1 text-sm text-slate-500">MZ-LIC-004821</p></div>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5"/> Concluído</span>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <Info label="Data e hora" value="26 Set 2026 · 14:32"/>
            <Info label="Utilizador" value="Administrador"/>
            <Info label="Veículo" value="MZ-LIC-004821"/>
            <Info label="Tipo" value="Motorizada"/>
            <Info label="Município" value="Município"/>
            <Info label="Referência" value={id}/>
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Linha temporal</p>
          <div className="mt-5 space-y-5">
            <Timeline icon={<CheckCircle2/>} title="Operação concluída" time="26 Set 2026 · 14:32"/>
            <Timeline icon={<Clock3/>} title="Registo iniciado" time="26 Set 2026 · 14:28"/>
          </div>
        </Card>
      </div>
      <Card className="mt-6 p-6">
        <h3 className="font-semibold">Entidades relacionadas</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link to="/veiculos/$id" params={{id:"MZ-LIC-004821"}} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-sky-300"><CarFront className="h-5 w-5 text-sky-600"/><div><p className="text-sm font-semibold">Veículo</p><p className="text-xs text-slate-500">Abrir ficha do veículo</p></div></Link>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><UserRound className="h-5 w-5 text-slate-500"/><div><p className="text-sm font-semibold">Utilizador</p><p className="text-xs text-slate-500">Administrador</p></div></div>
        </div>
      </Card>
    </div>
  </MobiGestShell>;
}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-700">{value}</p></div>}
function Timeline({icon,title,time}:{icon:React.ReactNode;title:string;time:string}){return <div className="flex gap-3"><span className="text-emerald-600">{icon}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-slate-500">{time}</p></div></div>}
