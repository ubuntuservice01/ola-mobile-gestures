import { RouteIndexBoundary } from "../../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, LockKeyhole, Search, ShieldCheck, Users, CarFront } from "lucide-react";
import { useMemo, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/acesso-municipal")({ component: AcessoMunicipalRouteBoundary });

const municipalities = [
  { id: "lichinga", name: "Município de Lichinga", code: "LIC", province: "Niassa", users: 18, vehicles: 2562, status: "Activo" },
  { id: "pemba", name: "Município de Pemba", code: "PEM", province: "Cabo Delgado", users: 11, vehicles: 1184, status: "Configuração" },
];

function AcessoMunicipal() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => municipalities.filter((item) =>
    (item.name + " " + item.code + " " + item.province).toLowerCase().includes(query.toLowerCase())
  ), [query]);

  return (
    <SuperAdminShell title="Acesso à área municipal" subtitle="Entrada controlada para acompanhar ou apoiar a operação de um município.">
      <div className="mb-7">
        <p className="text-sm text-slate-500">Operação assistida</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">Seleccionar município</h2>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600"><LockKeyhole className="h-5 w-5" /></div>
          <div>
            <h3 className="font-semibold text-amber-950">Acesso controlado</h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-amber-900/75">
              O acesso deve ser iniciado pelo Super Administrador para um município específico, com âmbito e motivo registados. Na integração final, a sessão será temporária e ficará registada na auditoria.
            </p>
          </div>
        </div>
      </div>

      <SuperCard className="mt-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar município ou código" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-500" />
        </div>
      </SuperCard>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {filtered.map((municipality) => (
          <SuperCard key={municipality.id} className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Building2 className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{municipality.name}</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{municipality.code}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{municipality.province}</p>
              </div>
              <span className={municipality.status === "Activo" ? "rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700" : "rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700"}>{municipality.status}</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Info icon={<Users />} label="Utilizadores" value={String(municipality.users)} />
              <Info icon={<CarFront />} label="Veículos" value={municipality.vehicles.toLocaleString("pt-PT")} />
            </div>

            <Link to="/super-admin/acesso-municipal/$id" params={{ id: municipality.id }} className="mt-5 flex items-center justify-between rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700">
              Preparar acesso <ArrowRight className="h-4 w-4" />
            </Link>
          </SuperCard>
        ))}
      </div>

      <SuperCard className="mt-6 p-6">
        <div className="flex items-start gap-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <div>
            <h3 className="font-semibold">Regra de segurança</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              O Super Administrador não deve entrar na área municipal simplesmente por conhecer o endereço. A entrada deverá passar por autorização, selecção do município, definição do âmbito, registo de auditoria e, no futuro, expiração automática da sessão.
            </p>
          </div>
        </div>
      </SuperCard>
    </SuperAdminShell>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-2 text-slate-400">{icon}<span className="text-xs">{label}</span></div><p className="mt-1 text-lg font-bold">{value}</p></div>;
}


function AcessoMunicipalRouteBoundary() {
  return <RouteIndexBoundary pattern="/super-admin/acesso-municipal"><AcessoMunicipal /></RouteIndexBoundary>;
}
