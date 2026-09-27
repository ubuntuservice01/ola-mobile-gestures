import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ChevronRight, MapPin, Plus, Users } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/municipios")({
  component: MunicipiosGlobais,
});

const municipalities = [
  { id: "lichinga", name: "Município de Lichinga", code: "LIC", province: "Niassa", users: 18, vehicles: "2 562", status: "Activo" },
];

function MunicipiosGlobais() {
  return (
    <SuperAdminShell title="Municípios" subtitle="Crie e administre os municípios que utilizam o MobiGest.">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500">Administração global</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Municípios</h2>
        </div>
        <Link
          to="/super-admin/municipios/novo"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Novo município
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {municipalities.map((municipality) => (
          <Link key={municipality.id} to="/super-admin/municipios/$id" params={{ id: municipality.id }}>
            <SuperCard className="h-full p-6 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Building2 />
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Activo
                </span>
              </div>

              <h3 className="mt-5 font-semibold">{municipality.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{municipality.province} · Código {municipality.code}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric icon={<Users />} value={String(municipality.users)} label="Utilizadores" />
                <Metric icon={<Building2 />} value={municipality.vehicles} label="Veículos" />
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-sky-700">
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Gerir município</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </SuperCard>
          </Link>
        ))}
      </div>

      <SuperCard className="mt-6 border-dashed p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold">Adicionar outro município</h3>
            <p className="mt-1 text-sm text-slate-500">
              O novo município terá código próprio, estrutura territorial, utilizadores e configurações independentes.
            </p>
          </div>
          <Link to="/super-admin/municipios/novo" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
            Criar município
          </Link>
        </div>
      </SuperCard>
    </SuperAdminShell>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-slate-400">{icon}</div>
      <p className="mt-2 text-lg font-bold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
