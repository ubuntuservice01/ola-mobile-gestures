import { createFileRoute } from "@tanstack/react-router";
import {
  ClipboardCheck,
  Download,
  Filter,
  History,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
import {
  actionLabel,
  exportAuditCsv,
  loadMunicipalAuditLogs,
  roleLabel,
  type AuditLogRow,
} from "../lib/audit";

export const Route = createFileRoute("/auditoria")({
  component: Auditoria,
});

function Auditoria() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [moduleFilter, setModuleFilter] = useState("todos");
  const [resultFilter, setResultFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const data = await loadMunicipalAuditLogs(1000);
        if (!active) return;
        setRows(data);
      } catch (error) {
        console.error("Falha ao carregar auditoria municipal:", error);
        if (!active) return;
        setLoadError(
          "Não foi possível carregar a auditoria. Confirme as permissões e tente novamente.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

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
    const normalized = query.trim().toLowerCase();

    return rows.filter((row) => {
      const haystack = [
        row.actor_name,
        row.actor_role ?? "",
        row.module,
        row.action,
        row.entity_type ?? "",
        row.reference ?? "",
        row.result ?? "",
        row.observation ?? "",
        row.origin ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const rowDate = new Date(row.created_at).toISOString().slice(0, 10);

      return (
        (!normalized || haystack.includes(normalized)) &&
        (roleFilter === "todos" || row.actor_role === roleFilter) &&
        (moduleFilter === "todos" || row.module === moduleFilter) &&
        (resultFilter === "todos" || row.result === resultFilter) &&
        (!dateFilter || rowDate === dateFilter)
      );
    });
  }, [rows, query, roleFilter, moduleFilter, resultFilter, dateFilter]);

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
      actors: new Set(rows.map((row) => row.actor_user_id).filter(Boolean)).size,
      changes: rows.filter(
        (row) => row.old_values !== null || row.new_values !== null,
      ).length,
      failures: rows.filter(
        (row) => row.result && !["success", "sucesso"].includes(row.result),
      ).length,
    };
  }, [rows]);

  const hasFilters =
    Boolean(query) ||
    roleFilter !== "todos" ||
    moduleFilter !== "todos" ||
    resultFilter !== "todos" ||
    Boolean(dateFilter);

  return (
    <MobiGestShell
      title="Auditoria"
      subtitle="Rastreabilidade das acções realizadas no MobiGest."
    >
      <PageHeader
        title="Auditoria"
        description="Consulte quem realizou uma acção, quando, sobre qual registo e qual foi o resultado."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Summary
          title="Eventos hoje"
          value={loading ? "—" : String(metrics.today)}
        />
        <Summary
          title="Utilizadores no histórico"
          value={loading ? "—" : String(metrics.actors)}
        />
        <Summary
          title="Eventos com alteração"
          value={loading ? "—" : String(metrics.changes)}
        />
        <Summary
          title="Resultados não concluídos"
          value={loading ? "—" : String(metrics.failures)}
        />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex flex-1 items-center rounded-xl border border-slate-300 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full bg-transparent px-3 text-sm outline-none"
              placeholder="Pesquisar utilizador, referência, módulo ou acção..."
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? "Ocultar filtros" : "Filtros"}
            </button>

            <button
              type="button"
              disabled={filtered.length === 0}
              onClick={() =>
                exportAuditCsv(
                  filtered,
                  "auditoria-municipal-" +
                    new Date().toISOString().slice(0, 10) +
                    ".csv",
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
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
                  setRoleFilter("todos");
                  setModuleFilter("todos");
                  setResultFilter("todos");
                  setDateFilter("");
                }}
                className="inline-flex items-center gap-2 text-left text-xs font-semibold text-sky-700 xl:col-span-4"
              >
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {loadError && (
          <div className="border-b border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            A carregar auditoria...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {rows.length === 0
              ? "Ainda não existem eventos de auditoria visíveis neste município."
              : "Nenhum evento corresponde aos filtros."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <div key={row.id}>
                <div className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr_1.3fr_1.1fr_auto] md:items-center">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      <History className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {actionLabel(row.action)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(row.created_at).toLocaleString("pt-MZ")}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm">{row.actor_name}</p>
                    <p className="text-xs text-slate-400">
                      {roleLabel(row.actor_role)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      {row.reference || row.entity_type || "Sem referência"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {moduleLabel(row.module)}
                    </p>
                  </div>

                  <ResultBadge result={row.result} />

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((current) =>
                        current === row.id ? null : row.id,
                      )
                    }
                    className="text-left text-xs font-semibold text-sky-700 hover:text-sky-900"
                  >
                    {expandedId === row.id ? "Ocultar detalhes" : "Ver detalhes"}
                  </button>
                </div>

                {expandedId === row.id && (
                  <AuditDetail row={row} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-sky-600" />
          Eventos de auditoria são somente leitura nesta interface e ficam
          limitados ao município autorizado.
        </div>
      </Card>

      <Card className="mt-6 p-5">
        <div className="flex items-start gap-3">
          <ClipboardCheck className="mt-0.5 h-5 w-5 text-sky-600" />
          <div>
            <h3 className="font-semibold">Regras de auditoria</h3>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-500">
              <li>
                • Registar utilizador, perfil, município, data/hora, acção e
                entidade afectada.
              </li>
              <li>
                • Guardar referência, origem e resultado da operação.
              </li>
              <li>
                • Alterações críticas conservam valor anterior e novo quando
                aplicável.
              </li>
              <li>
                • Clientes autenticados não podem alterar ou apagar eventos de
                auditoria.
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </MobiGestShell>
  );
}

function AuditDetail({ row }: { row: AuditLogRow }) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Detail label="Município" value={row.municipality_name} />
        <Detail label="Entidade" value={row.entity_type || "—"} />
        <Detail label="Origem" value={row.origin || "—"} />
        <Detail label="ID da entidade" value={row.entity_id || "—"} />
      </div>

      {row.observation && (
        <div className="mt-4 rounded-xl bg-white p-4 text-sm">
          <p className="text-xs text-slate-400">Observação</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-600">
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
  const normalized = result?.toLowerCase() ?? "desconhecido";
  const success = ["success", "sucesso"].includes(normalized);

  return (
    <span
      className={
        "w-fit rounded-full px-2.5 py-1 text-xs font-semibold " +
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

function Summary({ title, value }: { title: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}
