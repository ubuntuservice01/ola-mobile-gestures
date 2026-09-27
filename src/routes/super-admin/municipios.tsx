import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ChevronRight, MapPin, Plus, Search, Users, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/municipios")({ component: MunicipiosGlobais });

const municipalities = [
  { id: "lichinga", name: "Município de Lichinga", code: "LIC", province: "Niassa", users: 18, vehicles: "2 562", status: "Activo" },
  { id: "demo-2", name: "Município de Pemba", code: "PEM", province: "Cabo Delgado", users: 11, vehicles: "1 184", status: "Configuração" },
];

function MunicipiosGlobais() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");

  const filtered = useMemo(() => municipalities.filter((m) => {
    const matchesQuery = [m.name, m.code, m.province].join(" ").toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "Todos" || m.status === status;
    return matchesQuery && matchesStatus;
  }), [query, status]);

  return (
    <SuperAdminShell title="Municípios" subtitle="Administre as entidades municipais que utilizam o MobiGest.">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-slate-500">Administração global</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Todos os municípios</h2>
        </div>
        <Link to="/super-admin/municipios/novo" className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
          <Plus className="h-4 w-4" /> Novo município
        </Link>
      </div>

      <SuperCard className="mb-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar por município, código ou província" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-500" />
          </label>
          <label className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-500">
              <option>Todos</option><option>Activo</option><option>Configuração</option><option>Suspenso</option>
            </select>
          </label>
        </div>
      </SuperCard>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map((municipality) => (
          <Link key={municipality.id} to="/super-admin/municipios/$id" params={{ id: municipality.id }}>
            <SuperCard className="h-full p-6 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Building2 /></div>
                <Status status={municipality.status} />
              </div>
              <h3 className="mt-5 font-semibold">{municipality.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{municipality.province} · Código {municipality.code}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric icon={<Users />} value={String(municipality.users)} label="Utilizadores" />
                <Metric icon={<Building2 />} value={municipality.vehicles} label="Veículos" />
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-sky-700">
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Gerir município</span><ChevronRight className="h-4 w-4" />
              </div>
            </SuperCard>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && <SuperCard className="mt-6 p-10 text-center text-sm text-slate-500">Nenhum município corresponde aos filtros.</SuperCard>}

      <SuperCard className="mt-6 border-dashed p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div><h3 className="font-semibold">Adicionar outro município</h3><p className="mt-1 text-sm text-slate-500">Cada município terá código, utilizadores, estrutura territorial e configurações independentes.</p></div>
          <Link to="/super-admin/municipios/novo" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Criar município</Link>
        </div>
      </SuperCard>
    </SuperAdminShell>
  );
}

function Status({ status }: { status: string }) {
  const cls = status === "Activo" ? "bg-emerald-50 text-emerald-700" : status === "Suspenso" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{status}</span>;
}
function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><div className="text-slate-400">{icon}</div><p className="mt-2 text-lg font-bold">{value}</p><p className="text-xs text-slate-500">{label}</p></div>;
}
