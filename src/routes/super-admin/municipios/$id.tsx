import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, MapPin, Settings2, Users } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/municipios/$id")({
  component: MunicipioGlobal,
});

function MunicipioGlobal() {
  const { id } = Route.useParams();

  return (
    <SuperAdminShell title="Município" subtitle="Administração global e configuração da entidade municipal.">
      <Link to="/super-admin/municipios" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600">
        <ArrowLeft className="h-4 w-4" /> Municípios
      </Link>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SuperCard className="p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <Building2 />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Município</p>
                <h2 className="text-2xl font-bold">Município de Lichinga</h2>
                <p className="mt-1 text-sm text-slate-500">Código MobiGest: LIC · ID: {id}</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Activo</span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Metric icon={<Building2 />} value="2 562" label="Veículos" />
            <Metric icon={<Users />} value="18" label="Utilizadores" />
            <Metric icon={<MapPin />} value="39" label="Localidades / bairros" />
          </div>

          <h3 className="mt-8 font-semibold">Configuração institucional</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="Província" value="Niassa" />
            <Info label="Código" value="LIC" />
            <Info label="Contacto" value="+258 00 000 000" />
            <Info label="Estado" value="Activo" />
          </div>
        </SuperCard>

        <div className="space-y-4">
          <SuperCard className="p-6">
            <h3 className="font-semibold">Acesso rápido</h3>
            <div className="mt-4 space-y-2">
              <Link to="/super-admin/utilizadores" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:bg-slate-50">
                <Users className="h-4 w-4 text-sky-600" /> Utilizadores do município
              </Link>
              <Link to="/postos-administrativos" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:bg-slate-50">
                <MapPin className="h-4 w-4 text-sky-600" /> Estrutura territorial
              </Link>
              <Link to="/definicoes" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:bg-slate-50">
                <Settings2 className="h-4 w-4 text-sky-600" /> Configurações municipais
              </Link>
            </div>
          </SuperCard>

          <SuperCard className="p-6">
            <h3 className="font-semibold">Âmbito dos dados</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Os dados operacionais deste município deverão ficar isolados dos restantes municípios através de políticas de acesso no Supabase.
            </p>
          </SuperCard>
        </div>
      </div>
    </SuperAdminShell>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <span className="text-slate-400">{icon}</span>
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
