import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, QrCode, Search, UserRoundCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";

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
  }, []);

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
          haystack.includes(query.trim().toLowerCase()) &&
          (typeFilter === "todos" || row.driver_type === typeFilter) &&
          (statusFilter === "todos" || row.status === statusFilter)
        );
      }),
    [rows, query, typeFilter, statusFilter],
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
        <Metric label="Registados" value={loading ? "—" : String(rows.length)} />
        <Metric
          label="Activos"
          value={
            loading
              ? "—"
              : String(rows.filter((row) => row.status === "activo").length)
          }
        />
        <Metric
          label="Suspensos / bloqueados"
          value={
            loading
              ? "—"
              : String(
                  rows.filter((row) =>
                    ["suspenso", "bloqueado"].includes(row.status),
                  ).length,
                )
          }
        />
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

        {loadError && (
          <div className="border-b border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {loadError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
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
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    A carregar taxistas/condutores...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    {rows.length === 0
                      ? "Ainda não existem taxistas/condutores registados."
                      : "Nenhum registo corresponde aos filtros."}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
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
                        <Link
                          to="/taxistas/$id"
                          params={{ id: row.id }}
                          title="QR Code / ficha"
                          className="rounded-lg p-2 text-sky-600 hover:bg-sky-50"
                        >
                          <QrCode className="h-4 w-4" />
                        </Link>
                        <Link
                          to="/taxistas/$id"
                          params={{ id: row.id }}
                          title="Ver ficha"
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
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

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    activo: "Activo",
    suspenso: "Suspenso",
    bloqueado: "Bloqueado",
    inactivo: "Inactivo",
  };

  const className =
    status === "activo"
      ? "bg-emerald-50 text-emerald-700"
      : status === "suspenso"
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";

  return (
    <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + className}>
      {labels[status] ?? status}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <UserRoundCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function TaxistasRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/taxistas">
      <Taxistas />
    </RouteIndexBoundary>
  );
}
