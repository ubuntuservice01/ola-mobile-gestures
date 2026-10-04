import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Globe2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  MobiGestShell,
  PageHeader,
  Card,
} from "../components/MobiGestShell";
import {
  actionLabel,
  loadRbac,
  moduleLabel,
  permissionSet,
  ROLE_META,
  ROLE_ORDER,
  type PermissionRow,
  type RolePermissionRow,
} from "../lib/permissions";

export const Route = createFileRoute("/permissoes")({
  component: Permissoes,
});

function Permissoes() {
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
        console.error("Falha ao carregar matriz de permissões:", error);
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

  return (
    <MobiGestShell
      title="Permissões"
      subtitle="Perfis, âmbito de acesso e permissões efectivas no MobiGest."
    >
      <PageHeader
        title="Perfis e permissões"
        description="A matriz abaixo é carregada directamente do RBAC do Supabase."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {ROLE_ORDER.map((role) => {
          const meta = ROLE_META[role];
          return (
            <Card key={role} className="p-5">
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
                {loading
                  ? "—"
                  : (sets.get(role)?.size ?? 0) +
                    " permissão(ões) activa(s)"}
              </p>
            </Card>
          );
        })}
      </div>

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      <Card className="overflow-x-auto">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold">
            Matriz efectiva
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cada linha é uma permissão real do sistema. O visto indica
            que o perfil possui essa concessão no servidor.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            A carregar matriz...
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
                  <th key={role} className="px-5 py-4">
                    {ROLE_META[role].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => (
                <tr
                  className="border-t border-slate-100"
                  key={permission.id}
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
                    <td
                      key={role}
                      className="px-5 py-4 align-top"
                    >
                      {sets.get(role)?.has(permission.id) ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800">
          <Globe2 className="mr-2 inline h-4 w-4" />
          <b>Âmbito:</b> RBAC não substitui o isolamento territorial.
          RLS continua a limitar município e posto administrativo.
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          <ShieldCheck className="mr-2 inline h-4 w-4" />
          <b>Segurança:</b> para utilizadores municipais, uma
          permissão também depende de licença activa e do módulo
          autorizado pelo plano.
        </div>
      </div>
    </MobiGestShell>
  );
}
