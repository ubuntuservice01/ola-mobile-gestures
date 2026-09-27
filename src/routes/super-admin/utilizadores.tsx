import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ShieldCheck, UserRound } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/utilizadores")({
  component: UtilizadoresGlobais,
});

const users = [
  ["Administrador Municipal", "admin@municipio.gov.mz", "Administrador Municipal", "Lichinga", "Activo"],
  ["Técnico de Registos", "tecnico@municipio.gov.mz", "Técnico", "Lichinga", "Activo"],
  ["Fiscal Municipal", "fiscal@municipio.gov.mz", "Fiscal", "Lichinga", "Activo"],
];

function UtilizadoresGlobais() {
  return (
    <SuperAdminShell title="Utilizadores" subtitle="Gestão global das contas e do vínculo de cada utilizador ao município.">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500">Administração global</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Utilizadores</h2>
        </div>
        <Link to="/utilizadores/novo" className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
          <Plus className="h-4 w-4" /> Novo utilizador
        </Link>
      </div>

      <SuperCard className="overflow-hidden">
        <div className="hidden grid-cols-[1.5fr_1.4fr_1.1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
          <span>Utilizador</span><span>Email</span><span>Perfil</span><span>Município</span><span>Estado</span>
        </div>

        {users.map(([name, email, profile, municipality, status]) => (
          <div key={email} className="grid gap-3 border-b border-slate-100 px-6 py-5 md:grid-cols-[1.5fr_1.4fr_1.1fr_1fr_auto] md:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <UserRound className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-xs text-slate-500 md:hidden">{email}</p>
              </div>
            </div>
            <p className="hidden text-sm text-slate-600 md:block">{email}</p>
            <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{profile}</span>
            <p className="text-sm text-slate-600">{municipality}</p>
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{status}</span>
          </div>
        ))}
      </SuperCard>

      <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
        <ShieldCheck className="mr-2 inline h-4 w-4" />
        O Super Administrador poderá criar, suspender, atribuir município e alterar o perfil de uma conta. A autorização efectiva será ligada ao Supabase Auth + RBAC + RLS.
      </div>
    </SuperAdminShell>
  );
}
