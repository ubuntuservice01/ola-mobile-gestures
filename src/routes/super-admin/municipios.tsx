import { RouteIndexBoundary } from "../../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ChevronRight, MapPin, Plus, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";
import { supabase } from "../../lib/supabase";
import {
  AnimatedNumber,
  EmptyState,
  NetworkErrorState,
  SkeletonCard,
  StatusBadge,
} from "../../components/mobigest/Experience";
import { useDebouncedValue } from "../../hooks/use-debounced-value";

export const Route = createFileRoute("/super-admin/municipios")({ component: MunicipiosGlobaisRouteBoundary });

type MunicipalityRow = {
  id: string;
  name: string;
  code: string;
  province: string;
  status: string;
  users: number;
  vehicles: number;
};

function MunicipiosGlobais() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [municipalities, setMunicipalities] = useState<MunicipalityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const debouncedQuery = useDebouncedValue(query, 350);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("municipalities")
        .select("id, name, code, province, status")
        .order("name", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar municípios:", error);
        setLoadError("Não foi possível carregar os municípios.");
        setLoading(false);
        return;
      }

      const base = data ?? [];
      const enriched = await Promise.all(
        base.map(async (municipality) => {
          const [usersResult, vehiclesResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .eq("municipality_id", municipality.id),
            supabase
              .from("vehicles")
              .select("id", { count: "exact", head: true })
              .eq("municipality_id", municipality.id),
          ]);

          if (usersResult.error) throw usersResult.error;
          if (vehiclesResult.error) throw vehiclesResult.error;

          return {
            ...municipality,
            users: usersResult.count ?? 0,
            vehicles: vehiclesResult.count ?? 0,
          } as MunicipalityRow;
        }),
      ).catch((countError) => {
        console.error("Falha ao carregar contagens municipais:", countError);
        return null;
      });

      if (!active) return;

      if (!enriched) {
        setLoadError("Os municípios foram encontrados, mas não foi possível carregar as estatísticas.");
        setLoading(false);
        return;
      }

      setMunicipalities(enriched);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filtered = useMemo(
    () =>
      municipalities.filter((municipality) => {
        const matchesQuery = [municipality.name, municipality.code, municipality.province]
          .join(" ")
          .toLowerCase()
          .includes(debouncedQuery.trim().toLowerCase());

        const matchesStatus =
          status === "Todos" || municipality.status === status;

        return matchesQuery && matchesStatus;
      }),
    [municipalities, debouncedQuery, status],
  );

  return (
    <SuperAdminShell title="Municípios" subtitle="Administre as entidades municipais que utilizam o MobiGest.">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-slate-500">Administração global</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Todos os municípios</h2>
        </div>
        <Link
          to="/super-admin/municipios/novo"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" /> Novo município
        </Link>
      </div>

      <SuperCard className="mb-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por município, código ou província"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none"
            >
              <option value="Todos">Todos os estados</option>
              <option value="activo">Activo</option>
              <option value="configuracao">Configuração</option>
              <option value="suspenso">Suspenso</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>
        </div>

        {(query.trim() || status !== "Todos") && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs font-medium text-slate-400">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </span>
            {status !== "Todos" && (
              <button
                type="button"
                onClick={() => setStatus("Todos")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {municipalityStatusLabel(status)}
                <X className="h-3 w-3" />
              </button>
            )}
            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                Pesquisa: {query.trim()}
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </SuperCard>

      {loadError && (
        <div className="mb-5">
          <NetworkErrorState
            message={loadError}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <SuperCard>
          <EmptyState
            title={
              municipalities.length === 0
                ? "Ainda não existe nenhum município registado"
                : "Nenhum município encontrado"
            }
            description={
              municipalities.length === 0
                ? "Crie o primeiro município para iniciar a configuração da plataforma."
                : "Tente alterar a pesquisa ou o filtro de estado."
            }
            action={
              municipalities.length === 0 ? (
                <Link
                  to="/super-admin/municipios/novo"
                  className="mobigest-button inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" /> Criar primeiro município
                </Link>
              ) : undefined
            }
          />
        </SuperCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((municipality) => (
            <Link
              key={municipality.id}
              to="/super-admin/municipios/$id"
              params={{ id: municipality.id }}
              className="group"
            >
              <SuperCard className="mobigest-card-interactive h-full p-5 group-hover:border-sky-200">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{municipality.name}</h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {municipality.province} · Código {municipality.code}
                        </p>
                      </div>
                      <StatusBadge status={municipality.status} label={municipalityStatusLabel(municipality.status)} />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <Users className="h-4 w-4 text-slate-400" />
                        <p className="mt-2 text-lg font-bold"><AnimatedNumber value={municipality.users} /></p>
                        <p className="text-xs text-slate-500">Utilizadores</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <p className="mt-2 text-lg font-bold"><AnimatedNumber value={municipality.vehicles} /></p>
                        <p className="text-xs text-slate-500">Veículos</p>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="mt-2 h-4 w-4 text-slate-300 group-hover:text-sky-500" />
                </div>
              </SuperCard>
            </Link>
          ))}
        </div>
      )}
    </SuperAdminShell>
  );
}

function municipalityStatusLabel(status: string) {
  const labels: Record<string, string> = {
    activo: "Activo",
    configuracao: "Configuração",
    suspenso: "Suspenso",
    inactivo: "Inactivo",
  };
  return labels[status] ?? status;
}

function MunicipiosGlobaisRouteBoundary() {
  return <RouteIndexBoundary pattern="/super-admin/municipios"><MunicipiosGlobais /></RouteIndexBoundary>;
}
