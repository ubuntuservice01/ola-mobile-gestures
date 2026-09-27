import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, UserRound, Mail, Phone, KeyRound } from "lucide-react";
import { MobiGestShell, Card, PageHeader } from "../../components/MobiGestShell";

export const Route = createFileRoute("/utilizadores/$id")({ component: UtilizadorDetalhe });

function UtilizadorDetalhe() {
  const { id } = Route.useParams();
  return <MobiGestShell title="Detalhe do utilizador">
    <div className="mx-auto max-w-5xl">
      <Link to="/utilizadores" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Voltar aos utilizadores</Link>
      <PageHeader title={id} description="Conta, função e permissões do utilizador." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100"><UserRound className="h-7 w-7 text-slate-600"/></div><div><h2 className="text-xl font-bold">{id}</h2><p className="text-sm text-slate-500">Administrador</p></div><span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Activo</span></div>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <Info icon={<Mail/>} label="E-mail" value="admin@municipio.gov.mz"/>
            <Info icon={<Phone/>} label="Contacto" value="+258 84 000 0000"/>
            <Info icon={<ShieldCheck/>} label="Perfil" value="Administrador"/>
            <Info icon={<KeyRound/>} label="Autenticação" value="Supabase Auth"/>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold">Permissões</h3>
          <div className="mt-4 space-y-2">{["Veículos","Proprietários","Fiscalização","Registos","Relatórios"].map(x=><div key={x} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{x}</span><span className="text-xs font-semibold text-emerald-600">Permitido</span></div>)}</div>
          <Link to="/permissoes" className="mt-4 inline-flex text-sm font-semibold text-sky-600">Gerir permissões</Link>
        </Card>
      </div>
      <Card className="mt-6 p-6"><h3 className="font-semibold">Actividade recente</h3><p className="mt-2 text-sm text-slate-500">As actividades deste utilizador serão carregadas do histórico de auditoria após a ligação à base de dados.</p></Card>
    </div>
  </MobiGestShell>;
}
function Info({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><span className="text-slate-500">{icon}</span><div><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-700">{value}</p></div></div>}
