import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Download,
  Filter,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";
import {
  AnimatedNumber,
  EmptyState,
  NetworkErrorState,
  SkeletonCard,
  SkeletonTable,
  notify,
} from "../../components/mobigest/Experience";
import { useDebouncedValue } from "../../hooks/use-debounced-value";
import { formatDateTime } from "../../lib/format";
import {
  actionLabel,
  exportAuditCsv,
  loadGlobalAuditLogs,
  roleLabel,
  type AuditLogRow,
} from "../../lib/audit";

export const Route = createFileRoute("/super-admin/auditoria")({
  component: AuditoriaGlobal,
});

function AuditoriaGlobal() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [query, setQuery] = useState("");
  const [municipalityFilter, setMunicipalityFilter] = useState("todos");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [moduleFilter, setModuleFilter] = useState("todos");
  const [resultFilter, setResultFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const debouncedQuery = useDebouncedValue(query, 350);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const data = await loadGlobalAuditLogs(2000);
        if (!active) return;
        setRows(data);
      } catch (error) {
        console.error("Falha ao carregar auditoria global:", error);
        if (!active) return;
        setLoadError(
          "Não foi possível carregar a auditoria global. Esta área exige uma sessão activa de Super Administrador.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const municipalities = useMemo(
    () =>
      [...new Set(rows.map((row) => row.municipality_name).filter(Boolean))]
        .sort(),
    [rows],
  );

  const roles = useMemo(
    () =>
      [...new Set(rows.map((row) => row.actor_role).filter(Boolean) as string[])]
        .sort(),
    [rows],
  );

  const modules = useMemo(
    () => [...new Set(rows.map((row) => row.module).filter(Boolean))].sort(),
    [rows],
  );

  const results = useMemo(
    () =>
      [...new Set(rows.map((row) => row.result).filter(Boolean) as string[])]
        .sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const haystack = [
        row.actor_name,
        row.actor_role ?? "",
        row.municipality_name,
        row.module,
        row.action,
        row.entity_type ?? "",
        row.reference ?? "",
        row.result ?? "",
        row.observation ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const rowDate = new Date(row.created_at).toISOString().slice(0, 10);

      return (
        (!normalized || haystack.includes(normalized)) &&
        (municipalityFilter === "todos" ||
          row.municipality_name === municipalityFilter) &&
        (roleFilter === "todos" || row.actor_role === roleFilter) &&
        (moduleFilter === "todos" || row.module === moduleFilter) &&
        (resultFilter === "todos" || row.result === resultFilter) &&
        (!dateFilter || rowDate === dateFilter)
      );
    });
  }, [
    rows,
    debouncedQuery,
    municipalityFilter,
    roleFilter,
    moduleFilter,
    resultFilter,
    dateFilter,
  ]);

  const metrics = useMemo(() => {
    const today = new Date();
    const todayKey = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    return {
      today: rows.filter(
        (row) => new Date(row.created_at).toISOString().slice(0, 10) === todayKey,
      ).length,
      changes: rows.filter(
        (row) => row.old_values !== null || row.new_values !== null,
      ).length,
      actors: new Set(rows.map((row) => row.actor_user_id).filter(Boolean)).size,
      failures: rows.filter(
        (row) => row.result && !["success", "sucesso"].includes(row.result),
      ).length,
    };
  }, [rows]);

  const hasFilters =
    Boolean(query) ||
    municipalityFilter !== "todos" ||
    roleFilter !== "todos" ||
    moduleFilter !== "todos" ||
    resultFilter !== "todos" ||
    Boolean(dateFilter);

  return (
    <SuperAdminShell
      title="Auditoria"
      subtitle="Visão global e imutável dos eventos registados na plataforma."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          <>
            <Kpi label="Eventos hoje" value={metrics.today} />
            <Kpi label="Eventos com alteração" value={metrics.changes} />
            <Kpi
              label="Utilizadores no histórico"
              value={metrics.actors}
            />
            <Kpi
              label="Resultados não concluídos"
              value={metrics.failures}
            />
          </>
        )}
      </div>

      <SuperCard className="mt-6 overflow-hidden">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-center">
          <div>
            <h3 className="font-semibold">Actividade global</h3>
            <p className="mt-1 text-sm text-slate-500">
              Eventos registados por todos os municípios e pela administração
              global.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex items-center rounded-xl border border-slate-200 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 min-w-0 bg-transparent px-2 text-sm outline-none sm:w-64"
                placeholder="Pesquisar..."
              />
            </label>

            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600"
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>

            <button
              type="button"
              disabled={filtered.length === 0}
              onClick={() => {
                exportAuditCsv(
                  filtered,
                  "auditoria-global-" +
                    new Date().toISOString().slice(0, 10) +
                    ".csv",
                );
                notify.success(
                  "Auditoria global exportada",
                  "O ficheiro CSV foi preparado com sucesso.",
                );
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-5">
            <select
              value={municipalityFilter}
              onChange={(event) => setMunicipalityFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="todos">Todos os municípios</option>
              {municipalities.map((municipality) => (
                <option key={municipality} value={municipality}>
                  {municipality}
                </option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="todos">Todos os perfis</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>

            <select
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="todos">Todos os módulos</option>
              {modules.map((module) => (
                <option key={module} value={module}>
                  {moduleLabel(module)}
                </option>
              ))}
            </select>

            <select
              value={resultFilter}
              onChange={(event) => setResultFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="todos">Todos os resultados</option>
              {results.map((result) => (
                <option key={result} value={result}>
                  {resultLabel(result)}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            />

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setMunicipalityFilter("todos");
                  setRoleFilter("todos");
                  setModuleFilter("todos");
                  setResultFilter("todos");
                  setDateFilter("");
                }}
                className="inline-flex items-center gap-2 text-left text-xs font-semibold text-sky-700 xl:col-span-5"
              >
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </button>
            )}
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
            <SkeletonTable rows={8} columns={6} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-5 w-5" />}
            title={
              rows.length === 0
                ? "Ainda não existem eventos de auditoria"
                : "Nenhum evento corresponde aos filtros"
            }
            description={
              rows.length === 0
                ? "Os eventos globais da plataforma aparecerão aqui à medida que forem registados."
                : "Altere a pesquisa ou limpe os filtros para consultar outros eventos."
            }
            action={
              rows.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setMunicipalityFilter("todos");
                    setRoleFilter("todos");
                    setModuleFilter("todos");
                    setResultFilter("todos");
                    setDateFilter("");
                  }}
                  className="mobigest-button rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                >
                  Limpar filtros
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <div key={row.id}>
                <div className="grid gap-3 px-5 py-5 md:grid-cols-[1.05fr_1.2fr_1fr_1.2fr_1fr_auto] md:items-center">
                  <span className="text-xs text-slate-500">
                    {formatDateTime(row.created_at)}
                  </span>

                  <div>
                    <span className="block text-sm font-semibold">
                      {row.actor_name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {roleLabel(row.actor_role)}
                    </span>
                  </div>

                  <span className="text-sm">
                    {actionLabel(row.action)}
                  </span>

                  <div>
                    <span className="block text-sm text-slate-600">
                      {row.reference || row.entity_type || "Sem referência"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {moduleLabel(row.module)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-slate-500">
                      {row.municipality_name}
                    </span>
                    <ResultBadge result={row.result} />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((current) =>
                        current === row.id ? null : row.id,
                      )
                    }
                    className="text-xs font-semibold text-sky-700"
                  >
                    {expandedId === row.id ? "Ocultar" : "Detalhes"}
                  </button>
                </div>

                {expandedId === row.id && <AuditDetail row={row} />}
              </div>
            ))}
          </div>
        )}
      </SuperCard>

      <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
        <ShieldAlert className="mr-2 inline h-4 w-4" />
        <b>Imutabilidade:</b> esta interface apenas consulta os eventos. Não
        existe operação de edição ou eliminação de registos de auditoria para
        clientes autenticados.
      </div>
    </SuperAdminShell>
  );
}

function AuditDetail({ row }: { row: AuditLogRow }) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Detail label="Módulo" value={moduleLabel(row.module)} />
        <Detail label="Entidade" value={row.entity_type || "—"} />
        <Detail label="Origem" value={row.origin || "—"} />
        <Detail label="ID entidade" value={row.entity_id || "—"} />
      </div>

      {row.observation && (
        <div className="mt-4 rounded-xl bg-white p-4">
          <p className="text-xs text-slate-400">Observação</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
            {row.observation}
          </p>
        </div>
      )}

      {(row.old_values || row.new_values) && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <JsonPanel title="Valor anterior" value={row.old_values} />
          <JsonPanel title="Novo valor" value={row.new_values} />
        </div>
      )}
    </div>
  );
}

function JsonPanel({
  title,
  value,
}: {
  title: string;
  value: Record<string, unknown> | null;
}) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
        {value ? JSON.stringify(value, null, 2) : "—"}
      </pre>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-all text-sm font-medium">{value}</p>
    </div>
  );
}

function ResultBadge({ result }: { result: string | null }) {
  const normalized = result?.toLowerCase() ?? "";
  const success = ["success", "sucesso"].includes(normalized);

  return (
    <span
      className={
        "mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold " +
        (success
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700")
      }
    >
      {resultLabel(result)}
    </span>
  );
}

function resultLabel(result: string | null) {
  if (!result) return "Sem resultado";
  if (result === "success") return "Sucesso";
  if (result === "failure") return "Falha";
  return actionLabel(result);
}

function moduleLabel(module: string) {
  const labels: Record<string, string> = {
    owners: "Proprietários",
    vehicles: "Veículos",
    registrations: "Registos",
    documents: "Documentos",
    ownership: "Transferências",
    fiscalization: "Fiscalização",
    drivers: "Taxistas / Condutores",
    fines: "Multas",
    finance: "Financeiro",
    users: "Utilizadores",
    municipalities: "Municípios",
    access: "Acesso municipal",
  };

  return labels[module] ?? actionLabel(module);
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <SuperCard className="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">
        <AnimatedNumber value={value} />
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
        <Activity className="h-3 w-3" />
        histórico carregado
      </p>
    </SuperCard>
  );
}
