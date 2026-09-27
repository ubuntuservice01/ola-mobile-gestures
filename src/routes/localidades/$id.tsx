import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, MapPin } from "lucide-react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";

export const Route = createFileRoute("/localidades/$id")({ component: DetalheLocalidade });

function DetalheLocalidade() {
  const { id } = Route.useParams();
  return (
    <MobiGestShell title="Localidade / bairro" subtitle="Detalhe da unidade territorial.">
      <Link to="/localidades" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600">
        <ArrowLeft className="h-4 w-4"/>Localidades / bairros
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-7">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600"><MapPin/></div>
            <div><h2 className="text-2xl font-bold">{id}</h2><p className="text-sm text-slate-500">Chiuaula · Município de Lichinga</p></div>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <Info label="Posto administrativo" value="Chiuaula"/>
            <Info label="Município" value="Município de Lichinga"/>
            <Info label="Estado" value="Activo"/>
          </div>
        </Card>
        <Card className="p-6">
          <Building2 className="h-5 w-5 text-sky-600"/>
          <p className="mt-4 text-xs text-slate-400">Veículos registados</p>
          <p className="mt-1 text-3xl font-bold">182</p>
          <p className="text-sm text-slate-500">associados a esta localidade</p>
        </Card>
      </div>
    </MobiGestShell>
  );
}

function Info({label,value}:{label:string;value:string}) {
  return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}
