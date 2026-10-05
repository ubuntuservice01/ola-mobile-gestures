import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CircleCheck,
  ChevronRight,
  Clock3,
  ReceiptText,
  Search,
  Settings2,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";
import {
  EmptyState,
  NetworkErrorState,
  PaginationBar,
  SkeletonCard,
  SkeletonTable,
  StatusBadge,
} from "../components/mobigest/Experience";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import { formatDateTime, formatMoneyMt } from "../lib/format";
import {
  AnalyticsChartCard,
  AnalyticsKpiCard,
  DistributionDonut,
  ModuleHeader,
  RegistrationsAreaChart,
} from "../components/mobigest/Analytics";

export const Route = createFileRoute("/multas")({
  component: MultasRouteBoundary,
});

type FineRow = {
  id: string;
  reference: string;
  driver_id: string;
  vehicle_id: string | null;
  fine_type_id: string;
  charge_id: string | null;
  applied_amount: number;
  location: string | null;
  occurred_at: string;
  status: string;
  driverReference: string;
  driverName: string;
  fineTypeName: string;
  fineTypeCode: string;
  vehicleNumber: string;
};

function Multas() {
  const [rows, setRows] = useState<FineRow[]>([]);
  const [query, setQuery] = useState("");
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

      const { data, error } = await supabase
        .from("fines")
        .select(
          "id, reference, driver_id, vehicle_id, fine_type_id, charge_id, applied_amount, location, occurred_at, status",
        )
        .order("occurred_at", { ascending: false })
        .limit(500);

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar multas:", error);
        setLoadError("Não foi possível carregar as multas.");
        setLoading(false);
        return;
      }

      const base = data ?? [];
      const driverIds = [
        ...new Set(base.map((row) => row.driver_id).filter(Boolean)),
      ];
      const fineTypeIds = [
        ...new Set(base.map((row) => row.fine_type_id).filter(Boolean)),
      ];
      const vehicleIds = [
        ...new Set(base.map((row) => row.vehicle_id).filter(Boolean)),
      ] as string[];

      const [driversResult, typesResult, vehiclesResult] = await Promise.all([
        driverIds.length
          ? supabase
              .from("drivers")
              .select("id, reference, full_name")
              .in("id", driverIds)
          : Promise.resolve({ data: [], error: null }),
        fineTypeIds.length
          ? supabase
              .from("fine_types")
              .select("id, code, name")
              .in("id", fineTypeIds)
          : Promise.resolve({ data: [], error: null }),
        vehicleIds.length
          ? supabase
              .from("vehicles")
              .select("id, mobigest_number")
              .in("id", vehicleIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!active) return;

      const relationError =
        driversResult.error ?? typesResult.error ?? vehiclesResult.error;

      if (relationError) {
        console.error("Falha ao enriquecer multas:", relationError);
        setLoadError(
          "As multas foram encontradas, mas os dados relacionados não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      const driverMap = new Map(
        (driversResult.data ?? []).map((driver) => [driver.id, driver]),
      );
      const typeMap = new Map(
        (typesResult.data ?? []).map((type) => [type.id, type]),
      );
      const vehicleMap = new Map(
        (vehiclesResult.data ?? []).map((vehicle) => [
          vehicle.id,
          vehicle.mobigest_number ?? "Sem número MobiGest",
        ]),
      );

      setRows(
        base.map((row) => {
          const driver = driverMap.get(row.driver_id);
          const fineType = typeMap.get(row.fine_type_id);

          return {
            ...row,
            driverReference: driver?.reference ?? "Condutor não encontrado",
            driverName: driver?.full_name ?? "Condutor não encontrado",
            fineTypeName: fineType?.name ?? "Tipo de multa não encontrado",
            fineTypeCode: fineType?.code ?? "—",
            vehicleNumber: row.vehicle_id
              ? vehicleMap.get(row.vehicle_id) ?? "Veículo não encontrado"
              : "Sem veículo",
          } as FineRow;
        }),
      );

      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const haystack = [
        row.reference,
        row.driverReference,
        row.driverName,
        row.fineTypeName,
        row.fineTypeCode,
        row.vehicleNumber,
        row.location ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalized || haystack.includes(normalized)) &&
        (statusFilter === "todos" || row.status === statusFilter)
      );
    });
  }, [rows, debouncedQuery, statusFilter]);

  const metrics = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((row) =>
        ["pendente", "em_recurso"].includes(row.status),
      ).length,
      paid: rows.filter((row) => row.status === "paga").length,
      pendingAmount: rows
        .filter((row) => ["pendente", "em_recurso"].includes(row.status))
        .reduce((sum, row) => sum + Number(row.applied_amount || 0), 0),
    }),
    [rows],
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
  }, [debouncedQuery, statusFilter]);


  return (
    <MobiGestShell
      title="Multas"
      subtitle="Infracções aplicadas a taxistas e outros condutores."
    >
      <ModuleHeader
        eyebrow="Fiscalização"
        title="Multas"
        description="Emissão, acompanhamento e situação financeira das infracções registadas no município."
        icon={<ReceiptText />}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/multas/tipos"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Settings2 className="h-4 w-4" />
              Tipos de multa
            </Link>
            <Link
              to="/multas/nova"
              className="mobigest-button inline-flex items-center gap-2 rounded-xl bg-[var(--municipal-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:-translate-y-px hover:brightness-95"
            >
              + Aplicar multa
            </Link>
          </div>
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
              label="Multas emitidas"
              value={metrics.total}
              icon={<ReceiptText />}
              note="Total registado"
              emphasis
            />
            <AnalyticsKpiCard
              label="Pendentes / recurso"
              value={metrics.pending}
              icon={<Clock3 />}
              note="Aguardam resolução"
            />
            <AnalyticsKpiCard
              label="Pagas"
              value={metrics.paid}
              icon={<CircleCheck />}
              note="Regularizadas"
            />
            <AnalyticsKpiCard
              label="Valor pendente"
              value={metrics.pendingAmount}
              icon={<Wallet />}
              formatter={formatMoneyMt}
              note="Montante por cobrar"
            />
          </>
        )}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <AnalyticsChartCard
          title="Multas ao longo do tempo"
          description="Novas infracções registadas nos últimos seis meses."
        >
          {loading ? (
            <SkeletonCard />
          ) : (
            <RegistrationsAreaChart
              data={fineMonthlySeries(rows)}
              seriesLabel="Multas"
              emptyTitle="Ainda não existem multas no período"
            />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Multas por estado"
          description="Distribuição entre pendentes, pagas, anuladas e em recurso."
        >
          {loading ? (
            <SkeletonCard />
          ) : (
            <DistributionDonut
              data={fineStatusDistribution(rows)}
              centerLabel="Multas"
            />
          )}
        </AnalyticsChartCard>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row">
          <label className="flex flex-1 items-center rounded-xl border border-slate-200 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar multa, condutor, veículo ou infracção..."
              className="h-11 flex-1 bg-transparent px-3 text-sm outline-none"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="todos">Todos os estados</option>
            <option value="pendente">Pendente</option>
            <option value="paga">Paga</option>
            <option value="anulada">Anulada</option>
            <option value="em_recurso">Em recurso</option>
          </select>
        </div>

        {(query.trim() || statusFilter !== "todos") && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
            <span className="text-xs font-medium text-slate-400">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </span>
            {statusFilter !== "todos" && (
              <button
                type="button"
                onClick={() => setStatusFilter("todos")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {fineStatusLabel(statusFilter)}
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
          <table className="mobigest-data-table w-full min-w-[1000px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {[
                  "Multa",
                  "Condutor",
                  "Infracção",
                  "Veículo",
                  "Valor",
                  "Data",
                  "Estado",
                  "",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-3">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-4">
                    <SkeletonTable rows={6} columns={8} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title={
                        rows.length === 0
                          ? "Ainda não existem multas emitidas"
                          : "Nenhuma multa encontrada"
                      }
                      description={
                        rows.length === 0
                          ? "As multas emitidas pelos fiscais aparecerão aqui."
                          : "Tente alterar a pesquisa ou limpar os filtros."
                      }
                      action={
                        rows.length === 0 ? (
                          <Link
                            to="/multas/nova"
                            className="mobigest-button inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                          >
                            + Aplicar multa
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setQuery("");
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
                    <td className="px-5 py-4 font-bold text-sky-700">
                      <Link to="/multas/$id" params={{ id: row.id }}>
                        {row.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{row.driverReference}</p>
                      <p className="text-xs text-slate-400">{row.driverName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{row.fineTypeName}</p>
                      <p className="text-xs text-slate-400">{row.fineTypeCode}</p>
                    </td>
                    <td className="px-5 py-4">{row.vehicleNumber}</td>
                    <td className="px-5 py-4 font-semibold">
                      {formatMoneyMt(row.applied_amount)}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {formatDateTime(row.occurred_at)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to="/multas/$id"
                        params={{ id: row.id }}
                        aria-label={"Abrir " + row.reference}
                      >
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </Link>
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

function fineMonthlySeries(rows: FineRow[]) {
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
    const date = new Date(row.occurred_at);
    const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    const item = map.get(key);
    if (item) item.total += 1;
  });

  return months.map(({ label, total }) => ({ label, total }));
}

function fineStatusDistribution(rows: FineRow[]) {
  return ["pendente", "paga", "em_recurso", "anulada"]
    .map((status) => ({
      name: fineStatusLabel(status),
      value: rows.filter((row) => row.status === status).length,
    }))
    .filter((item) => item.value > 0);
}

function fineStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    paga: "Paga",
    anulada: "Anulada",
    em_recurso: "Em recurso",
  };
  return labels[status] ?? status;
}

function MultasRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/multas">
      <Multas />
    </RouteIndexBoundary>
  );
}
