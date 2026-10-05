import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike,
  CarFront,
  CircleCheck,
  Eye,
  QrCode,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";
import {
  EmptyState,
  IconTooltip,
  NetworkErrorState,
  PaginationBar,
  SkeletonCard,
  SkeletonTable,
  StatusBadge,
} from "../components/mobigest/Experience";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import {
  AnalyticsChartCard,
  AnalyticsKpiCard,
  DistributionDonut,
  ModuleHeader,
  RegistrationsAreaChart,
} from "../components/mobigest/Analytics";

export const Route = createFileRoute("/veiculos")({
  component: VeiculosRouteBoundary,
});

type VehicleRow = {
  id: string;
  mobigest_number: string | null;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  current_owner_id: string | null;
  administrative_post_id: string | null;
  status: string;
  commercial_status: string;
  created_at: string;
  ownerName: string;
  postName: string;
  registrationStatus: string | null;
};

function Veiculos() {
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 350);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [vehiclesResult, registrationsResult] = await Promise.all([
        supabase
          .from("vehicles")
          .select(
            "id, mobigest_number, vehicle_type, make, model, current_owner_id, administrative_post_id, status, commercial_status, created_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("registrations")
          .select("vehicle_id, status, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      const firstError = vehiclesResult.error ?? registrationsResult.error;
      if (firstError) {
        console.error("Falha ao carregar veículos:", firstError);
        setLoadError("Não foi possível carregar os veículos.");
        setLoading(false);
        return;
      }

      const base = vehiclesResult.data ?? [];
      const ownerIds = [
        ...new Set(base.map((row) => row.current_owner_id).filter(Boolean)),
      ] as string[];
      const postIds = [
        ...new Set(base.map((row) => row.administrative_post_id).filter(Boolean)),
      ] as string[];

      const [ownersResult, postsResult] = await Promise.all([
        ownerIds.length
          ? supabase.from("owners").select("id, full_name").in("id", ownerIds)
          : Promise.resolve({ data: [], error: null }),
        postIds.length
          ? supabase.from("administrative_posts").select("id, name").in("id", postIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!active) return;

      const relationError = ownersResult.error ?? postsResult.error;
      if (relationError) {
        console.error("Falha ao carregar relações dos veículos:", relationError);
        setLoadError(
          "Os veículos foram encontrados, mas os dados relacionados não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      const ownerMap = new Map(
        (ownersResult.data ?? []).map((owner) => [owner.id, owner.full_name]),
      );
      const postMap = new Map(
        (postsResult.data ?? []).map((post) => [post.id, post.name]),
      );
      const registrationMap = new Map<string, string>();

      for (const registration of registrationsResult.data ?? []) {
        if (registration.vehicle_id && !registrationMap.has(registration.vehicle_id)) {
          registrationMap.set(registration.vehicle_id, registration.status);
        }
      }

      setRows(
        base.map((row) => ({
          ...row,
          ownerName: row.current_owner_id
            ? ownerMap.get(row.current_owner_id) ?? "Proprietário não encontrado"
            : "Sem proprietário",
          postName: row.administrative_post_id
            ? postMap.get(row.administrative_post_id) ?? "Posto não encontrado"
            : "Sem posto",
          registrationStatus: registrationMap.get(row.id) ?? null,
        })),
      );
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const searchable = [
          row.mobigest_number ?? "",
          row.make ?? "",
          row.model ?? "",
          row.ownerName,
          row.postName,
        ]
          .join(" ")
          .toLowerCase();

        const statusKey = displayStatusKey(row);

        return (
          searchable.includes(debouncedQuery.trim().toLowerCase()) &&
          (typeFilter === "todos" || row.vehicle_type === typeFilter) &&
          (statusFilter === "todos" || statusKey === statusFilter)
        );
      }),
    [rows, debouncedQuery, typeFilter, statusFilter],
  );
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, typeFilter, statusFilter]);


  return (
    <MobiGestShell
      title="Veículos"
      subtitle="Registo, consulta e acompanhamento da frota municipal."
    >
      <ModuleHeader
        eyebrow="Frota municipal"
        title="Veículos"
        description="Registo, estado e evolução da frota municipal por tipo e situação operacional."
        icon={<CarFront />}
        action={
          <Link
            to="/veiculos/novo"
            className="mobigest-button inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--municipal-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:-translate-y-px hover:brightness-95"
          >
            + Registar veículo
          </Link>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          <>
            <AnalyticsKpiCard
              label="Total de veículos"
              value={rows.length}
              icon={<CarFront />}
              note="Frota visível"
              emphasis
            />
            <AnalyticsKpiCard
              label="Activos"
              value={rows.filter((row) => displayStatusKey(row) === "activa").length}
              icon={<CircleCheck />}
              note="Em operação"
            />
            <AnalyticsKpiCard
              label="Roubados"
              value={rows.filter((row) => displayStatusKey(row) === "roubada").length}
              icon={<ShieldAlert />}
              note="Requer atenção"
            />
            <AnalyticsKpiCard
              label="Apreendidos"
              value={rows.filter((row) => displayStatusKey(row) === "apreendida").length}
              icon={<ShieldAlert />}
              note="Sob custódia"
            />
          </>
        )}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <AnalyticsChartCard
          title="Novos veículos"
          description="Evolução dos registos da frota nos últimos seis meses."
        >
          {loading ? (
            <SkeletonCard />
          ) : (
            <RegistrationsAreaChart
              data={vehicleMonthlySeries(rows)}
              seriesLabel="Veículos"
              emptyTitle="Ainda não existem veículos no período"
            />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Por tipo"
          description="Distribuição da frota municipal."
        >
          {loading ? (
            <SkeletonCard />
          ) : (
            <DistributionDonut
              data={vehicleTypeDistribution(rows)}
              centerLabel="Veículos"
            />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Por estado"
          description="Situação operacional actual."
        >
          {loading ? (
            <SkeletonCard />
          ) : (
            <DistributionDonut
              data={vehicleStatusDistribution(rows)}
              centerLabel="Estados"
            />
          )}
        </AnalyticsChartCard>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row">
          <div className="flex flex-1 items-center rounded-xl border border-slate-200 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por número, marca, proprietário ou posto..."
              className="h-11 flex-1 bg-transparent px-3 text-sm outline-none"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="todos">Todos os tipos</option>
            <option value="motorizada">Motorizada</option>
            <option value="carro">Carro</option>
            <option value="bicicleta">Bicicleta</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="todos">Todos os estados</option>
            <option value="pendente">Pendente</option>
            <option value="em_validacao">Em validação</option>
            <option value="correccao">Correcção</option>
            <option value="activa">Activa</option>
            <option value="a_venda">À venda</option>
            <option value="roubada">Roubada</option>
            <option value="apreendida">Apreendida</option>
            <option value="suspensa">Suspensa</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        {(typeFilter !== "todos" || statusFilter !== "todos" || query.trim()) && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
            <span className="text-xs font-medium text-slate-400">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </span>
            {typeFilter !== "todos" && (
              <button
                type="button"
                onClick={() => setTypeFilter("todos")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {vehicleTypeLabel(typeFilter)}
                <X className="h-3 w-3" />
              </button>
            )}
            {statusFilter !== "todos" && (
              <button
                type="button"
                onClick={() => setStatusFilter("todos")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {statusLabel(statusFilter)}
                <X className="h-3 w-3" />
              </button>
            )}
            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                Pesquisa: {query.trim()}
                <X className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTypeFilter("todos");
                setStatusFilter("todos");
              }}
              className="text-xs font-semibold text-sky-700 hover:text-sky-800"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {loadError && (
          <div className="border-b border-red-100 p-4">
            <NetworkErrorState
              message={loadError}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="mobigest-data-table w-full min-w-[980px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {[
                  "MobiGest",
                  "Veículo",
                  "Tipo",
                  "Proprietário",
                  "Posto",
                  "Estado",
                  "Acções",
                ].map((heading) => (
                  <th className="px-5 py-3 font-semibold" key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-4">
                    <SkeletonTable rows={6} columns={7} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title={
                        rows.length === 0
                          ? "Ainda não existem veículos registados"
                          : "Nenhum veículo encontrado"
                      }
                      description={
                        rows.length === 0
                          ? "Registe o primeiro veículo para começar a construir a frota municipal."
                          : "Tente alterar a pesquisa ou limpar os filtros aplicados."
                      }
                      action={
                        rows.length === 0 ? (
                          <Link
                            to="/veiculos/novo"
                            className="mobigest-button inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                          >
                            + Registar veículo
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setQuery("");
                              setTypeFilter("todos");
                              setStatusFilter("todos");
                            }}
                            className="mobigest-button rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                          >
                            Limpar filtros
                          </button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => (
                  <tr key={row.id} className="mobigest-table-row hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-sky-700">
                      {row.mobigest_number || "Aguardando aprovação"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {row.vehicle_type === "carro" ? (
                          <CarFront className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Bike className="h-4 w-4 text-slate-400" />
                        )}
                        {[row.make, row.model].filter(Boolean).join(" ") ||
                          vehicleTypeLabel(row.vehicle_type)}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {vehicleTypeLabel(row.vehicle_type)}
                    </td>
                    <td className="px-5 py-4">{row.ownerName}</td>
                    <td className="px-5 py-4 text-slate-500">{row.postName}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={displayStatusKey(row)} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        <IconTooltip label="Ver ficha">
                          <Link
                            to="/veiculos/$id"
                            params={{ id: row.id }}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            aria-label="Ver ficha do veículo"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </IconTooltip>
                        {row.mobigest_number && (
                          <IconTooltip label="Abrir QR Code">
                            <Link
                              to="/imprimir/qr/$id"
                              params={{ id: row.id }}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                              aria-label="Abrir QR Code do veículo"
                            >
                              <QrCode className="h-4 w-4" />
                            </Link>
                          </IconTooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <PaginationBar
            page={safePage}
            pageSize={PAGE_SIZE}
            totalItems={filtered.length}
            onPageChange={setPage}
          />
        )}
      </Card>
    </MobiGestShell>
  );
}

function vehicleMonthlySeries(rows: VehicleRow[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0"),
      label: new Intl.DateTimeFormat("pt-MZ", { month: "short" })
        .format(date)
        .replace(".", "")
        .replace(/^./, (letter) => letter.toUpperCase()),
      total: 0,
    };
  });

  const map = new Map(months.map((item) => [item.key, item]));
  rows.forEach((row) => {
    const date = new Date(row.created_at);
    const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    const item = map.get(key);
    if (item) item.total += 1;
  });

  return months.map(({ label, total }) => ({ label, total }));
}

function vehicleTypeDistribution(rows: VehicleRow[]) {
  return ["motorizada", "carro", "bicicleta"]
    .map((type) => ({
      name: vehicleTypeLabel(type),
      value: rows.filter((row) => row.vehicle_type === type).length,
    }))
    .filter((item) => item.value > 0);
}

function vehicleStatusDistribution(rows: VehicleRow[]) {
  const statuses = ["activa", "a_venda", "roubada", "apreendida", "suspensa", "cancelada"];
  return statuses
    .map((status) => ({
      name: statusLabel(status),
      value: rows.filter((row) => displayStatusKey(row) === status).length,
    }))
    .filter((item) => item.value > 0);
}

function vehicleTypeLabel(type: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return type;
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_validacao: "Em validação",
    correccao: "Correcção",
    activa: "Activa",
    a_venda: "À venda",
    roubada: "Roubada",
    apreendida: "Apreendida",
    suspensa: "Suspensa",
    cancelada: "Cancelada",
  };
  return labels[value] ?? value;
}

function displayStatusKey(row: VehicleRow) {
  if (
    row.registrationStatus &&
    ["pendente", "em_validacao", "correccao"].includes(row.registrationStatus)
  ) {
    return row.registrationStatus;
  }

  if (row.commercial_status === "a_venda") return "a_venda";
  return row.status;
}

function VeiculosRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/veiculos">
      <Veiculos />
    </RouteIndexBoundary>
  );
}
