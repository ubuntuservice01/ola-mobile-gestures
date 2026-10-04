import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Bike, CarFront, ChevronRight, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/dashboard/$tipo/$status")({
  component: StatusDetailPage,
});

const TYPE_CONFIG = {
  motorizadas: {
    label: "Motorizadas",
    singular: "motorizada",
    vehicleType: "motorizada",
    back: "/dashboard/motorizadas",
    icon: Bike,
  },
  carros: {
    label: "Carros",
    singular: "carro",
    vehicleType: "carro",
    back: "/dashboard/carros",
    icon: CarFront,
  },
  bicicletas: {
    label: "Bicicletas",
    singular: "bicicleta",
    vehicleType: "bicicleta",
    back: "/dashboard/bicicletas",
    icon: Bike,
  },
} as const;

const STATUS_CONFIG: Record<
  string,
  { label: string; column: "status" | "commercial_status"; value: string }
> = {
  activas: { label: "Activas", column: "status", value: "activa" },
  "a-venda": { label: "À venda", column: "commercial_status", value: "a_venda" },
  roubadas: { label: "Roubadas", column: "status", value: "roubada" },
  apreendidas: { label: "Apreendidas", column: "status", value: "apreendida" },
  suspensas: { label: "Suspensas", column: "status", value: "suspensa" },
  canceladas: { label: "Canceladas", column: "status", value: "cancelada" },
};

type VehicleRow = {
  id: string;
  mobigest_number: string | null;
  current_owner_id: string | null;
  administrative_post_id: string | null;
  make: string | null;
  model: string | null;
  created_at: string;
};

type DisplayVehicle = VehicleRow & {
  ownerName: string;
  postName: string;
};

function StatusDetailPage() {
  const { tipo, status } = Route.useParams();
  const current =
    TYPE_CONFIG[tipo as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.motorizadas;
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.activas;
  const Icon = current.icon;

  const [rows, setRows] = useState<DisplayVehicle[]>([]);
  const [posts, setPosts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPost, setSelectedPost] = useState<string>("todos");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      let query = supabase
        .from("vehicles")
        .select(
          "id, mobigest_number, current_owner_id, administrative_post_id, make, model, created_at",
        )
        .eq("vehicle_type", current.vehicleType)
        .order("created_at", { ascending: false });

      query = query.eq(statusConfig.column, statusConfig.value);

      const [vehicleResult, postResult] = await Promise.all([
        query,
        supabase
          .from("administrative_posts")
          .select("id, name")
          .order("name", { ascending: true }),
      ]);

      if (!active) return;

      const error = vehicleResult.error ?? postResult.error;
      if (error) {
        console.error("Falha ao carregar detalhe por estado:", error);
        setLoadError("Não foi possível carregar os veículos desta situação.");
        setLoading(false);
        return;
      }

      const base = (vehicleResult.data ?? []) as VehicleRow[];
      const ownerIds = [...new Set(base.map((row) => row.current_owner_id).filter(Boolean))] as string[];

      const ownerResult = ownerIds.length
        ? await supabase.from("owners").select("id, full_name").in("id", ownerIds)
        : { data: [], error: null };

      if (!active) return;

      if (ownerResult.error) {
        console.error("Falha ao carregar proprietários:", ownerResult.error);
        setLoadError("Os veículos foram encontrados, mas os proprietários não puderam ser carregados.");
        setLoading(false);
        return;
      }

      const ownerMap = new Map(
        (ownerResult.data ?? []).map((owner) => [owner.id, owner.full_name]),
      );
      const postMap = new Map(
        (postResult.data ?? []).map((post) => [post.id, post.name]),
      );

      setPosts(postResult.data ?? []);
      setRows(
        base.map((row) => ({
          ...row,
          ownerName: row.current_owner_id
            ? ownerMap.get(row.current_owner_id) ?? "Proprietário não encontrado"
            : "Sem proprietário",
          postName: row.administrative_post_id
            ? postMap.get(row.administrative_post_id) ?? "Posto não encontrado"
            : "Sem posto",
        })),
      );
      setSelectedPost("todos");
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [current.vehicleType, statusConfig.column, statusConfig.value]);

  const countsByPost = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();

    for (const post of posts) {
      map.set(post.id, { id: post.id, name: post.name, count: 0 });
    }

    for (const row of rows) {
      const key = row.administrative_post_id ?? "sem-posto";
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { id: key, name: row.postName, count: 1 });
      }
    }

    return [...map.values()]
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [posts, rows]);

  const filteredRows = useMemo(
    () =>
      selectedPost === "todos"
        ? rows
        : rows.filter(
            (row) =>
              (row.administrative_post_id ?? "sem-posto") === selectedPost,
          ),
    [rows, selectedPost],
  );

  const maxCount = Math.max(1, ...countsByPost.map((item) => item.count));

  return (
    <MobiGestShell
      title={statusConfig.label + " · " + current.label}
      subtitle="Distribuição real por posto administrativo."
    >
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link
            to={current.back}
            className="inline-flex items-center gap-1 text-sm font-medium text-sky-600"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard de {current.label}
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{current.label}</p>
              <h2 className="text-2xl font-bold">{statusConfig.label}</h2>
            </div>
          </div>
        </div>

        <Link
          to="/veiculos"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
        >
          Ver todos os veículos <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-slate-500">Total nesta situação</p>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "—" : rows.length.toLocaleString("pt-MZ")}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Postos com registos</p>
          <p className="mt-2 text-3xl font-bold">
            {loading ? "—" : countsByPost.length.toLocaleString("pt-MZ")}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Filtro actual</p>
          <p className="mt-2 text-lg font-bold">
            {selectedPost === "todos"
              ? "Todos os postos"
              : countsByPost.find((item) => item.id === selectedPost)?.name ?? "Posto"}
          </p>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">Distribuição por posto</h3>
              <p className="mt-1 text-sm text-slate-500">
                Número de {current.label.toLowerCase()} nesta situação
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-7 space-y-5">
            {countsByPost.length === 0 ? (
              <p className="text-sm text-slate-500">Sem registos para distribuir.</p>
            ) : (
              countsByPost.map((item) => (
                <div key={item.id}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {item.name}
                    </span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-sky-600"
                      style={{ width: String((item.count / maxCount) * 100) + "%" }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold">Filtrar por posto</h3>
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => setSelectedPost("todos")}
              className={
                "flex w-full items-center justify-between rounded-xl border p-3 text-left " +
                (selectedPost === "todos"
                  ? "border-sky-300 bg-sky-50"
                  : "border-slate-200")
              }
            >
              <span className="text-sm font-semibold">Todos os postos</span>
              <span className="text-xs text-slate-500">{rows.length}</span>
            </button>
            {countsByPost.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedPost(item.id)}
                className={
                  "flex w-full items-center justify-between rounded-xl border p-3 text-left " +
                  (selectedPost === item.id
                    ? "border-sky-300 bg-sky-50"
                    : "border-slate-200")
                }
              >
                <span className="text-sm font-semibold">{item.name}</span>
                <span className="text-xs text-slate-500">{item.count}</span>
              </button>
            ))}
          </div>
        </Card>
      </section>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="font-semibold">Veículos desta situação</h3>
          <p className="mt-1 text-sm text-slate-500">
            {filteredRows.length.toLocaleString("pt-MZ")} resultado(s)
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-slate-500">A carregar...</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">
            Não existem veículos para este filtro.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRows.map((row) => (
              <Link
                key={row.id}
                to="/veiculos/$id"
                params={{ id: row.id }}
                className="grid gap-2 px-6 py-4 hover:bg-slate-50 md:grid-cols-[1.2fr_1.4fr_1fr_auto] md:items-center"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {row.mobigest_number || "Sem número MobiGest"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {[row.make, row.model].filter(Boolean).join(" ") || current.singular}
                  </p>
                </div>
                <p className="text-sm text-slate-600">{row.ownerName}</p>
                <p className="text-sm text-slate-500">{row.postName}</p>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </MobiGestShell>
  );
}
