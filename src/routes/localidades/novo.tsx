import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { createLocality } from "../../lib/territory";
import { supabase } from "../../lib/supabase";
import {
  EmptyState,
  LoadingButton,
  NetworkErrorState,
  SkeletonCard,
  notify,
} from "../../components/mobigest/Experience";

export const Route = createFileRoute("/localidades/novo")({
  component: NovaLocalidade,
});

type Post = {
  id: string;
  name: string;
  status: string;
};

type LocalityType = "localidade" | "bairro" | "povoacao" | "outro";

function NovaLocalidade() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postId, setPostId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<LocalityType>("localidade");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("administrative_posts")
        .select("id, name, status")
        .eq("status", "activo")
        .order("name", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar postos:", error);
        setLoadError("Não foi possível carregar os postos administrativos.");
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as Post[];
      setPosts(rows);
      if (rows[0]) setPostId(rows[0].id);
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const save = async () => {
    if (!postId || name.trim().length < 2 || saving) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      const id = await createLocality({
        administrativePostId: postId,
        name: name.trim(),
        code: code.trim() || null,
        type,
      });
      setCreatedId(id);
      notify.success("Localidade criada");
    } catch (error) {
      console.error("Falha ao criar localidade:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível criar a localidade/bairro.";
      setErrorMessage(message);
      notify.error("Não foi possível criar a localidade", message);
    } finally {
      setSaving(false);
    }
  };

  if (createdId) {
    return (
      <MobiGestShell
        title="Localidade criada"
        subtitle="A estrutura territorial foi actualizada e auditada."
      >
        <Card className="mx-auto max-w-2xl p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <MapPin className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-bold">{name}</h2>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/localidades"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
            >
              Voltar às localidades
            </Link>
            <Link
              to="/localidades/$id"
              params={{ id: createdId }}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Abrir localidade
            </Link>
          </div>
        </Card>
      </MobiGestShell>
    );
  }

  return (
    <MobiGestShell
      title="Nova localidade / bairro"
      subtitle="Adicionar uma unidade territorial a um posto administrativo."
    >
      <Link
        to="/localidades"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Localidades / bairros
      </Link>

      <Card className="mx-auto max-w-3xl p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <MapPin />
          </div>
          <div>
            <h2 className="text-xl font-bold">Dados territoriais</h2>
            <p className="mt-1 text-sm text-slate-500">
              O servidor validará se o posto e a localidade pertencem ao mesmo município.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-7">
            <SkeletonCard />
          </div>
        ) : loadError ? (
          <div className="mt-7">
            <NetworkErrorState
              message={loadError}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-7">
            <EmptyState
              title="Ainda não existe um posto administrativo activo"
              description="Crie primeiro um posto administrativo para associar a nova localidade ou bairro."
              action={
                <Link
                  to="/postos-administrativos/novo"
                  className="mobigest-button inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Criar posto administrativo
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium">
                Posto administrativo *
                <select
                  value={postId}
                  onChange={(event) => setPostId(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                >
                  {posts.map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Tipo
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as LocalityType)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                >
                  <option value="localidade">Localidade</option>
                  <option value="bairro">Bairro</option>
                  <option value="povoacao">Povoação</option>
                  <option value="outro">Outro</option>
                </select>
              </label>

              <Field
                label="Nome *"
                value={name}
                onChange={setName}
                placeholder="Nome da localidade ou bairro"
              />
              <Field
                label="Código"
                value={code}
                onChange={(value) =>
                  setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))
                }
                placeholder="Código opcional"
              />
            </div>

            {errorMessage && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-6">
              <Link
                to="/localidades"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
              >
                Cancelar
              </Link>
              <LoadingButton
                onClick={save}
                disabled={!postId || name.trim().length < 2}
                state={saving ? "loading" : "idle"}
                idleLabel="Criar localidade"
                loadingLabel="A guardar..."
                icon={<Save className="h-4 w-4" />}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"
      />
    </label>
  );
}
