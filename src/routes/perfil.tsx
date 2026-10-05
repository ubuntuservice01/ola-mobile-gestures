import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Card, MobiGestShell } from "../components/MobiGestShell";
import {
  ROLE_META,
  actionLabel,
  loadRbac,
  moduleLabel,
  permissionCodeSet,
  type PermissionRow,
  type RoleCode,
} from "../lib/permissions";
import { supabase } from "../lib/supabase";
import {
  LoadingButton,
  NetworkErrorState,
  SkeletonCard,
  StatusBadge,
  notify,
  type LoadingButtonState,
} from "../components/mobigest/Experience";
import { formatDate } from "../lib/format";
import { useSessionDraft } from "../hooks/use-session-draft";

export const Route = createFileRoute("/perfil")({
  component: PerfilPage,
});

type ProfileView = {
  id: string;
  full_name: string;
  phone: string | null;
  role: RoleCode;
  status: string;
  municipality_id: string | null;
  administrative_post_id: string | null;
  created_at: string;
  municipality_name: string | null;
  post_name: string | null;
  email: string;
};

function PerfilPage() {
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveState, setProfileSaveState] = useState<LoadingButtonState>("idle");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordState, setPasswordState] = useState<LoadingButtonState>("idle");
  const [reloadKey, setReloadKey] = useState(0);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profileDraft = useSessionDraft({
    key: "perfil:dados-pessoais",
    value: { fullName, phone },
    restore: (draft) => {
      setFullName(draft.fullName ?? "");
      setPhone(draft.phone ?? "");
      notify.info("Rascunho recuperado automaticamente.");
    },
    isMeaningful: (draft) =>
      Boolean(
        profile &&
          (draft.fullName !== profile.full_name ||
            draft.phone !== (profile.phone ?? "")),
      ),
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("Sessão inválida.");
        }

        const profileResult = await supabase
          .from("profiles")
          .select(
            "id, full_name, phone, role, status, municipality_id, administrative_post_id, created_at",
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileResult.error || !profileResult.data) {
          throw new Error(
            profileResult.error?.message || "Perfil MobiGest não encontrado.",
          );
        }

        const role = profileResult.data.role as RoleCode;

        const [municipalityResult, postResult, rbac] = await Promise.all([
          profileResult.data.municipality_id
            ? supabase
                .from("municipalities")
                .select("name")
                .eq("id", profileResult.data.municipality_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          profileResult.data.administrative_post_id
            ? supabase
                .from("administrative_posts")
                .select("name")
                .eq("id", profileResult.data.administrative_post_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          loadRbac(),
        ]);

        if (!active) return;

        const allowedCodes = permissionCodeSet(
          rbac.permissions,
          rbac.rolePermissions,
          role,
        );

        setPermissions(
          rbac.permissions.filter((permission) =>
            allowedCodes.has(permission.code),
          ),
        );

        const nextProfile: ProfileView = {
          id: profileResult.data.id,
          full_name: profileResult.data.full_name,
          phone: profileResult.data.phone,
          role,
          status: profileResult.data.status,
          municipality_id: profileResult.data.municipality_id,
          administrative_post_id:
            profileResult.data.administrative_post_id,
          created_at: profileResult.data.created_at,
          municipality_name:
            municipalityResult.data?.name ?? null,
          post_name: postResult.data?.name ?? null,
          email: user.email ?? "",
        };

        setProfile(nextProfile);
        if (!profileDraft.hasStoredDraft) {
          setFullName(nextProfile.full_name);
          setPhone(nextProfile.phone ?? "");
        }
      } catch (error) {
        if (!active) return;
        console.error("Falha ao carregar perfil:", error);
        setErrorMessage(
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
  }, [reloadKey]);

  const permissionsByModule = useMemo(() => {
    const grouped = new Map<string, PermissionRow[]>();

    for (const permission of permissions) {
      const current = grouped.get(permission.module) ?? [];
      current.push(permission);
      grouped.set(permission.module, current);
    }

    return [...grouped.entries()].sort(([a], [b]) =>
      moduleLabel(a).localeCompare(moduleLabel(b), "pt"),
    );
  }, [permissions]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) return;

    const normalizedName = fullName.trim();
    const normalizedPhone = phone.trim();

    if (normalizedName.length < 3) {
      setProfileMessage("Introduza um nome válido.");
      return;
    }

    setSavingProfile(true);
    setProfileSaveState("loading");
    setProfileMessage(null);
    setErrorMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: normalizedName,
        phone: normalizedPhone || null,
      })
      .eq("id", profile.id);

    if (error) {
      console.error("Falha ao actualizar perfil:", error);
      const message =
        error.message || "Não foi possível actualizar os dados.";
      setProfileMessage(message);
      setProfileSaveState("error");
      notify.error("Não foi possível guardar os dados", message);
      setSavingProfile(false);
      return;
    }

    setProfile((current) =>
      current
        ? {
            ...current,
            full_name: normalizedName,
            phone: normalizedPhone || null,
          }
        : current,
    );
    setProfileMessage("Dados pessoais actualizados com sucesso.");
    setProfileSaveState("success");
    notify.success("Dados pessoais actualizados");
    setSavingProfile(false);
    window.setTimeout(() => setProfileSaveState("idle"), 1600);
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage(null);

    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setPasswordMessage(
        "A palavra-passe deve ter pelo menos 8 caracteres, incluindo letras e números.",
      );
      return;
    }

    if (password !== passwordConfirmation) {
      setPasswordMessage("As palavras-passe não coincidem.");
      return;
    }

    setChangingPassword(true);
    setPasswordState("loading");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error("Falha ao alterar palavra-passe:", error);
      const message =
        error.message || "Não foi possível alterar a palavra-passe.";
      setPasswordMessage(message);
      setPasswordState("error");
      notify.error("Não foi possível alterar a palavra-passe", message);
      setChangingPassword(false);
      return;
    }

    setPasswordState("success");
    notify.success("Palavra-passe alterada");
    await supabase.auth.signOut({ scope: "local" });
    window.location.replace("/login?reason=password_changed");
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    window.location.replace("/login");
  };

  if (loading) {
    return (
      <MobiGestShell
        title="Meu Perfil"
        subtitle="A carregar dados da sua conta..."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </MobiGestShell>
    );
  }

  if (!profile) {
    return (
      <MobiGestShell
        title="Meu Perfil"
        subtitle="Conta, identidade e permissões."
      >
        <NetworkErrorState
          message={errorMessage ?? "Não foi possível carregar o seu perfil."}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      </MobiGestShell>
    );
  }

  const roleMeta = ROLE_META[profile.role];

  return (
    <MobiGestShell
      title="Meu Perfil"
      subtitle="Dados pessoais, enquadramento institucional, segurança e permissões da sua conta."
    >
      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-bold text-white">
              {initials(profile.full_name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Conta MobiGest
              </p>
              <h2 className="mt-1 truncate text-2xl font-bold text-slate-950">
                {profile.full_name}
              </h2>
              <p className="mt-1 text-sm font-medium text-sky-600">
                {roleMeta.name}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={profile.status} />
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {roleMeta.scope}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            Segurança da conta
          </p>
          <div className="mt-4 flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-semibold">Sessão autenticada</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Alterações de função, município, posto e estado são protegidas
                e não podem ser feitas pelo próprio utilizador.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-sky-600" />
            <div>
              <h3 className="font-bold">Dados pessoais</h3>
              <p className="mt-1 text-sm text-slate-500">
                Pode actualizar o seu nome e contacto.
              </p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="mt-6 space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              Nome completo
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Contacto
              <div className="relative mt-2">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className={iconInputClass}
                  placeholder="84 / 85 / 86 / 87..."
                />
              </div>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Email de acesso
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  className={iconReadOnlyClass}
                />
              </div>
            </label>

            {profileMessage && (
              <div
                className={
                  "rounded-xl p-3 text-sm font-medium " +
                  (profileMessage.includes("sucesso")
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700")
                }
              >
                {profileMessage}
              </div>
            )}

            <LoadingButton
              type="submit"
              state={profileSaveState}
              idleLabel="Guardar dados pessoais"
              loadingLabel="A guardar..."
              successLabel="Dados guardados"
              errorLabel="Tentar novamente"
              icon={<Save className="h-4 w-4" />}
              className="bg-sky-600 text-white hover:bg-sky-700"
            />
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-sky-600" />
            <div>
              <h3 className="font-bold">Enquadramento institucional</h3>
              <p className="mt-1 text-sm text-slate-500">
                Estes campos são definidos pela administração.
              </p>
            </div>
          </div>

          <dl className="mt-6 divide-y divide-slate-100">
            <ReadOnlyRow
              icon={<ShieldCheck />}
              label="Função"
              value={roleMeta.name}
            />
            <ReadOnlyRow
              icon={<Building2 />}
              label="Município"
              value={profile.municipality_name ?? "Administração global"}
            />
            <ReadOnlyRow
              icon={<MapPin />}
              label="Posto administrativo"
              value={profile.post_name ?? "Todos / não definido"}
            />
            <ReadOnlyRow
              icon={<CheckCircle2 />}
              label="Estado da conta"
              value={profile.status === "activo" ? "Activo" : profile.status === "suspenso" ? "Suspenso" : "Inactivo"}
            />
            <ReadOnlyRow
              icon={<KeyRound />}
              label="Conta criada"
              value={formatDate(profile.created_at)}
            />
          </dl>

          {profile.role === "admin_municipal" && (
            <Link
              to="/meu-municipio"
              className="mt-6 inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Abrir Meu Município
            </Link>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-sky-600" />
            <div>
              <h3 className="font-bold">As minhas permissões</h3>
              <p className="mt-1 text-sm text-slate-500">
                Permissões efectivas do perfil {roleMeta.name}.
              </p>
            </div>
          </div>

          {permissionsByModule.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              Nenhuma permissão disponível para apresentar.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {permissionsByModule.map(([module, modulePermissions]) => (
                <div
                  key={module}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="text-sm font-semibold">
                    {moduleLabel(module)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {modulePermissions.map((permission) => (
                      <span
                        key={permission.id}
                        title={permission.description ?? permission.code}
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                      >
                        {actionLabel(permission.action)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-sky-600" />
            <div>
              <h3 className="font-bold">Alterar palavra-passe</h3>
              <p className="mt-1 text-sm text-slate-500">
                Depois da alteração, terá de iniciar sessão novamente.
              </p>
            </div>
          </div>

          <form onSubmit={changePassword} className="mt-6 space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              Nova palavra-passe
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
                placeholder="Mínimo 8 caracteres"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Confirmar palavra-passe
              <input
                type="password"
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
                className={inputClass}
              />
            </label>

            {passwordMessage && (
              <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                {passwordMessage}
              </div>
            )}

            <LoadingButton
              type="submit"
              state={passwordState}
              idleLabel="Alterar palavra-passe"
              loadingLabel="A alterar..."
              successLabel="Palavra-passe alterada"
              errorLabel="Tentar novamente"
              icon={<KeyRound className="h-4 w-4" />}
              className="bg-slate-900 text-white hover:bg-slate-800"
            />
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Terminar sessão
            </button>
          </div>
        </Card>
      </div>
    </MobiGestShell>
  );
}

const inputClass =
  "mobigest-input mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10";

const iconInputClass =
  "mobigest-input h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10";

const iconReadOnlyClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-500 outline-none";

function ReadOnlyRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 py-4 first:pt-0">
      <span className="mt-0.5 text-sky-600">{icon}</span>
      <div>
        <dt className="text-xs text-slate-400">{label}</dt>
        <dd className="mt-1 text-sm font-semibold text-slate-800">
          {value}
        </dd>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
