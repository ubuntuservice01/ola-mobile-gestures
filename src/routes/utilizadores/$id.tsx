import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  KeyRound,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import {
  setManagedUserStatus,
  updateManagedUser,
  type ManagedUserRole,
} from "../../lib/admin-users";
import { loadAccessProfile } from "../../lib/access-control";
import {
  loadCurrentMunicipalAccess,
  type MunicipalAccessSession,
} from "../../lib/municipal-access";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/utilizadores/$id")({
  component: UtilizadorDetalhe,
});

type UserDetail = {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  status: string;
  municipality_id: string | null;
  administrative_post_id: string | null;
  created_at: string;
};

type Municipality = {
  id: string;
  name: string;
};

type Post = {
  id: string;
  municipality_id: string;
  name: string;
  status: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin_municipal: "Administrador Municipal",
  tecnico: "Técnico",
  fiscal: "Fiscal",
  financeiro: "Financeiro",
};

const ROLE_OPTIONS: Array<{ value: ManagedUserRole; label: string }> = [
  { value: "tecnico", label: "Técnico" },
  { value: "fiscal", label: "Fiscal" },
  { value: "financeiro", label: "Financeiro" },
];

function UtilizadorDetalhe() {
  const { id } = Route.useParams();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [municipality, setMunicipality] = useState<Municipality | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [accessSession, setAccessSession] =
    useState<MunicipalAccessSession | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<ManagedUserRole>("tecnico");
  const [postId, setPostId] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [pendingStatus, setPendingStatus] = useState<
    "activo" | "suspenso" | "inactivo" | null
  >(null);
  const [statusReason, setStatusReason] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!active) return;

      const authUser = session?.user ?? null;

      if (sessionError || !authUser) {
        setLoadError("A sua sessão terminou. Entre novamente para continuar.");
        setLoading(false);
        return;
      }

      const actor = await loadAccessProfile(authUser.id);

      if (!active) return;

      if (!actor) {
        setLoadError("Perfil do utilizador actual não encontrado.");
        setLoading(false);
        return;
      }

      let currentAccess: MunicipalAccessSession | null = null;
      let managementAllowed = actor.role === "admin_municipal";

      if (actor.role === "super_admin") {
        currentAccess = await loadCurrentMunicipalAccess();
        if (!active) return;
        managementAllowed = currentAccess?.access_mode === "assistencia";
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, phone, role, status, municipality_id, administrative_post_id, created_at",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (profileError || !profileData) {
        console.error("Falha ao carregar utilizador municipal:", profileError);
        setLoadError("Utilizador não encontrado ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      const target = profileData as UserDetail;

      const [municipalityResult, postResult] = await Promise.all([
        target.municipality_id
          ? supabase
              .from("municipalities")
              .select("id, name")
              .eq("id", target.municipality_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        target.municipality_id
          ? supabase
              .from("administrative_posts")
              .select("id, municipality_id, name, status")
              .eq("municipality_id", target.municipality_id)
              .order("name", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!active) return;

      const error = municipalityResult.error ?? postResult.error;
      if (error) {
        console.error("Falha ao carregar âmbito do utilizador:", error);
        setLoadError("O utilizador foi encontrado, mas o âmbito não pôde ser carregado.");
        setLoading(false);
        return;
      }

      setUser(target);
      setMunicipality(municipalityResult.data as Municipality | null);
      setPosts((postResult.data ?? []) as Post[]);
      setAccessSession(currentAccess);

      // Admin Municipal não pode alterar outro Administrador Municipal.
      if (actor.role === "admin_municipal" && target.role === "admin_municipal") {
        managementAllowed = false;
      }

      setCanManage(managementAllowed);

      setFullName(target.full_name);
      setPhone(target.phone ?? "");
      if (target.role !== "admin_municipal") {
        setRole(target.role as ManagedUserRole);
      }
      setPostId(target.administrative_post_id ?? "");
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, refreshToken]);

  const availablePosts = useMemo(
    () => posts.filter((item) => item.status === "activo"),
    [posts],
  );

  const save = async () => {
    if (!user || !user.municipality_id || !canManage || saving) return;

    setSaving(true);
    setEditError(null);

    try {
      await updateManagedUser({
        userId: user.id,
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        role,
        municipalityId: user.municipality_id,
        administrativePostId: postId || null,
        accessSessionId: accessSession?.session_id ?? null,
      });

      setEditing(false);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao actualizar utilizador municipal:", error);
      setEditError(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar as alterações.",
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!user || !pendingStatus || statusReason.trim().length < 4) return;

    setChangingStatus(true);
    setStatusError(null);

    try {
      await setManagedUserStatus({
        userId: user.id,
        status: pendingStatus,
        reason: statusReason.trim(),
        accessSessionId: accessSession?.session_id ?? null,
      });

      setPendingStatus(null);
      setStatusReason("");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao alterar estado do utilizador:", error);
      setStatusError(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o estado.",
      );
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <MobiGestShell title="Detalhe do utilizador">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <Link
            to="/utilizadores"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar aos utilizadores
          </Link>

          {canManage && user && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing((value) => !value);
                  setEditError(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
              >
                {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {editing ? "Cancelar edição" : "Editar"}
              </button>

              {user.status !== "activo" && (
                <button
                  type="button"
                  onClick={() => setPendingStatus("activo")}
                  className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700"
                >
                  Reactivar
                </button>
              )}

              {user.status === "activo" && (
                <button
                  type="button"
                  onClick={() => setPendingStatus("suspenso")}
                  className="rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-700"
                >
                  Suspender
                </button>
              )}

              {user.status !== "inactivo" && (
                <button
                  type="button"
                  onClick={() => setPendingStatus("inactivo")}
                  className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700"
                >
                  Inactivar
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <Card className="p-8 text-sm text-slate-500">A carregar utilizador...</Card>
        ) : loadError || !user ? (
          <Card className="p-8 text-sm font-medium text-red-700">
            {loadError ?? "Utilizador não encontrado."}
          </Card>
        ) : (
          <>
            {pendingStatus && (
              <Card className="mb-6 border-amber-200 p-6">
                <h3 className="font-semibold">
                  Confirmar alteração para{" "}
                  {pendingStatus === "activo"
                    ? "Activo"
                    : pendingStatus === "suspenso"
                      ? "Suspenso"
                      : "Inactivo"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Indique o motivo. A alteração ficará registada na auditoria.
                </p>
                <textarea
                  value={statusReason}
                  onChange={(event) => setStatusReason(event.target.value)}
                  rows={3}
                  className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Motivo da alteração..."
                />
                {statusError && (
                  <p className="mt-3 text-sm font-medium text-red-700">{statusError}</p>
                )}
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={statusReason.trim().length < 4 || changingStatus}
                    onClick={changeStatus}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {changingStatus ? "A processar..." : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    disabled={changingStatus}
                    onClick={() => {
                      setPendingStatus(null);
                      setStatusReason("");
                      setStatusError(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </Card>
            )}

            {editing && (
              <Card className="mb-6 p-6">
                <h3 className="font-semibold">Editar perfil municipal</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="Nome completo" value={fullName} onChange={setFullName} />
                  <Field label="Contacto" value={phone} onChange={setPhone} />

                  <label className="text-sm font-medium">
                    Perfil
                    <select
                      value={role}
                      onChange={(event) => setRole(event.target.value as ManagedUserRole)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                    >
                      {ROLE_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium">
                    Posto administrativo
                    <select
                      value={postId}
                      onChange={(event) => setPostId(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                    >
                      <option value="">Todos / não definido</option>
                      {availablePosts.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {editError && (
                  <p className="mt-4 text-sm font-medium text-red-700">{editError}</p>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    disabled={saving || fullName.trim().length < 3}
                    onClick={save}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "A guardar..." : "Guardar alterações"}
                  </button>
                </div>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-6 lg:col-span-2">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <UserRound className="h-7 w-7 text-slate-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold">{user.full_name}</h2>
                    <p className="text-sm text-slate-500">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </p>
                  </div>
                  <span
                    className={
                      "rounded-full px-3 py-1 text-xs font-semibold " +
                      (user.status === "activo"
                        ? "bg-emerald-50 text-emerald-700"
                        : user.status === "suspenso"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700")
                    }
                  >
                    {user.status === "activo"
                      ? "Activo"
                      : user.status === "suspenso"
                        ? "Suspenso"
                        : "Inactivo"}
                  </span>
                </div>

                <div className="mt-7 grid gap-4 md:grid-cols-2">
                  <Info
                    icon={<Phone />}
                    label="Contacto"
                    value={user.phone || "Não registado"}
                  />
                  <Info
                    icon={<ShieldCheck />}
                    label="Perfil"
                    value={ROLE_LABELS[user.role] ?? user.role}
                  />
                  <Info
                    icon={<MapPin />}
                    label="Município"
                    value={municipality?.name ?? "—"}
                  />
                  <Info
                    icon={<MapPin />}
                    label="Posto"
                    value={
                      posts.find((item) => item.id === user.administrative_post_id)?.name ??
                      "Todos / não definido"
                    }
                  />
                  <Info
                    icon={<KeyRound />}
                    label="Autenticação"
                    value="Supabase Auth"
                  />
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold">Segurança</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <State label="Estado" value={user.status} />
                  <State label="RLS" value="Activo" />
                  <State label="Auditoria" value="Obrigatória" />
                  <State
                    label="Gestão"
                    value={canManage ? "Autorizada" : "Apenas consulta"}
                  />
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </MobiGestShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
      />
    </label>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
      <span className="text-slate-500">{icon}</span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function State({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
