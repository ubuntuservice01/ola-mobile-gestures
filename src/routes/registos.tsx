import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CircleCheck,
  ChevronRight,
  Clock3,
  FileText,
  Search,
  ShieldAlert,
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
import { formatDate } from "../lib/format";
import {
  AnalyticsChartCard,
  AnalyticsKpiCard,
  DistributionDonut,
  ModuleHeader,
  RegistrationsAreaChart,
} from "../components/mobigest/Analytics";

export const Route = createFileRoute("/registos")({
  component: RegistosRouteBoundary,
});

type RegistrationRow = {
  id: string;
  reference: string | null;
  registration_type: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  vehicle_id: string | null;
  owner_id: string;
  ownerName: string;
  vehicleLabel: string;
  mobigestNumber: string | null;
};

function Registos() {
  const [rows, setRows] = useState<RegistrationRow[]>([]);
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
        .from("registrations")
        .select(
          "id, reference, registration_type, status, created_at, submitted_at, vehicle_id, owner_id",
        )
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar processos de registo:", error);
        setLoadError("Não foi possível carregar os processos de registo.");
        setLoading(false);
        return;
      }

      const base = data ?? [];
      const ownerIds = [...new Set(base.map((row) => row.owner_id).filter(Boolean))];
      const vehicleIds = [
        ...new Set(base.map((row) => row.vehicle_id).filter(Boolean)),
      ] as string[];

      const [ownersResult, vehiclesResult] = await Promise.all([
        ownerIds.length
          ? supabase.from("owners").select("id, full_name").in("id", ownerIds)
          : Promise.resolve({ data: [], error: null }),
        vehicleIds.length
          ? supabase
              .from("vehicles")
              .select("id, mobigest_number, vehicle_type, make, model")
              .in("id", vehicleIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!active) return;

      const relationError = ownersResult.error ?? vehiclesResult.error;
      if (relationError) {
        console.error("Falha ao enriquecer processos de registo:", relationError);
        setLoadError(
          "Os processos foram encontrados, mas os dados relacionados não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      const ownerMap = new Map(
        (ownersResult.data ?? []).map((owner) => [owner.id, owner.full_name]),
      );
      const vehicleMap = new Map(
        (vehiclesResult.data ?? []).map((vehicle) => [vehicle.id, vehicle]),
      );

      setRows(
        base.map((registration) => {
          const vehicle = registration.vehicle_id
            ? vehicleMap.get(registration.vehicle_id)
            : null;

          return {
            ...registration,
            ownerName:
              ownerMap.get(registration.owner_id) ?? "Proprietário não encontrado",
            vehicleLabel:
              [vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ||
              vehicleTypeLabel(vehicle?.vehicle_type),
            mobigestNumber: vehicle?.mobigest_number ?? null,
          } as RegistrationRow;
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
          row.reference ?? "",
          row.ownerName,
          row.vehicleLabel,
          row.mobigestNumber ?? "",
          registrationTypeLabel(row.registration_type),
        ]
          .join(" ")
          .toLowerCase();

        return (
          haystack.includes(debouncedQuery.trim().toLowerCase()) &&
          (statusFilter === "todos" || row.status === statusFilter)
        );
      }),
    [rows, debouncedQuery, statusFilter],
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
      title="Registos"
      subtitle="Processos municipais de registo inicial e transferência."
    >
      <ModuleHeader
        eyebrow="Processos municipais"
        title="Registos"
        description="Submissão, validação, correcção, aprovação e rejeição dos processos de mobilidade."
        icon={<FileText />}
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
              label="Processos"
              value={rows.length}
              icon={<FileText />}
              note="Total registado"
              emphasis
            />
            <AnalyticsKpiCard
              label="Pendentes / validação"
              value={rows.filter((row) => ["pendente", "em_validacao", "correccao"].includes(row.status)).length}
              icon={<Clock3 />}
              note="Aguardam decisão"
            />
            <AnalyticsKpiCard
              label="Aprovados"
              value={rows.filter((row) => row.status === "aprovada").length}
              icon={<CircleCheck />}
              note="Concluídos"
            />
            <AnalyticsKpiCard
              label="Rejeitados"
              value={rows.filter((row) => row.status === "rejeitada").length}
              icon={<ShieldAlert />}
              note="Não aprovados"
            />
          </>
        )}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AnalyticsChartCard
          title="Processos ao longo do tempo"
          description="Novos processos criados nos últimos seis meses."
        >
          {loading ? (
            <SkeletonCard />
          ) : (
            <RegistrationsAreaChart
              data={registrationMonthlySeries(rows)}
              seriesLabel="Processos"
              emptyTitle="Ainda não existem processos no período"
            />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Processos por estado"
          description="Distribuição actual do fluxo de validação."
        >
          {loading ? (
            <SkeletonCard />
          ) : (
            <DistributionDonut
              data={registrationStatusDistribution(rows)}
              centerLabel="Processos"
            />
          )}
        </AnalyticsChartCard>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row">
          <label className="flex flex-1 items-center rounded-xl border border-slate-200 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar referência, proprietário ou veículo..."
              className="h-11 flex-1 bg-transparent px-3 text-sm outline-none"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="todos">Todos os estados</option>
            <option value="pendente">Pendente</option>
            <option value="em_validacao">Em validação</option>
            <option value="correccao">Correcção</option>
            <option value="aprovada">Aprovada</option>
            <option value="rejeitada">Rejeitada</option>
            <option value="cancelada">Cancelada</option>
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
                {registrationStatusLabel(statusFilter)}
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

        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={6} columns={6} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              rows.length === 0
                ? "Ainda não existem processos de registo"
                : "Nenhum processo encontrado"
            }
            description={
              rows.length === 0
                ? "Os processos de registo inicial e transferência aparecerão aqui."
                : "Tente alterar a pesquisa ou limpar os filtros."
            }
            action={
              rows.length === 0 ? (
                <Link
                  to="/veiculos/novo"
                  className="mobigest-button inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Registar veículo
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {pagedRows.map((row) => (
              <Link
                key={row.id}
                to="/registos/$id"
                params={{ id: row.id }}
                className="mobigest-table-row grid gap-3 p-5 hover:bg-slate-50 md:grid-cols-[auto_1.3fr_1fr_1fr_auto_auto] md:items-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                  <FileText className="h-5 w-5 text-slate-500" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {row.reference || row.id}
                  </p>
                  <p className="text-xs text-slate-500">
                    {registrationTypeLabel(row.registration_type)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium">{row.vehicleLabel}</p>
                  <p className="text-xs text-slate-400">
                    {row.mobigestNumber || "Sem número MobiGest"}
                  </p>
                </div>

                <p className="text-sm text-slate-600">{row.ownerName}</p>

                <StatusBadge status={row.status} />

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {formatDate(row.submitted_at ?? row.created_at)}
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
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

function registrationMonthlySeries(rows: RegistrationRow[]) {
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

function registrationStatusDistribution(rows: RegistrationRow[]) {
  return ["pendente", "em_validacao", "correccao", "aprovada", "rejeitada", "cancelada"]
    .map((status) => ({
      name: registrationStatusLabel(status),
      value: rows.filter((row) => row.status === status).length,
    }))
    .filter((item) => item.value > 0);
}

function registrationTypeLabel(type: string) {
  return type === "transferencia" ? "Transferência" : "Registo inicial";
}

function vehicleTypeLabel(type?: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return "Veículo";
}

function registrationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_validacao: "Em validação",
    correccao: "Correcção",
    aprovada: "Aprovada",
    rejeitada: "Rejeitada",
    cancelada: "Cancelada",
  };
  return labels[status] ?? status;
}

function RegistosRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/registos">
      <Registos />
    </RouteIndexBoundary>
  );
}
