import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";
import { createManagedUser, type ManagedUserRole } from "../../../lib/admin-users";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/super-admin/utilizadores/novo")({
  component: NovoUtilizadorGlobal,
});

type Municipality = {
  id: string;
  name: string;
  code: string;
  status: string;
};

type Post = {
  id: string;
  municipality_id: string;
  name: string;
  status: string;
};

const ROLE_OPTIONS: Array<{ value: ManagedUserRole; label: string }> = [
  { value: "admin_municipal", label: "Administrador Municipal" },
  { value: "tecnico", label: "Técnico" },
  { value: "fiscal", label: "Fiscal" },
  { value: "financeiro", label: "Financeiro" },
];

function NovoUtilizadorGlobal() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<ManagedUserRole>("admin_municipal");
  const [municipalityId, setMunicipalityId] = useState("");
  const [postId, setPostId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [municipalityResult, postResult] = await Promise.all([
        supabase
          .from("municipalities")
          .select("id, name, code, status")
          .order("name", { ascending: true }),
        supabase
          .from("administrative_posts")
          .select("id, municipality_id, name, status")
          .order("name", { ascending: true }),
      ]);

      if (!active) return;

      const error = municipalityResult.error ?? postResult.error;
      if (error) {
        console.error("Falha ao carregar âmbito dos utilizadores:", error);
        setLoadError("Não foi possível carregar os municípios e postos.");
        setLoading(false);
        return;
      }

      const municipalityData = (municipalityResult.data ?? []) as Municipality[];
      setMunicipalities(municipalityData);
      setPosts((postResult.data ?? []) as Post[]);

      const firstAvailable = municipalityData.find((item) => item.status !== "inactivo");
      if (firstAvailable) {
        setMunicipalityId(firstAvailable.id);
      }

      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const municipality = municipalities.find((item) => item.id === municipalityId) ?? null;

  const availablePosts = useMemo(
    () =>
      posts.filter(
        (post) =>
          post.municipality_id === municipalityId && post.status === "activo",
      ),
    [posts, municipalityId],
  );

  const changeMunicipality = (value: string) => {
    setMunicipalityId(value);
    setPostId("");
  };

  const canSubmit =
    !loading &&
    !creating &&
    Boolean(municipality) &&
    municipality?.status !== "inactivo" &&
    name.trim().length >= 3 &&
    email.includes("@");

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
      });

      setCreatedUserId(result.id ?? null);
    } catch (error) {
      console.error("Falha ao criar utilizador:", error);
      setCreateError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o utilizador.",
      );
    } finally {
      setCreating(false);
    }
  };

  if (createdUserId) {
    return (
      <SuperAdminShell
        title="Utilizador criado"
        subtitle="A identidade foi criada e o convite foi enviado."
      >
        <SuperCard className="mx-auto max-w-2xl p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 />
          </div>
          <h2 className="mt-5 text-2xl font-bold">{name}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {ROLE_OPTIONS.find((item) => item.value === role)?.label} · {municipality?.name}
          </p>
          <p className="mt-1 text-sm text-slate-500">{email}</p>
          <p className="mt-5 rounded-xl bg-sky-50 p-4 text-sm leading-6 text-sky-900">
            O utilizador recebeu um convite para definir a própria palavra-passe.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/super-admin/utilizadores"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
            >
              Voltar aos utilizadores
            </Link>
            <Link
              to="/super-admin/utilizadores/$id"
              params={{ id: createdUserId }}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Ver utilizador
            </Link>
          </div>
        </SuperCard>
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell
      title="Novo utilizador"
      subtitle="Criar uma conta institucional e definir o seu âmbito de acesso."
    >
      <Link
        to="/super-admin/utilizadores"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Utilizadores
      </Link>

      <SuperCard className="mx-auto max-w-4xl p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <UserPlus />
          </div>
          <div>
            <h2 className="text-xl font-bold">Dados da conta</h2>
            <p className="mt-1 text-sm text-slate-500">
              A identidade será criada no Supabase Auth; o perfil e o âmbito ficam registados no MobiGest.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="mt-7 text-sm text-slate-500">A carregar municípios e postos...</p>
        ) : loadError ? (
          <div className="mt-7 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {loadError}
          </div>
        ) : municipalities.length === 0 ? (
          <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Crie primeiro um município antes de criar utilizadores municipais.
          </div>
        ) : (
          <>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
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
                label="Contacto"
                value={phone}
                onChange={setPhone}
                placeholder="+258 ..."
              />

              <label className="text-sm font-medium">
                Perfil
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as ManagedUserRole)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"
                >
                  {ROLE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Município *
                <select
                  value={municipalityId}
                  onChange={(event) => changeMunicipality(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"
                >
                  {municipalities.map((item) => (
                    <option key={item.id} value={item.id} disabled={item.status === "inactivo"}>
                      {item.name} · {item.code}
                      {item.status === "inactivo" ? " (Inactivo)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Posto administrativo
                <select
                  value={postId}
                  onChange={(event) => setPostId(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"
                >
                  <option value="">Todos / não definido</option>
                  {availablePosts.map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
              <ShieldCheck className="mr-2 inline h-4 w-4" />
              <b>Segurança:</b> a palavra-passe não é definida pelo administrador. O utilizador
              recebe um convite e define a própria credencial. A criação e o âmbito ficam auditados.
            </div>

            {createError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {createError}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-6">
              <Link
                to="/super-admin/utilizadores"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
              >
                Cancelar
              </Link>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={submit}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Mail className="h-4 w-4" />
                {creating ? "A criar e convidar..." : "Criar e enviar convite"}
              </button>
            </div>
          </>
        )}
      </SuperCard>
    </SuperAdminShell>
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
