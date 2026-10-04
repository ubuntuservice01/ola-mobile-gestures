import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  MapPin,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../../../../components/SuperAdminShell";
import { createManagedUser } from "../../../../../lib/admin-users";
import { supabase } from "../../../../../lib/supabase";

export const Route = createFileRoute("/super-admin/municipios/$id/administrador/novo")({
  component: NovoAdministradorMunicipal,
});

type Municipality = {
  id: string;
  name: string;
  code: string;
  province: string;
  status: string;
};

type Post = {
  id: string;
  name: string;
  status: string;
};

function NovoAdministradorMunicipal() {
  const { id } = Route.useParams();
  const [municipality, setMunicipality] = useState<Municipality | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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

      const [municipalityResult, postsResult] = await Promise.all([
        supabase
          .from("municipalities")
          .select("id, name, code, province, status")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("administrative_posts")
          .select("id, name, status")
          .eq("municipality_id", id)
          .order("name", { ascending: true }),
      ]);

      if (!active) return;

      const error = municipalityResult.error ?? postsResult.error;
      if (error || !municipalityResult.data) {
        console.error("Falha ao preparar Administrador Municipal:", error);
        setLoadError("Não foi possível carregar o município e os postos administrativos.");
        setLoading(false);
        return;
      }

      setMunicipality(municipalityResult.data as Municipality);
      setPosts((postsResult.data ?? []) as Post[]);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  const canSubmit =
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
        role: "admin_municipal",
        municipalityId: municipality.id,
        administrativePostId: postId || null,
      });

      setCreatedUserId(result.id ?? null);
      setActivationCode(result.activationCode ?? null);
      setActivationExpiresAt(result.activationExpiresAt ?? null);
    } catch (error) {
      console.error("Falha ao criar Administrador Municipal:", error);
      setCreateError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o Administrador Municipal.",
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <SuperAdminShell title="Novo Administrador Municipal" subtitle="A carregar contexto institucional...">
        <SuperCard className="p-8 text-sm text-slate-500">A carregar...</SuperCard>
      </SuperAdminShell>
    );
  }

  if (loadError || !municipality) {
    return (
      <SuperAdminShell title="Novo Administrador Municipal" subtitle="Não foi possível preparar a conta.">
        <SuperCard className="p-8">
          <p className="text-sm font-semibold text-red-700">
            {loadError ?? "Município não encontrado."}
          </p>
          <Link
            to="/super-admin/municipios"
            className="mt-4 inline-flex text-sm font-semibold text-sky-700"
          >
            Voltar aos municípios
          </Link>
        </SuperCard>
      </SuperAdminShell>
    );
  }

  if (createdUserId) {
    return (
      <SuperAdminShell
        title="Administrador Municipal criado"
        subtitle="A conta institucional foi criada e o código de activação foi gerado."
      >
        <SuperCard className="mx-auto max-w-2xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold">{name}</h2>
          <p className="mt-2 text-sm text-slate-500">{email}</p>
          <div className="mx-auto mt-6 max-w-md rounded-xl bg-slate-50 p-4 text-left text-sm">
            <p><b>Perfil:</b> Administrador Municipal</p>
            <p className="mt-1"><b>Município:</b> {municipality.name}</p>
            <p className="mt-1">
              <b>Posto:</b>{" "}
              {postId ? posts.find((post) => post.id === postId)?.name ?? "—" : "Todos / não definido"}
            </p>
            <p className="mt-1"><b>Estado:</b> Activo</p>
          </div>
          <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-5 text-left text-sm leading-6 text-sky-900">
            <p className="font-semibold">Código de activação</p>
            <p className="mt-2 font-mono text-2xl font-bold tracking-[0.16em] text-slate-950">
              {activationCode ?? "—"}
            </p>
            <p className="mt-3">
              Entregue este código ao utilizador. No primeiro acesso, ele deve abrir
              <b> Activar conta</b>, informar o email, o código e escolher a própria palavra-passe.
            </p>
            {activationExpiresAt && (
              <p className="mt-2 text-xs text-sky-700">
                Validade: {new Date(activationExpiresAt).toLocaleString("pt-MZ")}
              </p>
            )}
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/super-admin/municipios/$id"
              params={{ id }}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
            >
              Voltar ao município
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
      title="Novo Administrador Municipal"
      subtitle="Criar a identidade administrativa do município."
    >
      <Link
        to="/super-admin/municipios/$id"
        params={{ id }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao município
      </Link>

      <SuperCard className="mx-auto max-w-4xl p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <UserPlus />
          </div>
          <div>
            <h2 className="text-xl font-bold">Dados da conta</h2>
            <p className="mt-1 text-sm text-slate-500">
              A conta será criada no Supabase Auth e vinculada ao perfil Administrador Municipal.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <Field
            label="Nome completo *"
            value={name}
            onChange={setName}
            placeholder="Nome completo"
          />
          <Field
            label="Email de acesso *"
            value={email}
            onChange={setEmail}
            placeholder="administrador@municipio.gov.mz"
            type="email"
          />
          <Field
            label="Contacto"
            value={phone}
            onChange={setPhone}
            placeholder="+258 ..."
          />

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">Município</p>
            <p className="mt-1 text-sm font-semibold">{municipality.name}</p>
            <p className="mt-1 text-xs text-slate-500">
              {municipality.province} · Código {municipality.code}
            </p>
          </div>

          <label className="text-sm font-medium">
            Posto administrativo
            <select
              value={postId}
              onChange={(event) => setPostId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"
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

          <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
            <KeyRound className="mb-2 h-4 w-4" />
            O sistema gera um código temporário de activação. O utilizador usa esse código no primeiro
            acesso e define a própria palavra-passe. Nenhum email de convite é enviado.
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          <ShieldCheck className="mr-2 inline h-4 w-4" />
          <b>Segurança:</b> o perfil fica limitado a {municipality.name}. Se houver posto seleccionado,
          o âmbito territorial também ficará associado a esse posto.
        </div>

        {municipality.status === "inactivo" && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            Não é permitido criar utilizadores para um município inactivo.
          </div>
        )}

        {createError && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {createError}
          </div>
        )}

        <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-6">
          <Link
            to="/super-admin/municipios/$id"
            params={{ id }}
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
            <KeyRound className="h-4 w-4" />
            {creating ? "A criar e gerar código..." : "Criar utilizador e gerar código"}
          </button>
        </div>
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
