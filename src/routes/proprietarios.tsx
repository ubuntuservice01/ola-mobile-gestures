import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleCheck, Eye, Search, UserRound, Users } from "lucide-react";
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

export const Route = createFileRoute("/proprietarios")({
  component: PropsRouteBoundary,
});

type OwnerRow = {
  id: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  vehicles: number;
};

function Props() {
  const [rows, setRows] = useState<OwnerRow[]>([]);
  const [query, setQuery] = useState("");
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
        .from("owners")
        .select("id, full_name, document_type, document_number, phone, status, created_at")
        .order("full_name", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar proprietários:", error);
        setLoadError("Não foi possível carregar os proprietários.");
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        (data ?? []).map(async (owner) => {
          const countResult = await supabase
            .from("vehicles")
            .select("id", { count: "exact", head: true })
            .eq("current_owner_id", owner.id);

          if (countResult.error) throw countResult.error;

          return {
            ...owner,
            vehicles: countResult.count ?? 0,
          } as OwnerRow;
        }),
      ).catch((countError) => {
        console.error("Falha ao contar veículos por proprietário:", countError);
        return null;
      });

      if (!active) return;

      if (!enriched) {
        setLoadError("Os proprietários foram encontrados, mas as contagens não puderam ser carregadas.");
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
  }, [reloadKey]);

  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        [
          row.full_name,
          row.document_type ?? "",
          row.document_number ?? "",
          row.phone ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(debouncedQuery.trim().toLowerCase()),
      ),
    [rows, debouncedQuery],
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
  }, [debouncedQuery]);


  return (
    <MobiGestShell title="Proprietários">
      <ModuleHeader
        eyebrow="Cadastro municipal"
        title="Proprietários"
        description="Cidadãos associados aos veículos, processos e serviços municipais de mobilidade."
        icon={<Users />}
        action={
          <Link
            to="/proprietarios/novo"
            className="mobigest-button inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--municipal-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:-translate-y-px hover:brightness-95"
          >
            + Novo proprietário
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
              label="Proprietários"
              value={rows.length}
              icon={<Users />}
              note="Total registado"
              emphasis
            />
            <AnalyticsKpiCard
              label="Activos"
              value={rows.filter((row) => row.status === "activo").length}
              icon={<CircleCheck />}
              note="Cadastros activos"
            />
            <AnalyticsKpiCard
              label="Com veículos"
              value={rows.filter((row) => row.vehicles > 0).length}
              icon={<UserRound />}
              note="Possuem veículo associado"
            />
            <AnalyticsKpiCard
              label="Sem veículos"
              value={rows.filter((row) => row.vehicles === 0).length}
              icon={<UserRound />}
              note="Sem veículo associado"
            />
          </>
        )}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AnalyticsChartCard
          title="Novos proprietários"
          description="Cadastros criados nos últimos seis meses."
        >
          {loading ? (
            <SkeletonCard />
          ) : (
            <RegistrationsAreaChart
              data={ownerMonthlySeries(rows)}
              seriesLabel="Proprietários"
              emptyTitle="Ainda não existem cadastros no período"
            />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Situação dos cadastros"
          description="Distribuição actual por estado."
        >
          {loading ? (
            <SkeletonCard />
          ) : (
            <DistributionDonut
              data={ownerStatusDistribution(rows)}
              centerLabel="Pessoas"
            />
          )}
        </AnalyticsChartCard>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-w-0 flex-1 items-center rounded-xl border border-slate-200 px-3 sm:max-w-xl">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por nome, documento ou telefone..."
              className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
            />
          </label>
          <span className="text-xs font-medium text-slate-400">
            {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        {loadError && (
          <div className="border-b border-red-100 p-4">
            <NetworkErrorState
              message={loadError}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="mobigest-data-table w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Nome", "Documento", "Contacto", "Veículos", "Estado", "Acções"].map(
                  (heading) => (
                    <th className="px-5 py-3" key={heading}>
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4">
                    <SkeletonTable rows={6} columns={6} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title={
                        rows.length === 0
                          ? "Ainda não existem proprietários registados"
                          : "Nenhum proprietário encontrado"
                      }
                      description={
                        rows.length === 0
                          ? "Registe o primeiro proprietário para associar veículos e processos."
                          : "Tente alterar o texto da pesquisa."
                      }
                      action={
                        rows.length === 0 ? (
                          <Link
                            to="/proprietarios/novo"
                            className="mobigest-button inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                          >
                            + Novo proprietário
                          </Link>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => (
                  <tr key={row.id} className="mobigest-table-row hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-semibold">{row.full_name}</td>
                    <td className="px-5 py-4">
                      {row.document_number
                        ? [row.document_type, row.document_number]
                            .filter(Boolean)
                            .join(" · ")
                        : "—"}
                    </td>
                    <td className="px-5 py-4">{row.phone || "—"}</td>
                    <td className="px-5 py-4">{row.vehicles}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-4">
                      <IconTooltip label="Ver proprietário">
                        <Link
                          to="/proprietarios/$id"
                          params={{ id: row.id }}
                          className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          aria-label={"Abrir " + row.full_name}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </IconTooltip>
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

function ownerMonthlySeries(rows: OwnerRow[]) {
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

function ownerStatusDistribution(rows: OwnerRow[]) {
  return ["activo", "inactivo"]
    .map((status) => ({
      name: status === "activo" ? "Activos" : "Inactivos",
      value: rows.filter((row) => row.status === status).length,
    }))
    .filter((item) => item.value > 0);
}

function PropsRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/proprietarios">
      <Props />
    </RouteIndexBoundary>
  );
}
