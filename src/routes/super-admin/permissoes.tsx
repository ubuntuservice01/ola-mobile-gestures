import { RouteIndexBoundary } from "../../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  ChevronRight,
  Globe2,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  SuperAdminShell,
  SuperCard,
} from "../../components/SuperAdminShell";
import {
  actionLabel,
  loadRbac,
  moduleLabel,
  permissionSet,
  ROLE_META,
  ROLE_ORDER,
  type PermissionRow,
  type RolePermissionRow,
} from "../../lib/permissions";

export const Route = createFileRoute("/super-admin/permissoes")({
  component: PermissoesGlobaisRouteBoundary,
});

function PermissoesGlobais() {
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [rolePermissions, setRolePermissions] = useState<
    RolePermissionRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const data = await loadRbac();
        if (!active) return;
        setPermissions(data.permissions);
        setRolePermissions(data.rolePermissions);
      } catch (error) {
        console.error("Falha ao carregar RBAC:", error);
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as permissões.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const sets = useMemo(
    () =>
      new Map(
        ROLE_ORDER.map((role) => [
          role,
          permissionSet(rolePermissions, role),
        ]),
      ),
    [rolePermissions],
  );

  const modules = useMemo(
    () =>
      [...new Set(permissions.map((permission) => permission.module))]
        .sort((a, b) =>
          moduleLabel(a).localeCompare(moduleLabel(b)),
        ),
    [permissions],
  );

  return (
    <SuperAdminShell
      title="Perfis e permissões"
      subtitle="RBAC efectivo carregado directamente do Supabase."
    >
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {ROLE_ORDER.map((role) => {
          const meta = ROLE_META[role];
          const total = sets.get(role)?.size ?? 0;

          return (
            <SuperCard key={role} className="p-5">
              <ShieldCheck className="h-5 w-5 text-sky-600" />
              <h3 className="mt-3 text-sm font-bold">
                {meta.name}
              </h3>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {meta.scope}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {meta.description}
              </p>
              <p className="mt-3 text-xs text-slate-400">
                {loading ? "—" : total} permissão(ões) activa(s)
              </p>
              <Link
                to="/super-admin/permissoes/$perfil"
                params={{ perfil: meta.slug }}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-sky-700"
              >
                Ver perfil
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </SuperCard>
          );
        })}
      </div>

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      <SuperCard className="overflow-x-auto">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold">
            Matriz efectiva de permissões
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cada linha corresponde a uma permissão real da tabela
            permissions. O visto significa allowed=true em
            role_permissions.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            A carregar permissões...
          </div>
        ) : permissions.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nenhuma permissão foi encontrada.
          </div>
        ) : (
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Módulo</th>
                <th className="px-5 py-4">Operação</th>
                {ROLE_ORDER.map((role) => (
                  <th key={role} className="px-4 py-4">
                    {ROLE_META[role].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.flatMap((module) =>
                permissions
                  .filter(
                    (permission) => permission.module === module,
                  )
                  .map((permission) => (
                    <tr
                      key={permission.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-700">
                          {moduleLabel(permission.module)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {permission.module}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {actionLabel(permission.action)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {permission.code}
                        </p>
                      </td>
                      {ROLE_ORDER.map((role) => (
                        <td key={role} className="px-4 py-4">
                          {sets.get(role)?.has(permission.id) ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )),
              )}
            </tbody>
          </table>
        )}
      </SuperCard>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <SuperCard className="p-5">
          <LockKeyhole className="h-5 w-5 text-sky-600" />
          <h3 className="mt-3 font-semibold">
            Âmbito territorial
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            O RBAC define a operação. RLS e as funções de autorização
            limitam os dados ao município/posto ou ao contexto global
            autorizado.
          </p>
        </SuperCard>

        <SuperCard className="p-5">
          <Users className="h-5 w-5 text-sky-600" />
          <h3 className="mt-3 font-semibold">
            Menor privilégio
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Uma operação só é permitida quando existe concessão real
            em role_permissions e o restante contexto de segurança é
            satisfeito.
          </p>
        </SuperCard>

        <SuperCard className="p-5">
          <Globe2 className="h-5 w-5 text-sky-600" />
          <h3 className="mt-3 font-semibold">
            Licença também participa
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Para utilizadores municipais, a autorização também exige
            licença activa e módulo incluído no plano.
          </p>
        </SuperCard>
      </div>

      <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
        <b>Fonte:</b> esta página já não usa uma matriz escrita à mão.
        Os dados apresentados são lidos directamente de permissions e
        role_permissions. Alterações de RBAC devem ser feitas apenas por
        um fluxo administrativo auditado.
      </div>
    </SuperAdminShell>
  );
}

function PermissoesGlobaisRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/super-admin/permissoes">
      <PermissoesGlobais />
    </RouteIndexBoundary>
  );
}
