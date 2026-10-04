import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, Building2, MapPin, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/postos-administrativos")({
  component: PostosRouteBoundary,
});

type PostRow = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  localities: number;
  vehicles: number;
  users: number;
};

function Postos() {
  const [rows, setRows] = useState<PostRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("administrative_posts")
        .select("id, name, code, status")
        .order("name", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar postos administrativos:", error);
        setLoadError("Não foi possível carregar os postos administrativos.");
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        (data ?? []).map(async (post) => {
          const [localitiesResult, vehiclesResult, usersResult] = await Promise.all([
            supabase
              .from("localities")
              .select("id", { count: "exact", head: true })
              .eq("administrative_post_id", post.id),
            supabase
              .from("vehicles")
              .select("id", { count: "exact", head: true })
              .eq("administrative_post_id", post.id),
            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .eq("administrative_post_id", post.id),
          ]);

          const countError =
            localitiesResult.error ?? vehiclesResult.error ?? usersResult.error;
          if (countError) throw countError;

          return {
            ...post,
            localities: localitiesResult.count ?? 0,
            vehicles: vehiclesResult.count ?? 0,
            users: usersResult.count ?? 0,
          } as PostRow;
        }),
      ).catch((countError) => {
        console.error("Falha ao carregar estatísticas dos postos:", countError);
        return null;
      });

      if (!active) return;

      if (!enriched) {
        setLoadError("Os postos foram encontrados, mas as estatísticas não puderam ser carregadas.");
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
        (row.name + " " + (row.code ?? ""))
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [rows, query],
  );

  return (
    <MobiGestShell
      title="Postos administrativos"
      subtitle="Divisão administrativa usada para organizar os registos de mobilidade."
    >
      <PageHeader
        title="Postos administrativos"
        description="Consulte a distribuição e mantenha a estrutura territorial do município."
        action="+ Novo posto"
        actionTo="/postos-administrativos/novo"
      />

      <Card className="mb-5 p-4">
        <label className="relative block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar por nome ou código"
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
          />
        </label>
      </Card>

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      {loading ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          A carregar postos administrativos...
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          {rows.length === 0
            ? "Ainda não existem postos administrativos."
            : "Nenhum posto corresponde à pesquisa."}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((post) => (
            <Link
              to="/postos-administrativos/$id"
              params={{ id: post.id }}
              key={post.id}
            >
              <Card className="h-full p-5 transition hover:border-sky-200 hover:shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <Building2 />
                  </div>
                  <StatusBadge status={post.status} />
                </div>

                <h3 className="mt-5 font-semibold">{post.name}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Código: {post.code || "Não definido"}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <Metric
                    icon={<MapPin className="h-4 w-4 text-slate-400" />}
                    value={post.localities}
                    label="Localidades"
                  />
                  <Metric
                    icon={<Bike className="h-4 w-4 text-slate-400" />}
                    value={post.vehicles}
                    label="Veículos"
                  />
                  <Metric
                    icon={<Users className="h-4 w-4 text-slate-400" />}
                    value={post.users}
                    label="Utilizadores"
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </MobiGestShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={
        "rounded-full px-2.5 py-1 text-xs font-semibold " +
        (status === "activo"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600")
      }
    >
      {status === "activo" ? "Activo" : "Inactivo"}
    </span>
  );
}

function Metric({
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
      {icon}
      <p className="mt-2 text-lg font-bold">{value.toLocaleString("pt-MZ")}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function PostosRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/postos-administrativos">
      <Postos />
    </RouteIndexBoundary>
  );
}
