import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  CarFront,
  ChevronRight,
  CircleCheck,
  FilePlus2,
  ShieldAlert,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "./MobiGestShell";
import { supabase } from "../lib/supabase";

export type VehicleType = "motorizada" | "carro" | "bicicleta";

type VehicleRow = {
  id: string;
  mobigest_number: string | null;
  current_owner_id: string | null;
  administrative_post_id: string | null;
  make: string | null;
  model: string | null;
  status: string;
  commercial_status: string;
  created_at: string;
};

type DisplayRow = VehicleRow & {
  ownerName: string;
  postName: string;
};

const TYPE_CONFIG: Record<
  VehicleType,
  { plural: string; singular: string; dashboardPath: string; icon: typeof Bike }
> = {
  motorizada: {
    plural: "Motorizadas",
    singular: "motorizada",
    dashboardPath: "/dashboard/motorizadas",
    icon: Bike,
  },
  carro: {
    plural: "Carros",
    singular: "carro",
    dashboardPath: "/dashboard/carros",
    icon: CarFront,
  },
  bicicleta: {
    plural: "Bicicletas",
    singular: "bicicleta",
    dashboardPath: "/dashboard/bicicletas",
    icon: Bike,
  },
};

const STATUS_CONFIG = [
  { key: "activa", slug: "activas", label: "Activas", icon: CircleCheck },
  { key: "a_venda", slug: "a-venda", label: "À venda", icon: ShoppingCart },
  { key: "roubada", slug: "roubadas", label: "Roubadas", icon: ShieldAlert },
  { key: "apreendida", slug: "apreendidas", label: "Apreendidas", icon: AlertTriangle },
  { key: "suspensa", slug: "suspensas", label: "Suspensas", icon: XCircle },
] as const;

export function VehicleTypeDashboard({ type }: { type: VehicleType }) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const vehicleResult = await supabase
        .from("vehicles")
        .select(
          "id, mobigest_number, current_owner_id, administrative_post_id, make, model, status, commercial_status, created_at",
        )
        .eq("vehicle_type", type)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (vehicleResult.error) {
        console.error("Falha ao carregar veículos por tipo:", vehicleResult.error);
        setLoadError("Não foi possível carregar os veículos.");
        setLoading(false);
        return;
      }

      const base = (vehicleResult.data ?? []) as VehicleRow[];
      const ownerIds = [...new Set(base.map((row) => row.current_owner_id).filter(Boolean))] as string[];
      const postIds = [...new Set(base.map((row) => row.administrative_post_id).filter(Boolean))] as string[];

      const [ownersResult, postsResult, pendingResult] = await Promise.all([
        ownerIds.length
          ? supabase.from("owners").select("id, full_name").in("id", ownerIds)
          : Promise.resolve({ data: [], error: null }),
        postIds.length
          ? supabase.from("administrative_posts").select("id, name").in("id", postIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("registrations")
          .select("vehicle_id, status")
          .in("status", ["pendente", "em_validacao", "correccao"]),
      ]);

      if (!active) return;

      const error = ownersResult.error ?? postsResult.error ?? pendingResult.error;
      if (error) {
        console.error("Falha ao enriquecer dashboard de veículos:", error);
        setLoadError("Os veículos foram encontrados, mas os dados relacionados não puderam ser carregados.");
        setLoading(false);
        return;
      }

      const ownerMap = new Map(
        (ownersResult.data ?? []).map((owner) => [owner.id, owner.full_name]),
      );
      const postMap = new Map(
        (postsResult.data ?? []).map((post) => [post.id, post.name]),
      );
      const vehicleIds = new Set(base.map((row) => row.id));

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
      setPendingRegistrations(
        (pendingResult.data ?? []).filter((registration) =>
          registration.vehicle_id ? vehicleIds.has(registration.vehicle_id) : false,
        ).length,
      );
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [type]);

  const counts = useMemo(() => {
    const total = rows.length;
    return {
      total,
      active: rows.filter((row) => row.status === "activa").length,
      sale: rows.filter((row) => row.commercial_status === "a_venda").length,
      stolen: rows.filter((row) => row.status === "roubada").length,
      seized: rows.filter((row) => row.status === "apreendida").length,
      suspended: rows.filter((row) => row.status === "suspensa").length,
    };
  }, [rows]);

  const statusValue = (key: string) => {
    if (key === "activa") return counts.active;
    if (key === "a_venda") return counts.sale;
    if (key === "roubada") return counts.stolen;
    if (key === "apreendida") return counts.seized;
    return counts.suspended;
  };

  return (
    <MobiGestShell
      title={"Dashboard de " + config.plural}
      subtitle={"Indicadores reais de " + config.plural.toLowerCase() + " no município actual."}
    >
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm font-medium text-sky-600"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard geral
          </Link>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">{config.plural}</h2>
        </div>
        <Link
          to="/veiculos/novo/$tipo"
          params={{ tipo: type }}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <FilePlus2 className="h-4 w-4" />
          Registar {config.singular}
        </Link>
      </div>

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Icon />} label={"Total de " + config.plural.toLowerCase()} value={loading ? "—" : counts.total.toLocaleString("pt-MZ")} />
        <Metric icon={<CircleCheck />} label="Activas" value={loading ? "—" : counts.active.toLocaleString("pt-MZ")} />
        <Metric icon={<FilePlus2 />} label="Processos pendentes" value={loading ? "—" : pendingRegistrations.toLocaleString("pt-MZ")} />
        <Metric icon={<ShieldAlert />} label="Roubadas / apreendidas" value={loading ? "—" : (counts.stolen + counts.seized).toLocaleString("pt-MZ")} />
      </section>

      <section className="mt-6">
        <h3 className="mb-4 font-semibold">Situação actual</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STATUS_CONFIG.map((item) => {
            const value = statusValue(item.key);
            const StatusIcon = item.icon;
            const percent = counts.total ? Math.round((value / counts.total) * 100) : 0;
            return (
              <Link
                key={item.key}
                to="/dashboard/$tipo/$status"
                params={{ tipo: config.plural.toLowerCase(), status: item.slug }}
                className="rounded-xl border border-slate-200 bg-white p-4 hover:border-sky-200 hover:bg-sky-50/30"
              >
                <StatusIcon className="h-5 w-5 text-sky-600" />
                <p className="mt-4 text-xs text-slate-500">{item.label}</p>
                <p className="mt-1 text-xl font-bold">{loading ? "—" : value.toLocaleString("pt-MZ")}</p>
                <p className="mt-1 text-xs text-slate-400">{percent}% do total</p>
              </Link>
            );
          })}
        </div>
      </section>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="font-semibold">Registos mais recentes</h3>
            <p className="mt-1 text-sm text-slate-500">Dados reais do Supabase</p>
          </div>
          <Link to="/veiculos" className="text-sm font-semibold text-sky-600">
            Ver todos
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-slate-500">A carregar...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">
            Ainda não existem {config.plural.toLowerCase()} registadas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.slice(0, 8).map((row) => (
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
                    {[row.make, row.model].filter(Boolean).join(" ") || config.singular}
                  </p>
                </div>
                <p className="text-sm text-slate-600">{row.ownerName}</p>
                <p className="text-sm text-slate-500">{row.postName}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600">
                  Abrir <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </MobiGestShell>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        {icon}
      </span>
      <p className="mt-5 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}
