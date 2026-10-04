import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, Card } from "../components/MobiGestShell";
import { loadAccessProfile } from "../lib/access-control";
import { loadCurrentMunicipalAccess } from "../lib/municipal-access";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/utilizadores")({
  component: UsersPageRouteBoundary,
});

type UserRow = {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  status: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin_municipal: "Administrador Municipal",
  tecnico: "Técnico",
  fiscal: "Fiscal",
  financeiro: "Financeiro",
};

function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) {
        setLoadError("Sessão inválida.");
        setLoading(false);
        return;
      }

      const profile = await loadAccessProfile(user.id);
      if (!active || !profile) {
        setLoadError("Perfil MobiGest não encontrado.");
        setLoading(false);
        return;
      }

      if (profile.role === "admin_municipal") {
        setCanCreate(true);
      } else if (profile.role === "super_admin") {
        const access = await loadCurrentMunicipalAccess();
        if (!active) return;
        setCanCreate(access?.access_mode === "assistencia");
      } else {
        setCanCreate(false);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role, status")
        .neq("role", "super_admin")
        .order("full_name", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar utilizadores municipais:", error);
        setLoadError("Não foi possível carregar os utilizadores deste município.");
        setLoading(false);
        return;
      }

      setRows((data ?? []) as UserRow[]);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <MobiGestShell
      title="Utilizadores"
      subtitle="Contas autorizadas no contexto municipal actual."
    >
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Utilizadores</h2>
          <p className="mt-2 text-sm text-slate-500">
            A lista é carregada do Supabase e respeita o âmbito definido pelo RLS.
          </p>
        </div>

        {canCreate && (
          <Link
            to="/utilizadores/novo"
            className="inline-flex w-fit items-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            + Novo utilizador
          </Link>
        )}
      </div>

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            A carregar utilizadores...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Ainda não existem utilizadores municipais visíveis neste contexto.
          </div>
        ) : (
          rows.map((row) => (
            <Link
              to="/utilizadores/$id"
              params={{ id: row.id }}
              className="flex items-center gap-4 border-b border-slate-100 p-5 hover:bg-slate-50"
              key={row.id}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                <UserRound className="h-5 w-5 text-slate-600" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{row.full_name}</p>
                <p className="text-xs text-slate-500">
                  {row.phone || "Contacto não registado"}
                </p>
              </div>

              <span className="hidden rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 sm:inline-flex">
                {ROLE_LABELS[row.role] ?? row.role}
              </span>

              <span
                className={
                  "hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex " +
                  (row.status === "activo"
                    ? "bg-emerald-50 text-emerald-700"
                    : row.status === "suspenso"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700")
                }
              >
                {row.status === "activo"
                  ? "Activo"
                  : row.status === "suspenso"
                    ? "Suspenso"
                    : "Inactivo"}
              </span>

              <ShieldCheck
                className={
                  "h-4 w-4 " +
                  (row.status === "activo" ? "text-emerald-500" : "text-slate-300")
                }
              />
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </Link>
          ))
        )}
      </Card>
    </MobiGestShell>
  );
}

function UsersPageRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/utilizadores">
      <UsersPage />
    </RouteIndexBoundary>
  );
}
