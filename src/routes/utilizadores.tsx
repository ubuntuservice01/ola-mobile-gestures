import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../components/MobiGestShell";
import { loadAccessProfile } from "../lib/access-control";
import { loadCurrentMunicipalAccess } from "../lib/municipal-access";
import { supabase } from "../lib/supabase";
import {
  EmptyState,
  FilterChips,
  NetworkErrorState,
  PaginationBar,
  SkeletonTable,
  StatusBadge,
} from "../components/mobigest/Experience";
import { useDebouncedValue } from "../hooks/use-debounced-value";

export const Route = createFileRoute("/utilizadores")({
  component: UsersPageRouteBoundary,
});

type UserRow = {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  status: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin_municipal: "Administrador Municipal",
  tecnico: "Técnico",
  fiscal: "Fiscal",
  financeiro: "Financeiro",
};

function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 350);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) {
        setLoadError("Sessão inválida.");
        setLoading(false);
        return;
      }

      const profile = await loadAccessProfile(user.id);
      if (!active || !profile) {
        setLoadError("Perfil MobiGest não encontrado.");
        setLoading(false);
        return;
      }

      if (profile.role === "admin_municipal") {
        setCanCreate(true);
      } else if (profile.role === "super_admin") {
        const access = await loadCurrentMunicipalAccess();
        if (!active) return;
        setCanCreate(access?.access_mode === "assistencia");
      } else {
        setCanCreate(false);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role, status")
        .neq("role", "super_admin")
        .order("full_name", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar utilizadores municipais:", error);
        setLoadError("Não foi possível carregar os utilizadores deste município.");
        setLoading(false);
        return;
      }

      setRows((data ?? []) as UserRow[]);
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
      const matchesQuery =
        !normalized ||
        [row.full_name, row.phone ?? "", ROLE_LABELS[row.role] ?? row.role]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      const matchesRole =
        roleFilter === "todos" || row.role === roleFilter;

      return matchesQuery && matchesRole;
    });
  }, [debouncedQuery, roleFilter, rows]);
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, roleFilter]);


  return (
    <MobiGestShell
      title="Utilizadores"
      subtitle="Contas autorizadas no contexto municipal actual."
    >
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Utilizadores</h2>
          <p className="mt-2 text-sm text-slate-500">
            A lista é carregada do Supabase e respeita o âmbito definido pelo RLS.
          </p>
        </div>

        {canCreate && (
          <Link
            to="/utilizadores/novo"
            className="inline-flex w-fit items-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            + Novo utilizador
          </Link>
        )}
      </div>

      {loadError && (
        <div className="mb-5">
          <NetworkErrorState
            message={loadError}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-w-0 flex-1 items-center rounded-xl border border-slate-200 px-3 sm:max-w-md">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por nome, contacto ou função..."
              className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
            />
          </label>

          <div className="flex items-center gap-3">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="todos">Todas as funções</option>
              <option value="admin_municipal">Administrador Municipal</option>
              <option value="tecnico">Técnico</option>
              <option value="fiscal">Fiscal</option>
              <option value="financeiro">Financeiro</option>
            </select>
            <span className="whitespace-nowrap text-xs font-medium text-slate-400">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <FilterChips
          items={[
            ...(roleFilter !== "todos"
              ? [
                  {
                    id: "role",
                    label: ROLE_LABELS[roleFilter] ?? roleFilter,
                    onRemove: () => setRoleFilter("todos"),
                  },
                ]
              : []),
            ...(query.trim()
              ? [
                  {
                    id: "query",
                    label: "Pesquisa: " + query.trim(),
                    onRemove: () => setQuery(""),
                  },
                ]
              : []),
          ]}
          onClear={() => {
            setQuery("");
            setRoleFilter("todos");
          }}
        />

        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={5} columns={4} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              rows.length === 0
                ? "Ainda não existem utilizadores municipais"
                : "Nenhum utilizador encontrado"
            }
            description={
              rows.length === 0
                ? "Crie o primeiro utilizador autorizado para este município."
                : "Altere a pesquisa ou os filtros para encontrar outros utilizadores."
            }
            action={
              canCreate && rows.length === 0 ? (
                <Link
                  to="/utilizadores/novo"
                  className="mobigest-button inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  + Novo utilizador
                </Link>
              ) : undefined
            }
          />
        ) : (
          pagedRows.map((row) => (
            <Link
              to="/utilizadores/$id"
              params={{ id: row.id }}
              className="mobigest-table-row flex items-center gap-4 border-b border-slate-100 p-5 hover:bg-slate-50"
              key={row.id}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                {initials(row.full_name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{row.full_name}</p>
                <p className="text-xs text-slate-500">
                  {row.phone || "Contacto não registado"}
                </p>
              </div>

              <span className="hidden rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 sm:inline-flex">
                {ROLE_LABELS[row.role] ?? row.role}
              </span>

              <span className="hidden sm:inline-flex">
                <StatusBadge status={row.status} />
              </span>

              <ShieldCheck
                className={
                  "h-4 w-4 " +
                  (row.status === "activo" ? "text-emerald-500" : "text-slate-300")
                }
              />
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </Link>
          ))
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

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function UsersPageRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/utilizadores">
      <UsersPage />
    </RouteIndexBoundary>
  );
}
