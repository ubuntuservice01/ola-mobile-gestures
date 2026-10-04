import { RouteIndexBoundary } from "../../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Filter, Search, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/super-admin/utilizadores")({
  component: UtilizadoresGlobaisRouteBoundary,
});

type UserRow = {
  id: string;
  name: string;
  role: string;
  municipalityId: string | null;
  municipality: string;
  status: string;
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrador",
  admin_municipal: "Administrador Municipal",
  tecnico: "Técnico",
  fiscal: "Fiscal",
  financeiro: "Financeiro",
};

const STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  suspenso: "Suspenso",
  inactivo: "Inactivo",
};

function UtilizadoresGlobais() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [profilesResult, municipalitiesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, role, municipality_id, status")
          .order("created_at", { ascending: false }),
        supabase.from("municipalities").select("id, name"),
      ]);

      if (!active) return;

      const error = profilesResult.error ?? municipalitiesResult.error;
      if (error) {
        console.error("Falha ao carregar utilizadores globais:", error);
        setLoadError("Não foi possível carregar os utilizadores.");
        setLoading(false);
        return;
      }

      const municipalityMap = new Map(
        (municipalitiesResult.data ?? []).map((item) => [item.id, item.name]),
      );

      setUsers(
        (profilesResult.data ?? []).map((item) => ({
          id: item.id,
          name: item.full_name,
          role: item.role,
          municipalityId: item.municipality_id,
          municipality: item.municipality_id
            ? municipalityMap.get(item.municipality_id) ?? "Município não encontrado"
            : "Administração global",
          status: item.status,
        })),
      );
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      users.filter((user) => {
        const haystack = [
          user.name,
          ROLE_LABELS[user.role] ?? user.role,
          user.municipality,
        ]
          .join(" ")
          .toLowerCase();

        return (
          haystack.includes(query.trim().toLowerCase()) &&
          (profile === "Todos" || user.role === profile) &&
          (status === "Todos" || user.status === status)
        );
      }),
    [users, query, profile, status],
  );

  const municipalityCount = new Set(
    users.map((user) => user.municipalityId).filter(Boolean),
  ).size;

  return (
    <SuperAdminShell
      title="Utilizadores"
      subtitle="Gestão global das contas, perfis e vínculo aos municípios."
    >
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500">Administração global</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Todos os utilizadores</h2>
          <p className="mt-2 text-sm text-slate-500">
            Esta lista apresenta apenas perfis reais registados no MobiGest.
          </p>
        </div>
        <Link
          to="/super-admin/utilizadores/novo"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Novo utilizador
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Mini icon={<UsersRound />} value={loading ? "—" : String(users.length)} label="Perfis registados" />
        <Mini
          icon={<ShieldCheck />}
          value={loading ? "—" : String(users.filter((user) => user.status === "activo").length)}
          label="Activos"
        />
        <Mini
          icon={<UserRound />}
          value={loading ? "—" : String(municipalityCount)}
          label="Municípios com utilizadores"
        />
      </div>

      <SuperCard className="mb-6 p-4">
        <div className="flex flex-col gap-3 xl:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por nome, perfil ou município"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={profile}
              onChange={(event) => setProfile(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            >
              <option value="Todos">Todos os perfis</option>
              <option value="super_admin">Super Administrador</option>
              <option value="admin_municipal">Administrador Municipal</option>
              <option value="tecnico">Técnico</option>
              <option value="fiscal">Fiscal</option>
              <option value="financeiro">Financeiro</option>
            </select>
          </label>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="Todos">Todos os estados</option>
            <option value="activo">Activo</option>
            <option value="suspenso">Suspenso</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </SuperCard>

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      <SuperCard className="overflow-hidden">
        <div className="hidden grid-cols-[1.6fr_1.2fr_1.4fr_auto_auto] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
          <span>Utilizador</span>
          <span>Perfil</span>
          <span>Âmbito</span>
          <span>Estado</span>
          <span></span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            A carregar utilizadores...
          </div>
        ) : (
          filtered.map((user) => (
            <div
              key={user.id}
              className="grid gap-3 border-b border-slate-100 px-6 py-5 md:grid-cols-[1.6fr_1.2fr_1.4fr_auto_auto] md:items-center"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <UserRound className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-slate-400">{user.id.slice(0, 8)}…</p>
                </div>
              </div>

              <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>

              <p className="text-sm text-slate-600">{user.municipality}</p>

              <span
                className={
                  "w-fit rounded-full px-3 py-1 text-xs font-semibold " +
                  (user.status === "activo"
                    ? "bg-emerald-50 text-emerald-700"
                    : user.status === "suspenso"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700")
                }
              >
                {STATUS_LABELS[user.status] ?? user.status}
              </span>

              <Link
                to="/super-admin/utilizadores/$id"
                params={{ id: user.id }}
                className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-sky-700"
              >
                <Eye className="h-4 w-4" /> Ver
              </Link>
            </div>
          ))
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-500">
            Nenhum utilizador corresponde aos filtros.
          </div>
        )}
      </SuperCard>

      <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
        <ShieldCheck className="mr-2 inline h-4 w-4" />
        <b>Segurança:</b> os perfis apresentados vêm do Supabase e estão sujeitos às regras RBAC e RLS. A criação de novas identidades será ligada apenas através de um fluxo administrativo seguro do Supabase Auth.
      </div>
    </SuperAdminShell>
  );
}

function Mini({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <SuperCard className="p-4">
      <span className="text-sky-600">{icon}</span>
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </SuperCard>
  );
}

function UtilizadoresGlobaisRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/super-admin/utilizadores">
      <UtilizadoresGlobais />
    </RouteIndexBoundary>
  );
}
