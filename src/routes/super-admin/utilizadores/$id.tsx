import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
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
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";
import {
  setManagedUserStatus,
  updateManagedUser,
  type ManagedUserRole,
} from "../../../lib/admin-users";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/super-admin/utilizadores/$id")({
  component: UtilizadorGlobal,
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
  status: string;
};

type Post = {
  id: string;
  municipality_id: string;
  name: string;
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

const MANAGED_ROLES: Array<{ value: ManagedUserRole; label: string }> = [
  { value: "admin_municipal", label: "Administrador Municipal" },
  { value: "tecnico", label: "Técnico" },
  { value: "fiscal", label: "Fiscal" },
  { value: "financeiro", label: "Financeiro" },
];

function UtilizadorGlobal() {
  const { id } = Route.useParams();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<ManagedUserRole>("tecnico");
  const [municipalityId, setMunicipalityId] = useState("");
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

      const [profileResult, municipalityResult, postResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, phone, role, status, municipality_id, administrative_post_id, created_at",
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("municipalities")
          .select("id, name, status")
          .order("name", { ascending: true }),
        supabase
          .from("administrative_posts")
          .select("id, municipality_id, name, status")
          .order("name", { ascending: true }),
      ]);

      if (!active) return;

      const error =
        profileResult.error ?? municipalityResult.error ?? postResult.error;

      if (error || !profileResult.data) {
        console.error("Falha ao carregar perfil:", error);
        setLoadError("Utilizador não encontrado ou sem acesso autorizado.");
        setLoading(false);
        return;
      }

      const profile = profileResult.data as UserDetail;
      setUser(profile);
      setMunicipalities((municipalityResult.data ?? []) as Municipality[]);
      setPosts((postResult.data ?? []) as Post[]);

      setFullName(profile.full_name);
      setPhone(profile.phone ?? "");
      if (profile.role !== "super_admin") {
        setRole(profile.role as ManagedUserRole);
      }
      setMunicipalityId(profile.municipality_id ?? "");
      setPostId(profile.administrative_post_id ?? "");

      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, refreshToken]);

  const municipality =
    municipalities.find((item) => item.id === user?.municipality_id)?.name ??
    (user?.municipality_id ? "Município não encontrado" : "Administração global");

  const post =
    posts.find((item) => item.id === user?.administrative_post_id)?.name ??
    (user?.administrative_post_id
      ? "Posto não encontrado"
      : user?.municipality_id
        ? "Todos os postos autorizados pelo perfil"
        : "Não aplicável");

  const availablePosts = useMemo(
    () =>
      posts.filter(
        (item) =>
          item.municipality_id === municipalityId && item.status === "activo",
      ),
    [posts, municipalityId],
  );

  const isManagedUser = Boolean(user && user.role !== "super_admin");

  const saveProfile = async () => {
    if (!user || !isManagedUser || !municipalityId || saving) return;

    setSaving(true);
    setEditError(null);

    try {
      await updateManagedUser({
        userId: user.id,
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        role,
        municipalityId,
        administrativePostId: postId || null,
      });

      setEditing(false);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao actualizar utilizador:", error);
      setEditError(
        error instanceof Error
          ? error.message
          : "Não foi possível actualizar o utilizador.",
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
      });

      setPendingStatus(null);
      setStatusReason("");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao alterar estado do utilizador:", error);
      setStatusError(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o estado do utilizador.",
      );
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <SuperAdminShell
      title="Detalhe do utilizador"
      subtitle="Conta, vínculo institucional e âmbito de acesso."
    >
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Link
          to="/super-admin/utilizadores"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" /> Utilizadores
        </Link>

        {isManagedUser && !loading && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing((value) => !value);
                setEditError(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
            >
              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {editing ? "Cancelar edição" : "Editar perfil"}
            </button>

            {user?.status !== "activo" && (
              <button
                type="button"
                onClick={() => setPendingStatus("activo")}
                className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Reactivar
              </button>
            )}

            {user?.status === "activo" && (
              <button
                type="button"
                onClick={() => setPendingStatus("suspenso")}
                className="rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50"
              >
                Suspender
              </button>
            )}

            {user?.status !== "inactivo" && (
              <button
                type="button"
                onClick={() => setPendingStatus("inactivo")}
                className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                Inactivar
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <SuperCard className="p-8 text-sm text-slate-500">
          A carregar utilizador...
        </SuperCard>
      ) : loadError || !user ? (
        <SuperCard className="p-8">
          <p className="text-sm font-semibold text-red-700">
            {loadError ?? "Utilizador não encontrado."}
          </p>
        </SuperCard>
      ) : (
        <>
          {pendingStatus && (
            <SuperCard className="mb-6 border-amber-200 p-6">
              <h3 className="font-semibold">
                Confirmar alteração para {STATUS_LABELS[pendingStatus]}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                O motivo é obrigatório e será registado na auditoria.
              </p>
              <textarea
                value={statusReason}
                onChange={(event) => setStatusReason(event.target.value)}
                rows={3}
                placeholder="Explique o motivo da alteração..."
                className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
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
            </SuperCard>
          )}

          {editing && (
            <SuperCard className="mb-6 p-6">
              <h3 className="font-semibold">Editar perfil e âmbito</h3>
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
                    {MANAGED_ROLES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Município
                  <select
                    value={municipalityId}
                    onChange={(event) => {
                      setMunicipalityId(event.target.value);
                      setPostId("");
                    }}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                  >
                    {municipalities.map((item) => (
                      <option key={item.id} value={item.id} disabled={item.status === "inactivo"}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium md:col-span-2">
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
                  disabled={
                    saving ||
                    fullName.trim().length < 3 ||
                    !municipalityId
                  }
                  onClick={saveProfile}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "A guardar..." : "Guardar alterações"}
                </button>
              </div>
            </SuperCard>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <SuperCard className="p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <UserRound className="h-7 w-7 text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Utilizador
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">{user.full_name}</h2>
                  <p className="mt-1 break-all text-xs text-slate-400">ID: {user.id}</p>
                </div>
                <StatusBadge status={user.status} />
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
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
                <Info icon={<MapPin />} label="Município" value={municipality} />
                <Info icon={<MapPin />} label="Posto administrativo" value={post} />
                <Info
                  icon={<CalendarDays />}
                  label="Perfil criado"
                  value={new Date(user.created_at).toLocaleString("pt-MZ")}
                />
                <Info
                  icon={<KeyRound />}
                  label="Autenticação"
                  value="Supabase Auth"
                />
              </div>
            </SuperCard>

            <SuperCard className="p-6">
              <h3 className="font-semibold">Âmbito de acesso</h3>
              <div className="mt-4 space-y-2">
                <State label="Perfil" value={ROLE_LABELS[user.role] ?? user.role} />
                <State label="Município" value={municipality} />
                <State label="Posto" value={post} />
                <State label="Estado" value={STATUS_LABELS[user.status] ?? user.status} />
              </div>

              <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-xs leading-5 text-sky-900">
                <b>RBAC + RLS:</b> o perfil define as operações permitidas e o âmbito
                territorial limita os dados acessíveis.
              </div>
            </SuperCard>
          </div>

          {user.role === "super_admin" && (
            <SuperCard className="mt-6 p-6">
              <h3 className="font-semibold">Conta de controlo global</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                O Super Administrador inicial não pode ser editado, suspenso ou inactivado
                por este fluxo. Alterações a uma conta global exigem um procedimento de
                recuperação administrativa separado.
              </p>
            </SuperCard>
          )}
        </>
      )}
    </SuperAdminShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "activo"
      ? "bg-emerald-50 text-emerald-700"
      : status === "suspenso"
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";

  return (
    <span className={"w-fit rounded-full px-3 py-1 text-xs font-semibold " + className}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function State({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      {icon && <span className="text-slate-500">{icon}</span>}
      <p className="mt-1 text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-700">{value}</p>
    </div>
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
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"
      />
    </label>
  );
}
