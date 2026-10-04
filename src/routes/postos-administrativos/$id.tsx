import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Pencil,
  Save,
  Users,
  Bike,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { updateAdministrativePost } from "../../lib/territory";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/postos-administrativos/$id")({
  component: Detalhe,
});

type Post = {
  id: string;
  municipality_id: string;
  name: string;
  code: string | null;
  status: "activo" | "inactivo";
};

type Locality = {
  id: string;
  name: string;
  type: string;
  status: string;
  vehicles: number;
};

function Detalhe() {
  const { id } = Route.useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [municipalityName, setMunicipalityName] = useState("");
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [vehicles, setVehicles] = useState(0);
  const [users, setUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"activo" | "inactivo">("activo");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const postResult = await supabase
        .from("administrative_posts")
        .select("id, municipality_id, name, code, status")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (postResult.error || !postResult.data) {
        console.error("Falha ao carregar posto:", postResult.error);
        setLoadError("Posto administrativo não encontrado ou fora do âmbito.");
        setLoading(false);
        return;
      }

      const currentPost = postResult.data as Post;

      const [municipalityResult, localityResult, vehiclesResult, usersResult] =
        await Promise.all([
          supabase
            .from("municipalities")
            .select("name")
            .eq("id", currentPost.municipality_id)
            .maybeSingle(),
          supabase
            .from("localities")
            .select("id, name, type, status")
            .eq("administrative_post_id", id)
            .order("name", { ascending: true }),
          supabase
            .from("vehicles")
            .select("id", { count: "exact", head: true })
            .eq("administrative_post_id", id),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("administrative_post_id", id),
        ]);

      if (!active) return;

      const error =
        municipalityResult.error ??
        localityResult.error ??
        vehiclesResult.error ??
        usersResult.error;

      if (error) {
        console.error("Falha ao carregar detalhe territorial:", error);
        setLoadError("Não foi possível carregar o detalhe completo deste posto.");
        setLoading(false);
        return;
      }

      const localityRows = await Promise.all(
        (localityResult.data ?? []).map(async (locality) => {
          const countResult = await supabase
            .from("vehicles")
            .select("id", { count: "exact", head: true })
            .eq("locality_id", locality.id);

          if (countResult.error) throw countResult.error;

          return {
            ...locality,
            vehicles: countResult.count ?? 0,
          } as Locality;
        }),
      ).catch((countError) => {
        console.error("Falha ao contar veículos por localidade:", countError);
        return null;
      });

      if (!active) return;

      if (!localityRows) {
        setLoadError("Não foi possível carregar as estatísticas das localidades.");
        setLoading(false);
        return;
      }

      setPost(currentPost);
      setMunicipalityName(municipalityResult.data?.name ?? "Município");
      setLocalities(localityRows);
      setVehicles(vehiclesResult.count ?? 0);
      setUsers(usersResult.count ?? 0);

      setName(currentPost.name);
      setCode(currentPost.code ?? "");
      setStatus(currentPost.status);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, refreshToken]);

  const save = async () => {
    if (!post || name.trim().length < 2 || saving) return;

    setSaving(true);
    setSaveError(null);

    try {
      await updateAdministrativePost({
        id: post.id,
        name: name.trim(),
        code: code.trim() || null,
        status,
      });

      setEditing(false);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao actualizar posto:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Não foi possível actualizar o posto administrativo.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobiGestShell
      title="Posto administrativo"
      subtitle="Estrutura territorial e distribuição dos registos."
    >
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Link
          to="/postos-administrativos"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" /> Postos administrativos
        </Link>

        {post && (
          <button
            type="button"
            onClick={() => {
              setEditing((value) => !value);
              setSaveError(null);
            }}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {editing ? "Cancelar edição" : "Editar posto"}
          </button>
        )}
      </div>

      {loading ? (
        <Card className="p-10 text-sm text-slate-500">A carregar posto...</Card>
      ) : loadError || !post ? (
        <Card className="p-10 text-sm font-medium text-red-700">
          {loadError ?? "Posto não encontrado."}
        </Card>
      ) : (
        <>
          {editing && (
            <Card className="mb-6 p-6">
              <h3 className="font-semibold">Editar posto administrativo</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Field label="Nome" value={name} onChange={setName} />
                <Field
                  label="Código"
                  value={code}
                  onChange={(value) =>
                    setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))
                  }
                />
                <label className="text-sm font-medium">
                  Estado
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as "activo" | "inactivo")
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
                  disabled={name.trim().length < 2 || saving}
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
                  <Building2 />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{post.name}</h2>
                  <p className="text-sm text-slate-500">
                    {municipalityName} · {post.status === "activo" ? "Activo" : "Inactivo"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Código: {post.code || "Não definido"}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Localidades / bairros</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Cada unidade listada pertence a este posto administrativo.
                  </p>
                </div>
                <Link
                  to="/localidades"
                  className="text-sm font-semibold text-sky-700"
                >
                  Ver todas
                </Link>
              </div>

              <div className="mt-4 space-y-2">
                {localities.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    Ainda não existem localidades neste posto.
                  </div>
                ) : (
                  localities.map((locality) => (
                    <Link
                      key={locality.id}
                      to="/localidades/$id"
                      params={{ id: locality.id }}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-sky-600" />
                        <div>
                          <span className="text-sm font-medium">{locality.name}</span>
                          <p className="text-xs text-slate-400">{locality.type}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {locality.vehicles.toLocaleString("pt-MZ")} veículos
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-xs text-slate-400">Resumo</p>
              <p className="mt-1 text-3xl font-bold">{vehicles.toLocaleString("pt-MZ")}</p>
              <p className="text-sm text-slate-500">veículos registados</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Summary icon={<MapPin />} value={localities.length} label="Localidades" />
                <Summary icon={<Users />} value={users} label="Utilizadores" />
              </div>

              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <Bike className="h-4 w-4 text-slate-400" />
                <p className="mt-2 text-xs text-slate-500">
                  As contagens são lidas directamente do Supabase.
                </p>
              </div>

              <Link
                to="/localidades/novo"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                <MapPin className="h-4 w-4" /> Nova localidade
              </Link>
            </Card>
          </div>
        </>
      )}
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

function Summary({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <span className="text-slate-400">{icon}</span>
      <p className="mt-2 text-lg font-bold">{value.toLocaleString("pt-MZ")}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
