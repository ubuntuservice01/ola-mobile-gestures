import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  SuperAdminShell,
  SuperCard,
} from "../../../components/SuperAdminShell";
import {
  actionLabel,
  loadRbac,
  moduleLabel,
  permissionSet,
  roleFromSlug,
  ROLE_META,
  type PermissionRow,
  type RolePermissionRow,
} from "../../../lib/permissions";

export const Route = createFileRoute("/super-admin/permissoes/$perfil")({
  component: PerfilDetalhe,
});

function PerfilDetalhe() {
  const { perfil } = Route.useParams();
  const role = roleFromSlug(perfil);

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
        console.error("Falha ao carregar perfil RBAC:", error);
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o perfil.",
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

  const allowed = useMemo(
    () =>
      role
        ? permissionSet(rolePermissions, role)
        : new Set<string>(),
    [rolePermissions, role],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();

    for (const permission of permissions) {
      if (!allowed.has(permission.id)) continue;
      const current = map.get(permission.module) ?? [];
      current.push(permission);
      map.set(permission.module, current);
    }

    return [...map.entries()].sort(([a], [b]) =>
      moduleLabel(a).localeCompare(moduleLabel(b)),
    );
  }, [permissions, allowed]);

  if (!role) {
    return (
      <SuperAdminShell
        title="Perfil não encontrado"
        subtitle="O perfil solicitado não existe no modelo RBAC."
      >
        <Link
          to="/super-admin/permissoes"
          className="inline-flex items-center gap-2 text-sm text-sky-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar às permissões
        </Link>
      </SuperAdminShell>
    );
  }

  const meta = ROLE_META[role];

  return (
    <SuperAdminShell
      title={meta.name}
      subtitle="Detalhe das permissões efectivamente concedidas no servidor."
    >
      <Link
        to="/super-admin/permissoes"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Perfis e permissões
      </Link>

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <SuperCard className="p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <ShieldCheck />
          </div>

          <h2 className="mt-5 text-2xl font-bold">{meta.name}</h2>
          <p className="mt-2 text-sm font-semibold text-sky-700">
            {meta.scope}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {meta.description}
          </p>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <LockKeyhole className="mr-2 inline h-4 w-4 text-slate-500" />
            <b>Âmbito:</b> a permissão concede uma operação, mas RLS,
            município/posto, sessão municipal e licença continuam a
            limitar onde essa operação pode ser executada.
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">
              Permissões activas
            </p>
            <p className="mt-1 text-2xl font-bold">
              {loading ? "—" : allowed.size}
            </p>
          </div>
        </SuperCard>

        <SuperCard className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <h3 className="font-semibold">Operações permitidas</h3>
            <p className="mt-1 text-xs text-slate-500">
              Lidas directamente de role_permissions.
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              A carregar permissões...
            </div>
          ) : grouped.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Este perfil não possui permissões activas.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {grouped.map(([module, rows]) => (
                <div
                  key={module}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_2fr]"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {moduleLabel(module)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {module}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {rows.map((permission) => (
                      <span
                        key={permission.id}
                        title={permission.code}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                      >
                        <Check className="h-3 w-3" />
                        {actionLabel(permission.action)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SuperCard>
      </div>

      <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
        <b>Aplicação actual:</b> estas permissões já participam no
        mecanismo de autorização do Supabase. Para utilizadores
        municipais, o servidor também verifica licença activa e módulo
        contratado.
      </div>
    </SuperAdminShell>
  );
}
