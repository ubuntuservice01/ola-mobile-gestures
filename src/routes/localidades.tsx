import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/localidades")({
  component: LocalidadesRouteBoundary,
});

type LocalityRow = {
  id: string;
  name: string;
  code: string | null;
  type: string;
  status: string;
  postName: string;
  municipalityName: string;
  vehicles: number;
};

function Localidades() {
  const [rows, setRows] = useState<LocalityRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [localityResult, postResult, municipalityResult] = await Promise.all([
        supabase
          .from("localities")
          .select("id, name, code, type, status, administrative_post_id, municipality_id")
          .order("name", { ascending: true }),
        supabase.from("administrative_posts").select("id, name"),
        supabase.from("municipalities").select("id, name"),
      ]);

      if (!active) return;

      const error =
        localityResult.error ?? postResult.error ?? municipalityResult.error;

      if (error) {
        console.error("Falha ao carregar localidades:", error);
        setLoadError("Não foi possível carregar as localidades/bairros.");
        setLoading(false);
        return;
      }

      const postMap = new Map(
        (postResult.data ?? []).map((post) => [post.id, post.name]),
      );
      const municipalityMap = new Map(
        (municipalityResult.data ?? []).map((municipality) => [
          municipality.id,
          municipality.name,
        ]),
      );

      const enriched = await Promise.all(
        (localityResult.data ?? []).map(async (locality) => {
          const vehiclesResult = await supabase
            .from("vehicles")
            .select("id", { count: "exact", head: true })
            .eq("locality_id", locality.id);

          if (vehiclesResult.error) throw vehiclesResult.error;

          return {
            id: locality.id,
            name: locality.name,
            code: locality.code,
            type: locality.type,
            status: locality.status,
            postName:
              postMap.get(locality.administrative_post_id) ?? "Posto não encontrado",
            municipalityName:
              municipalityMap.get(locality.municipality_id) ?? "Município não encontrado",
            vehicles: vehiclesResult.count ?? 0,
          } as LocalityRow;
        }),
      ).catch((countError) => {
        console.error("Falha ao carregar estatísticas das localidades:", countError);
        return null;
      });

      if (!active) return;

      if (!enriched) {
        setLoadError("As localidades foram encontradas, mas as estatísticas não puderam ser carregadas.");
        setLoading(false);
        return;
      }

      setRows(enriched);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        [row.name, row.code ?? "", row.postName, row.municipalityName]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [rows, query],
  );

  return (
    <MobiGestShell
      title="Localidades / bairros"
      subtitle="Terceiro nível da estrutura territorial do MobiGest."
    >
      <PageHeader
        title="Localidades / bairros"
        description="Cada localidade ou bairro pertence a um posto administrativo e a um município."
        action="+ Nova localidade"
        actionTo="/localidades/novo"
      />

      <Card className="mb-5 p-4">
        <label className="relative block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar localidade, posto ou código"
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
          />
        </label>
      </Card>

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1.5fr_1fr_1.3fr_auto_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
          <span>Localidade / bairro</span>
          <span>Posto</span>
          <span>Município</span>
          <span>Veículos</span>
          <span>Estado</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            A carregar localidades...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {rows.length === 0
              ? "Ainda não existem localidades/bairros."
              : "Nenhuma localidade corresponde à pesquisa."}
          </div>
        ) : (
          filtered.map((row) => (
            <Link
              key={row.id}
              to="/localidades/$id"
              params={{ id: row.id }}
              className="grid gap-3 border-b border-slate-100 px-5 py-4 hover:bg-slate-50 md:grid-cols-[1.5fr_1fr_1.3fr_auto_auto] md:items-center"
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <MapPin className="h-4 w-4" />
                </span>
                <span>
                  {row.name}
                  <small className="block font-normal text-slate-400">
                    {typeLabel(row.type)} · {row.code || "Sem código"}
                  </small>
                </span>
              </span>
              <span className="text-sm text-slate-600">{row.postName}</span>
              <span className="text-sm text-slate-600">{row.municipalityName}</span>
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                {row.vehicles.toLocaleString("pt-MZ")}
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </span>
              <span
                className={
                  "w-fit rounded-full px-2.5 py-1 text-xs font-semibold " +
                  (row.status === "activo"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600")
                }
              >
                {row.status === "activo" ? "Activo" : "Inactivo"}
              </span>
            </Link>
          ))
        )}
      </Card>
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

function LocalidadesRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/localidades">
      <Localidades />
    </RouteIndexBoundary>
  );
}
