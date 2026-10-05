import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { createManagedUser, type ManagedUserRole } from "../../lib/admin-users";
import { loadAccessProfile } from "../../lib/access-control";
import { loadCurrentMunicipalAccess, type MunicipalAccessSession } from "../../lib/municipal-access";
import { supabase } from "../../lib/supabase";
import {
  LoadingButton,
  SkeletonCard,
  notify,
} from "../../components/mobigest/Experience";
import { formatDateTime } from "../../lib/format";

export const Route = createFileRoute("/utilizadores/novo")({
  component: NovoUtilizador,
});

type Municipality = {
  id: string;
  name: string;
  code: string;
  status: string;
};

type Post = {
  id: string;
  name: string;
  status: string;
};

const ROLE_OPTIONS: Array<{ value: ManagedUserRole; label: string }> = [
  { value: "tecnico", label: "Técnico" },
  { value: "fiscal", label: "Fiscal" },
  { value: "financeiro", label: "Financeiro" },
];

function NovoUtilizador() {
  const [municipality, setMunicipality] = useState<Municipality | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [superAdminAccess, setSuperAdminAccess] =
    useState<MunicipalAccessSession | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<ManagedUserRole>("tecnico");
  const [postId, setPostId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [activationExpiresAt, setActivationExpiresAt] = useState<string | null>(null);

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

      const user = session?.user ?? null;

      if (sessionError || !user) {
        setLoadError("A sua sessão terminou. Entre novamente para continuar.");
        setLoading(false);
        return;
      }

      const profile = await loadAccessProfile(user.id);

      if (!active) return;

      if (!profile) {
        setLoadError("Perfil MobiGest não encontrado.");
        setLoading(false);
        return;
      }

      let municipalityId: string | null = null;
      let accessSession: MunicipalAccessSession | null = null;

      if (profile.role === "admin_municipal") {
        municipalityId = profile.municipality_id;
        setAuthorized(Boolean(municipalityId));
      } else if (profile.role === "super_admin") {
        accessSession = await loadCurrentMunicipalAccess();
        municipalityId = accessSession?.municipality_id ?? null;
        setSuperAdminAccess(accessSession);
        setAuthorized(accessSession?.access_mode === "assistencia");
      } else {
        setAuthorized(false);
      }

      if (!municipalityId) {
        setLoadError("Esta conta não possui um contexto municipal autorizado.");
        setLoading(false);
        return;
      }

      const [municipalityResult, postResult] = await Promise.all([
        supabase
          .from("municipalities")
          .select("id, name, code, status")
          .eq("id", municipalityId)
          .maybeSingle(),
        supabase
          .from("administrative_posts")
          .select("id, name, status")
          .eq("municipality_id", municipalityId)
          .order("name", { ascending: true }),
      ]);

      if (!active) return;

      const error = municipalityResult.error ?? postResult.error;
      if (error || !municipalityResult.data) {
        console.error("Falha ao carregar contexto municipal:", error);
        setLoadError("Não foi possível carregar o município e os postos.");
        setLoading(false);
        return;
      }

      setMunicipality(municipalityResult.data as Municipality);
      setPosts((postResult.data ?? []) as Post[]);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const canSubmit =
    authorized &&
    Boolean(municipality) &&
    municipality?.status !== "inactivo" &&
    name.trim().length >= 3 &&
    email.includes("@") &&
    !creating;

  const submit = async () => {
    if (!municipality || !canSubmit) return;

    setCreating(true);
    setCreateError(null);

    try {
      const result = await createManagedUser({
        email: email.trim(),
        fullName: name.trim(),
        phone: phone.trim() || null,
        role,
        municipalityId: municipality.id,
        administrativePostId: postId || null,
        accessSessionId: superAdminAccess?.session_id ?? null,
      });

      setCreatedUserId(result.id ?? null);
      setActivationCode(result.activationCode ?? null);
      setActivationExpiresAt(result.activationExpiresAt ?? null);
      notify.success("Utilizador criado", "O código de activação foi gerado com sucesso.");
    } catch (error) {
      console.error("Falha ao criar utilizador municipal:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível criar o utilizador.";
      setCreateError(message);
      notify.error("Não foi possível criar o utilizador", message);
    } finally {
      setCreating(false);
    }
  };

  if (createdUserId) {
    return (
      <MobiGestShell
        title="Utilizador criado"
        subtitle="A conta foi criada e o código de activação foi gerado."
      >
        <Card className="mx-auto max-w-2xl p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-bold">{name}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {ROLE_OPTIONS.find((item) => item.value === role)?.label} · {municipality?.name}
          </p>
          <p className="mt-1 text-sm text-slate-500">{email}</p>
          <div className="mt-5 rounded-xl bg-sky-50 p-5 text-left text-sm leading-6 text-sky-900">
            <p className="font-semibold">Código de activação</p>
            <p className="mt-2 font-mono text-2xl font-bold tracking-[0.16em] text-slate-950">
              {activationCode ?? "—"}
            </p>
            <p className="mt-3">
              Entregue este código ao utilizador. Ele deve abrir <b>Activar conta</b>,
              informar o email e escolher a própria palavra-passe.
            </p>
            {activationExpiresAt && (
              <p className="mt-2 text-xs text-sky-700">
                Validade: {formatDateTime(activationExpiresAt)}
              </p>
            )}
          </div>
          <Link
            to="/utilizadores"
            className="mt-7 inline-flex rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Voltar aos utilizadores
          </Link>
        </Card>
      </MobiGestShell>
    );
  }

  return (
    <MobiGestShell
      title="Novo utilizador"
      subtitle="Criar uma conta autorizada para o município actual."
    >
      <Link
        to="/utilizadores"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Utilizadores
      </Link>

      <Card className="mx-auto max-w-4xl p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <ShieldCheck />
          </div>
          <div>
            <h2 className="text-xl font-bold">Criar utilizador municipal</h2>
            <p className="mt-1 text-sm text-slate-500">
              Apenas perfis operacionais podem ser criados nesta área.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : loadError ? (
          <div className="mt-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {loadError}
          </div>
        ) : !authorized ? (
          <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Esta conta não está autorizada a criar utilizadores. O Super Admin precisa de uma sessão
            em modo <b>Assistência</b>; os outros perfis dependem da função Administrador Municipal.
          </div>
        ) : (
          <>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <Field
                label="Nome completo *"
                value={name}
                onChange={setName}
                placeholder="Nome completo"
              />
              <Field
                label="Email *"
                value={email}
                onChange={setEmail}
                placeholder="utilizador@municipio.gov.mz"
                type="email"
              />
              <Field
                label="Telefone"
                value={phone}
                onChange={setPhone}
                placeholder="+258 ..."
              />

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

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Município</p>
                <p className="mt-1 text-sm font-semibold">{municipality?.name}</p>
                <p className="mt-1 text-xs text-slate-500">Código {municipality?.code}</p>
              </div>

              <label className="text-sm font-medium">
                Posto administrativo
                <select
                  value={postId}
                  onChange={(event) => setPostId(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                >
                  <option value="">Todos / não definido</option>
                  {posts
                    .filter((post) => post.status === "activo")
                    .map((post) => (
                      <option key={post.id} value={post.id}>
                        {post.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              <b>Regra de âmbito:</b> a conta será vinculada apenas a {municipality?.name}.
              O sistema gera um código temporário de uso único. O utilizador activa a conta e define
              a própria palavra-passe no primeiro acesso.
            </div>

            {createError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {createError}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3">
              <Link
                to="/utilizadores"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
              >
                Cancelar
              </Link>
              <LoadingButton
                onClick={submit}
                disabled={!canSubmit}
                state={creating ? "loading" : "idle"}
                idleLabel="Criar utilizador e gerar código"
                loadingLabel="A criar e gerar código..."
                icon={<KeyRound className="h-4 w-4" />}
                className="bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40"
              />
            </div>
          </>
        )}
      </Card>
    </MobiGestShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"
      />
    </label>
  );
}
