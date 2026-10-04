import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ClipboardList,
  MapPin,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card, PageHeader } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import {
  AnimatedNumber,
  EmptyState,
  LoadingButton,
  NetworkErrorState,
  SkeletonCard,
  SkeletonTable,
  StatusBadge,
} from "../components/mobigest/Experience";
import { formatDateTime } from "../lib/format";

export const Route = createFileRoute("/fiscalizacao")({
  component: FiscalizacaoRouteBoundary,
});

type FiscalizationRow = {
  id: string;
  vehicle_id: string;
  result: string;
  occurrence: string | null;
  evidence_count: number;
  occurred_at: string;
  administrative_post_id: string | null;
  fiscal_id: string | null;
  vehicleNumber: string;
  vehicleType: string;
  vehicleLabel: string;
  postName: string;
  fiscalName: string;
};

type FoundVehicle = {
  id: string;
  mobigest_number: string | null;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  status: string;
};

function Fiscalizacao() {
  const [rows, setRows] = useState<FiscalizationRow[]>([]);
  const [searchCode, setSearchCode] = useState("");
  const [foundVehicle, setFoundVehicle] = useState<FoundVehicle | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("fiscalizations")
        .select(
          "id, vehicle_id, result, occurrence, evidence_count, occurred_at, administrative_post_id, fiscal_id",
        )
        .order("occurred_at", { ascending: false })
        .limit(10);

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar fiscalizações:", error);
        setLoadError("Não foi possível carregar as fiscalizações.");
        setLoading(false);
        return;
      }

      const base = data ?? [];
      const vehicleIds = [...new Set(base.map((row) => row.vehicle_id))];
      const postIds = [
        ...new Set(base.map((row) => row.administrative_post_id).filter(Boolean)),
      ] as string[];
      const fiscalIds = [
        ...new Set(base.map((row) => row.fiscal_id).filter(Boolean)),
      ] as string[];

      const [vehiclesResult, postsResult, fiscalsResult] = await Promise.all([
        vehicleIds.length
          ? supabase
              .from("vehicles")
              .select("id, mobigest_number, vehicle_type, make, model")
              .in("id", vehicleIds)
          : Promise.resolve({ data: [], error: null }),
        postIds.length
          ? supabase
              .from("administrative_posts")
              .select("id, name")
              .in("id", postIds)
          : Promise.resolve({ data: [], error: null }),
        fiscalIds.length
          ? supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", fiscalIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!active) return;

      const relationError =
        vehiclesResult.error ?? postsResult.error ?? fiscalsResult.error;

      if (relationError) {
        console.error("Falha ao enriquecer fiscalizações:", relationError);
        setLoadError(
          "As fiscalizações foram encontradas, mas os dados relacionados não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      const vehicleMap = new Map(
        (vehiclesResult.data ?? []).map((vehicle) => [vehicle.id, vehicle]),
      );
      const postMap = new Map(
        (postsResult.data ?? []).map((post) => [post.id, post.name]),
      );
      const fiscalMap = new Map(
        (fiscalsResult.data ?? []).map((fiscal) => [fiscal.id, fiscal.full_name]),
      );

      setRows(
        base.map((row) => {
          const vehicle = vehicleMap.get(row.vehicle_id);
          return {
            ...row,
            vehicleNumber: vehicle?.mobigest_number ?? "Sem número MobiGest",
            vehicleType: vehicle?.vehicle_type ?? "veiculo",
            vehicleLabel:
              [vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ||
              vehicleTypeLabel(vehicle?.vehicle_type),
            postName: row.administrative_post_id
              ? postMap.get(row.administrative_post_id) ?? "Posto não encontrado"
              : "Não definido",
            fiscalName: row.fiscal_id
              ? fiscalMap.get(row.fiscal_id) ?? "Fiscal"
              : "Fiscal não identificado",
          } as FiscalizationRow;
        }),
      );
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const metrics = useMemo(
    () => ({
      total: rows.length,
      regular: rows.filter((row) => row.result === "regular").length,
      occurrence: rows.filter((row) => row.result !== "regular").length,
    }),
    [rows],
  );

  const searchVehicle = async () => {
    const normalized = searchCode.trim().toUpperCase();
    if (!normalized || searching) return;

    setSearching(true);
    setSearchError(null);
    setFoundVehicle(null);

    const { data, error } = await supabase
      .from("vehicles")
      .select("id, mobigest_number, vehicle_type, make, model, status")
      .eq("mobigest_number", normalized)
      .maybeSingle();

    if (error || !data) {
      console.error("Falha ao consultar veículo para fiscalização:", error);
      setSearchError(
        error
          ? "Não foi possível consultar o veículo."
          : "Veículo não encontrado.",
      );
    } else {
      setFoundVehicle(data as FoundVehicle);
    }

    setSearching(false);
  };

  return (
    <MobiGestShell
      title="Fiscalização"
      subtitle="Verificação de veículos e registo de ocorrências."
    >
      <PageHeader
        title="Fiscalização"
        description="Consulte um veículo, registe uma fiscalização e acompanhe ocorrências."
        action="Nova fiscalização"
        actionTo="/fiscalizacao/nova"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <ShieldCheck />
            </div>
            <div>
              <h2 className="text-xl font-bold">Verificar um veículo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Introduza o número MobiGest.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <div className="flex flex-1 items-center rounded-xl border border-slate-300 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={searchCode}
                onChange={(event) =>
                  setSearchCode(event.target.value.toUpperCase())
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void searchVehicle();
                  }
                }}
                placeholder="MZ-LIC-000001"
                className="h-12 flex-1 bg-transparent px-3 outline-none"
              />
            </div>
            <LoadingButton
              onClick={searchVehicle}
              disabled={!searchCode.trim()}
              state={searching ? "loading" : "idle"}
              idleLabel="Consultar"
              loadingLabel="A consultar registos..."
              className="bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
            />
          </div>

          {searchError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {searchError}
            </div>
          )}

          {foundVehicle && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-900">
                {foundVehicle.mobigest_number}
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                {vehicleTypeLabel(foundVehicle.vehicle_type)} ·{" "}
                {[foundVehicle.make, foundVehicle.model]
                  .filter(Boolean)
                  .join(" ") || "Sem marca/modelo"}{" "}
                · {vehicleStatusLabel(foundVehicle.status)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/veiculos/$id"
                  params={{ id: foundVehicle.id }}
                  className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800"
                >
                  Abrir veículo
                </Link>
                <Link
                  to="/fiscalizacao/nova"
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
                >
                  Registar fiscalização
                </Link>
              </div>
            </div>
          )}

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))
            ) : (
              <>
                <Metric
                  icon={<ClipboardList />}
                  label="Últimas carregadas"
                  value={metrics.total}
                />
                <Metric
                  icon={<CheckCircle2 />}
                  label="Regulares"
                  value={metrics.regular}
                />
                <Metric
                  icon={<ShieldAlert />}
                  label="Com ocorrência"
                  value={metrics.occurrence}
                />
              </>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <h3 className="mt-4 font-semibold">Operação em campo</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Cada fiscalização guarda veículo, agente autenticado, resultado,
            território, ocorrência, observação, data/hora e evidências privadas.
          </p>
          <Link
            to="/fiscalizacao/historico"
            className="mt-5 inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            Ver histórico completo
          </Link>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h3 className="font-semibold">Fiscalizações recentes</h3>
        </div>

        {loadError && (
          <div className="border-b border-red-100 p-4">
            <NetworkErrorState
              message={loadError}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </div>
        )}

        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={5} columns={5} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Ainda não existem fiscalizações"
            description="Quando a primeira fiscalização for registada, o histórico recente aparecerá aqui."
            action={
              <Link
                to="/fiscalizacao/nova"
                className="mobigest-button inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Nova fiscalização
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <Link
                key={row.id}
                to="/fiscalizacao/$id"
                params={{ id: row.id }}
                className="mobigest-table-row grid gap-3 p-5 hover:bg-slate-50 md:grid-cols-[1.2fr_1fr_1.1fr_1fr_auto] md:items-center"
              >
                <div>
                  <p className="text-sm font-semibold">{row.vehicleNumber}</p>
                  <p className="text-xs text-slate-400">
                    {row.vehicleLabel}
                  </p>
                </div>
                <StatusBadge status={row.result} />
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {row.postName}
                </div>
                <div className="text-xs text-slate-500">
                  {formatDateTime(row.occurred_at)}
                </div>
                <span className="text-xs text-slate-400">
                  {row.evidence_count} evid.
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
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <span className="text-sky-600">{icon}</span>
      <p className="mt-2 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

function vehicleTypeLabel(type?: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return "Veículo";
}

function vehicleStatusLabel(status: string) {
  const labels: Record<string, string> = {
    activa: "Activa",
    suspensa: "Suspensa",
    roubada: "Roubada",
    apreendida: "Apreendida",
    cancelada: "Cancelada",
  };
  return labels[status] ?? status;
}

function FiscalizacaoRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/fiscalizacao">
      <Fiscalizacao />
    </RouteIndexBoundary>
  );
}
