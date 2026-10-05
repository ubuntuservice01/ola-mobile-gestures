import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Ban,
  CircleCheck,
  Eye,
  QrCode,
  Search,
  ShieldAlert,
  UserRoundCheck,
  Users,
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

export const Route = createFileRoute("/taxistas")({
  component: TaxistasRouteBoundary,
});

type DriverRow = {
  id: string;
  reference: string;
  full_name: string;
  phone: string | null;
  driver_type: string;
  locality_id: string | null;
  status: string;
  created_at: string;
  vehicleId: string | null;
  vehicleNumber: string;
  localityName: string;
};

function Taxistas() {
  const [rows, setRows] = useState<DriverRow[]>([]);
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

      const [driversResult, linksResult, localitiesResult] = await Promise.all([
        supabase
          .from("drivers")
          .select(
            "id, reference, full_name, phone, driver_type, locality_id, status, created_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("driver_vehicles")
          .select("driver_id, vehicle_id, is_primary, status")
          .eq("status", "activo"),
        supabase.from("localities").select("id, name"),
      ]);

      if (!active) return;

      const error =
        driversResult.error ?? linksResult.error ?? localitiesResult.error;

      if (error) {
        console.error("Falha ao carregar taxistas/condutores:", error);
        setLoadError("Não foi possível carregar taxistas/condutores.");
        setLoading(false);
        return;
      }

      const activeLinks = new Map<string, string>();
      for (const link of linksResult.data ?? []) {
        if (link.is_primary || !activeLinks.has(link.driver_id)) {
          activeLinks.set(link.driver_id, link.vehicle_id);
        }
      }

      const vehicleIds = [...new Set(activeLinks.values())];
      const vehiclesResult = vehicleIds.length
        ? await supabase
            .from("vehicles")
            .select("id, mobigest_number")
            .in("id", vehicleIds)
        : { data: [], error: null };

      if (!active) return;

      if (vehiclesResult.error) {
        console.error("Falha ao carregar veículos dos condutores:", vehiclesResult.error);
        setLoadError("Não foi possível carregar os veículos associados.");
        setLoading(false);
        return;
      }

      const vehicleMap = new Map(
        (vehiclesResult.data ?? []).map((vehicle) => [
          vehicle.id,
          vehicle.mobigest_number ?? "Sem número MobiGest",
        ]),
      );
      const localityMap = new Map(
        (localitiesResult.data ?? []).map((locality) => [
          locality.id,
          locality.name,
        ]),
      );

      setRows(
        (driversResult.data ?? []).map((driver) => {
          const vehicleId = activeLinks.get(driver.id) ?? null;
          return {
            ...driver,
            vehicleId,
            vehicleNumber: vehicleId
              ? vehicleMap.get(vehicleId) ?? "Veículo não encontrado"
              : "Sem veículo",
            localityName: driver.locality_id
              ? localityMap.get(driver.locality_id) ?? "Localidade não encontrada"
              : "Não definida",
          } as DriverRow;
        }),
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
        const haystack = [
          row.reference,
          row.full_name,
          row.phone ?? "",
          row.vehicleNumber,
          row.localityName,
        ]
          .join(" ")
          .toLowerCase();

        return (
          haystack.includes(debouncedQuery.trim().toLowerCase()) &&
          (typeFilter === "todos" || row.driver_type === typeFilter) &&
          (statusFilter === "todos" || row.status === statusFilter)
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
      title="Taxistas / Condutores"
      subtitle="Gestão e identificação dos condutores registados no município."
    >
      <ModuleHeader
        eyebrow="Gestão de condutores"
        title="Taxistas / Condutores"
        description="MTX identifica taxistas e mototaxistas; CDT identifica os restantes condutores autorizados."
        icon={<UserRoundCheck />}
        action={
          <Link
            to="/taxistas/novo"
            className="mobigest-button inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--municipal-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:-translate-y-px hover:brightness-95"
          >
            + Novo taxista / condutor
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
              label="Registados"
              value={rows.length}
              icon={<Users />}
              note="Todos os condutores"
            />
            <AnalyticsKpiCard
              label="Activos"
              value={rows.filter((row) => row.status === "activo").length}
              icon={<CircleCheck />}
              note="Em operação"
              emphasis
            />
            <AnalyticsKpiCard
              label="Suspensos"
              value={rows.filter((row) => row.status === "suspenso").length}
              icon={<ShieldAlert />}
              note="Acesso suspenso"
            />
            <AnalyticsKpiCard
              label="Bloqueados"
              value={rows.filter((row) => row.status === "bloqueado").length}
              icon={<Ban />}
              note="Acesso bloqueado"
            />
          </>
        )}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr_0.85fr]">
        <AnalyticsChartCard
          title="Novos registos"
          description="Evolução de taxistas e condutores registados nos últimos seis meses."
        >
          {loading ? (
            <SkeletonCard />
          ) : (
            <RegistrationsAreaChart data={driverMonthlySeries(rows)} />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Por estado"
          description="Situação operacional dos condutores."
        >
          {loading ? (
            <SkeletonCard />
          ) : (
            <DistributionDonut
              data={driverStatusDistribution(rows)}
              centerLabel="Condutores"
            />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Por tipo"
          description="Distribuição entre MTX e outros condutores."
        >
          {loading ? (
            <SkeletonCard />
          ) : (
            <DistributionDonut
              data={driverTypeDistribution(rows)}
              centerLabel="Registos"
            />
          )}
        </AnalyticsChartCard>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row">
          <label className="flex flex-1 items-center rounded-xl border border-slate-200 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por nome, referência, telefone ou veículo..."
              className="h-11 flex-1 bg-transparent px-3 text-sm outline-none"
            />
          </label>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="todos">Todos os tipos</option>
            <option value="mototaxista">Mototaxista</option>
            <option value="taxista">Taxista</option>
            <option value="condutor">Condutor</option>
            <option value="outro">Outro</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="todos">Todos os estados</option>
            <option value="activo">Activo</option>
            <option value="suspenso">Suspenso</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>

        {(query.trim() ||
          typeFilter !== "todos" ||
          statusFilter !== "todos") && (
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
                {driverTypeLabel(typeFilter)}
                <X className="h-3 w-3" />
              </button>
            )}
            {statusFilter !== "todos" && (
              <button
                type="button"
                onClick={() => setStatusFilter("todos")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {driverStatusLabel(statusFilter)}
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
          <table className="mobigest-data-table w-full min-w-[900px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {[
                  "Referência",
                  "Nome",
                  "Tipo",
                  "Contacto",
                  "Veículo",
                  "Zona",
                  "Estado",
                  "Acções",
                ].map((heading) => (
                  <th className="px-5 py-3" key={heading}>
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
                          ? "Ainda não existem taxistas/condutores registados"
                          : "Nenhum registo encontrado"
                      }
                      description={
                        rows.length === 0
                          ? "Registe o primeiro condutor para gerar a identificação profissional."
                          : "Tente alterar a pesquisa ou limpar os filtros."
                      }
                      action={
                        rows.length === 0 ? (
                          <Link
                            to="/taxistas/novo"
                            className="mobigest-button inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                          >
                            + Novo taxista / condutor
                          </Link>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => (
                  <tr key={row.id} className="mobigest-table-row hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-bold text-sky-700">
                      {row.reference}
                    </td>
                    <td className="px-5 py-4 font-semibold">{row.full_name}</td>
                    <td className="px-5 py-4">{driverTypeLabel(row.driver_type)}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {row.phone || "—"}
                    </td>
                    <td className="px-5 py-4">{row.vehicleNumber}</td>
                    <td className="px-5 py-4">{row.localityName}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <IconTooltip label="QR Code / ficha">
                          <Link
                            to="/taxistas/$id"
                            params={{ id: row.id }}
                            className="rounded-lg p-2 text-sky-600 hover:bg-sky-50"
                            aria-label={"Abrir QR e ficha de " + row.full_name}
                          >
                            <QrCode className="h-4 w-4" />
                          </Link>
                        </IconTooltip>
                        <IconTooltip label="Ver ficha">
                          <Link
                            to="/taxistas/$id"
                            params={{ id: row.id }}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            aria-label={"Ver ficha de " + row.full_name}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </IconTooltip>
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

function driverTypeLabel(type: string) {
  const labels: Record<string, string> = {
    mototaxista: "Mototaxista",
    taxista: "Taxista",
    condutor: "Condutor",
    outro: "Outro",
  };
  return labels[type] ?? type;
}

function driverMonthlySeries(rows: DriverRow[]) {
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

function driverStatusDistribution(rows: DriverRow[]) {
  const statuses = ["activo", "suspenso", "bloqueado", "inactivo"];
  return statuses
    .map((status) => ({
      name: driverStatusLabel(status),
      value: rows.filter((row) => row.status === status).length,
    }))
    .filter((item) => item.value > 0);
}

function driverTypeDistribution(rows: DriverRow[]) {
  const types = ["mototaxista", "taxista", "condutor", "outro"];
  return types
    .map((type) => ({
      name: driverTypeLabel(type),
      value: rows.filter((row) => row.driver_type === type).length,
    }))
    .filter((item) => item.value > 0);
}

function driverStatusLabel(status: string) {
  const labels: Record<string, string> = {
    activo: "Activo",
    suspenso: "Suspenso",
    bloqueado: "Bloqueado",
    inactivo: "Inactivo",
  };
  return labels[status] ?? status;
}

function TaxistasRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/taxistas">
      <Taxistas />
    </RouteIndexBoundary>
  );
}
