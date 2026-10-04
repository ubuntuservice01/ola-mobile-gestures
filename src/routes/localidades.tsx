import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ChevronRight, MapPin } from "lucide-react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";

export const Route = createFileRoute("/localidades")({ component: LocalidadesRouteBoundary });

const data = [
  ["Centro", "Chiuaula", "Município de Lichinga", "182"],
  ["San Maria", "Chiuaula", "Município de Lichinga", "147"],
  ["Ntawira", "Chiuaula", "Município de Lichinga", "96"],
  ["Chiuaula Norte", "Chiuaula", "Município de Lichinga", "139"],
  ["Chiuaula Sul", "Chiuaula", "Município de Lichinga", "120"],
  ["Massenger Central", "Massenger", "Município de Lichinga", "104"],
  ["Meponda Centro", "Meponda", "Município de Lichinga", "131"],
];

function Localidades() {
  return (
    <MobiGestShell title="Localidades / bairros" subtitle="Terceiro nível da estrutura territorial do MobiGest.">
      <PageHeader title="Localidades / bairros" description="Cada localidade ou bairro pertence a um posto administrativo e a um município." />
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1.5fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
          <span>Localidade / bairro</span><span>Posto</span><span>Município</span><span>Veículos</span>
        </div>
        {data.map(([name, post, municipality, vehicles]) => (
          <Link key={name} to="/localidades/$id" params={{ id: name }} className="grid grid-cols-[1.5fr_1fr_1.5fr_auto] items-center gap-4 border-b border-slate-100 px-5 py-4 hover:bg-slate-50">
            <span className="flex items-center gap-3 text-sm font-semibold"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600"><MapPin className="h-4 w-4"/></span>{name}</span>
            <span className="text-sm text-slate-600">{post}</span>
            <span className="text-sm text-slate-600">{municipality}</span>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">{vehicles}<ChevronRight className="h-4 w-4 text-slate-300"/></span>
          </Link>
        ))}
      </Card>
      <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800">
        <Building2 className="mr-2 inline h-4 w-4" />
        A associação territorial será validada no servidor para impedir combinações inválidas entre município, posto e localidade.
      </div>
    </MobiGestShell>
  );
}


function LocalidadesRouteBoundary() {
  return <RouteIndexBoundary pattern="/localidades"><Localidades /></RouteIndexBoundary>;
}
