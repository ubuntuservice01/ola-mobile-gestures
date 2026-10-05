import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { updateLocality } from "../../lib/territory";
import { supabase } from "../../lib/supabase";
import { useSessionDraft } from "../../hooks/use-session-draft";
import { notify } from "../../components/mobigest/Experience";

export const Route = createFileRoute("/localidades/$id")({
  component: DetalheLocalidade,
});

type Locality = {
  id: string;
  municipality_id: string;
  administrative_post_id: string;
  name: string;
  code: string | null;
  type: "localidade" | "bairro" | "povoacao" | "outro";
  status: "activo" | "inactivo";
};

type Post = {
  id: string;
  name: string;
  status: string;
};

function DetalheLocalidade() {
  const { id } = Route.useParams();
  const [locality, setLocality] = useState<Locality | null>(null);
  const [municipalityName, setMunicipalityName] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [vehicles, setVehicles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<Locality["type"]>("localidade");
  const [status, setStatus] = useState<Locality["status"]>("activo");
  const [postId, setPostId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const localityDraft = useSessionDraft({
    key: "localidades:" + id + ":editar",
    value: { editing, name, code, type, status, postId },
    restore: (draft) => {
      setEditing(Boolean(draft.editing));
      setName(draft.name ?? "");
      setCode(draft.code ?? "");
      setType(draft.type ?? "localidade");
      setStatus(draft.status ?? "activo");
      setPostId(draft.postId ?? "");
      notify.info("Rascunho recuperado automaticamente.");
    },
    isMeaningful: (draft) => Boolean(draft.editing),
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const localityResult = await supabase
        .from("localities")
        .select(
          "id, municipality_id, administrative_post_id, name, code, type, status",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (localityResult.error || !localityResult.data) {
        console.error("Falha ao carregar localidade:", localityResult.error);
        setLoadError("Localidade/bairro não encontrado ou fora do âmbito.");
        setLoading(false);
        return;
      }

      const current = localityResult.data as Locality;

      const [municipalityResult, postsResult, vehiclesResult] = await Promise.all([
        supabase
          .from("municipalities")
          .select("name")
          .eq("id", current.municipality_id)
          .maybeSingle(),
        supabase
          .from("administrative_posts")
          .select("id, name, status")
          .eq("municipality_id", current.municipality_id)
          .order("name", { ascending: true }),
        supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("locality_id", id),
      ]);

      if (!active) return;

      const error =
        municipalityResult.error ?? postsResult.error ?? vehiclesResult.error;

      if (error) {
        console.error("Falha ao carregar detalhe da localidade:", error);
        setLoadError("Não foi possível carregar o detalhe completo desta localidade.");
        setLoading(false);
        return;
      }

      setLocality(current);
      setMunicipalityName(municipalityResult.data?.name ?? "Município");
      setPosts((postsResult.data ?? []) as Post[]);
      setVehicles(vehiclesResult.count ?? 0);

      if (!localityDraft.hasStoredDraft) {
        setName(current.name);
        setCode(current.code ?? "");
        setType(current.type);
        setStatus(current.status);
        setPostId(current.administrative_post_id);
      }
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, refreshToken]);

  const save = async () => {
    if (!locality || !postId || name.trim().length < 2 || saving) return;

    setSaving(true);
    setSaveError(null);

    try {
      await updateLocality({
        id: locality.id,
        administrativePostId: postId,
        name: name.trim(),
        code: code.trim() || null,
        type,
        status,
      });

      localityDraft.clearDraft();
      setEditing(false);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao actualizar localidade:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Não foi possível actualizar a localidade/bairro.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobiGestShell
      title="Localidade / bairro"
      subtitle="Detalhe da unidade territorial."
    >
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Link
          to="/localidades"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" /> Localidades / bairros
        </Link>

        {locality && (
          <button
            type="button"
            onClick={() => {
              if (editing) {
                localityDraft.clearDraft();
                setEditing(false);
              } else {
                setEditing(true);
              }
              setSaveError(null);
            }}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {editing ? "Cancelar edição" : "Editar localidade"}
          </button>
        )}
      </div>

      {loading ? (
        <Card className="p-10 text-sm text-slate-500">
          A carregar localidade...
        </Card>
      ) : loadError || !locality ? (
        <Card className="p-10 text-sm font-medium text-red-700">
          {loadError ?? "Localidade não encontrada."}
        </Card>
      ) : (
        <>
          {editing && (
            <Card className="mb-6 p-6">
              <h3 className="font-semibold">Editar localidade / bairro</h3>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Nome" value={name} onChange={setName} />
                <Field
                  label="Código"
                  value={code}
                  onChange={(value) =>
                    setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))
                  }
                />

                <label className="text-sm font-medium">
                  Posto administrativo
                  <select
                    value={postId}
                    onChange={(event) => setPostId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                  >
                    {posts
                      .filter(
                        (post) =>
                          post.status === "activo" || post.id === locality.administrative_post_id,
                      )
                      .map((post) => (
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
                    onChange={(event) => setType(event.target.value as Locality["type"])}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                  >
                    <option value="localidade">Localidade</option>
                    <option value="bairro">Bairro</option>
                    <option value="povoacao">Povoação</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>

                <label className="text-sm font-medium md:col-span-2">
                  Estado
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as Locality["status"])
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </label>
              </div>

              {saveError && (
                <p className="mt-4 text-sm font-medium text-red-700">{saveError}</p>
              )}

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  disabled={!postId || name.trim().length < 2 || saving}
                  onClick={save}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "A guardar..." : "Guardar alterações"}
                </button>
              </div>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card className="p-7">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <MapPin />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{locality.name}</h2>
                  <p className="text-sm text-slate-500">
                    {posts.find((post) => post.id === locality.administrative_post_id)?.name ??
                      "Posto administrativo"}{" "}
                    · {municipalityName}
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <Info
                  label="Posto administrativo"
                  value={
                    posts.find((post) => post.id === locality.administrative_post_id)
                      ?.name ?? "—"
                  }
                />
                <Info label="Município" value={municipalityName} />
                <Info
                  label="Estado"
                  value={locality.status === "activo" ? "Activo" : "Inactivo"}
                />
                <Info label="Tipo" value={typeLabel(locality.type)} />
                <Info label="Código" value={locality.code || "Não definido"} />
              </div>
            </Card>

            <Card className="p-6">
              <Building2 className="h-5 w-5 text-sky-600" />
              <p className="mt-4 text-xs text-slate-400">Veículos registados</p>
              <p className="mt-1 text-3xl font-bold">
                {vehicles.toLocaleString("pt-MZ")}
              </p>
              <p className="text-sm text-slate-500">
                associados a esta unidade territorial
              </p>
            </Card>
          </div>
        </>
      )}
    </MobiGestShell>
  );
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    localidade: "Localidade",
    bairro: "Bairro",
    povoacao: "Povoação",
    outro: "Outro",
  };
  return labels[type] ?? type;
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
