import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, QrCode, Search, UserRoundCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";
import {
  AnimatedNumber,
  EmptyState,
  IconTooltip,
  NetworkErrorState,
  SkeletonCard,
  SkeletonTable,
  StatusBadge,
} from "../components/mobigest/Experience";
import { useDebouncedValue } from "../hooks/use-debounced-value";

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
            "id, reference, full_name, phone, driver_type, locality_id, status",
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

  return (
    <MobiGestShell
      title="Taxistas / Condutores"
      subtitle="Gestão e identificação dos condutores registados no município."
    >
      <PageHeader
        title="Taxistas / Condutores"
        description="MTX identifica taxistas/mototaxistas; CDT identifica outros condutores."
        action="+ Novo taxista / condutor"
        actionTo="/taxistas/novo"
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          <>
            <Metric label="Registados" value={rows.length} />
            <Metric
              label="Activos"
              value={rows.filter((row) => row.status === "activo").length}
            />
            <Metric
              label="Suspensos / bloqueados"
              value={
                rows.filter((row) =>
                  ["suspenso", "bloqueado"].includes(row.status),
                ).length
              }
            />
          </>
        )}
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
          <table className="w-full min-w-[900px] text-left text-sm">
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
                filtered.map((row) => (
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <UserRoundCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-bold">
            <AnimatedNumber value={value} />
          </p>
        </div>
      </div>
    </Card>
  );
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
