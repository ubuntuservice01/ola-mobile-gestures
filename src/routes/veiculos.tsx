import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, CarFront, Eye, QrCode, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/veiculos")({
  component: VeiculosRouteBoundary,
});

type VehicleRow = {
  id: string;
  mobigest_number: string | null;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  current_owner_id: string | null;
  administrative_post_id: string | null;
  status: string;
  commercial_status: string;
  created_at: string;
  ownerName: string;
  postName: string;
  registrationStatus: string | null;
};

function Veiculos() {
  const [rows, setRows] = useState<VehicleRow[]>([]);
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

      const [vehiclesResult, registrationsResult] = await Promise.all([
        supabase
          .from("vehicles")
          .select(
            "id, mobigest_number, vehicle_type, make, model, current_owner_id, administrative_post_id, status, commercial_status, created_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("registrations")
          .select("vehicle_id, status, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      const firstError = vehiclesResult.error ?? registrationsResult.error;
      if (firstError) {
        console.error("Falha ao carregar veículos:", firstError);
        setLoadError("Não foi possível carregar os veículos.");
        setLoading(false);
        return;
      }

      const base = vehiclesResult.data ?? [];
      const ownerIds = [
        ...new Set(base.map((row) => row.current_owner_id).filter(Boolean)),
      ] as string[];
      const postIds = [
        ...new Set(base.map((row) => row.administrative_post_id).filter(Boolean)),
      ] as string[];

      const [ownersResult, postsResult] = await Promise.all([
        ownerIds.length
          ? supabase.from("owners").select("id, full_name").in("id", ownerIds)
          : Promise.resolve({ data: [], error: null }),
        postIds.length
          ? supabase.from("administrative_posts").select("id, name").in("id", postIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!active) return;

      const relationError = ownersResult.error ?? postsResult.error;
      if (relationError) {
        console.error("Falha ao carregar relações dos veículos:", relationError);
        setLoadError(
          "Os veículos foram encontrados, mas os dados relacionados não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      const ownerMap = new Map(
        (ownersResult.data ?? []).map((owner) => [owner.id, owner.full_name]),
      );
      const postMap = new Map(
        (postsResult.data ?? []).map((post) => [post.id, post.name]),
      );
      const registrationMap = new Map<string, string>();

      for (const registration of registrationsResult.data ?? []) {
        if (registration.vehicle_id && !registrationMap.has(registration.vehicle_id)) {
          registrationMap.set(registration.vehicle_id, registration.status);
        }
      }

      setRows(
        base.map((row) => ({
          ...row,
          ownerName: row.current_owner_id
            ? ownerMap.get(row.current_owner_id) ?? "Proprietário não encontrado"
            : "Sem proprietário",
          postName: row.administrative_post_id
            ? postMap.get(row.administrative_post_id) ?? "Posto não encontrado"
            : "Sem posto",
          registrationStatus: registrationMap.get(row.id) ?? null,
        })),
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
        const searchable = [
          row.mobigest_number ?? "",
          row.make ?? "",
          row.model ?? "",
          row.ownerName,
          row.postName,
        ]
          .join(" ")
          .toLowerCase();

        const statusKey = displayStatusKey(row);

        return (
          searchable.includes(query.trim().toLowerCase()) &&
          (typeFilter === "todos" || row.vehicle_type === typeFilter) &&
          (statusFilter === "todos" || statusKey === statusFilter)
        );
      }),
    [rows, query, typeFilter, statusFilter],
  );

  return (
    <MobiGestShell
      title="Veículos"
      subtitle="Registo, consulta e acompanhamento da frota municipal."
    >
      <PageHeader
        title="Veículos"
        description="Motorizadas, carros e bicicletas visíveis no seu âmbito."
        action="+ Registar veículo"
        actionTo="/veiculos/novo"
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row">
          <div className="flex flex-1 items-center rounded-xl border border-slate-200 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por número, marca, proprietário ou posto..."
              className="h-11 flex-1 bg-transparent px-3 text-sm outline-none"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="todos">Todos os tipos</option>
            <option value="motorizada">Motorizada</option>
            <option value="carro">Carro</option>
            <option value="bicicleta">Bicicleta</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="todos">Todos os estados</option>
            <option value="pendente">Pendente</option>
            <option value="em_validacao">Em validação</option>
            <option value="correccao">Correcção</option>
            <option value="activa">Activa</option>
            <option value="a_venda">À venda</option>
            <option value="roubada">Roubada</option>
            <option value="apreendida">Apreendida</option>
            <option value="suspensa">Suspensa</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        {loadError && (
          <div className="border-b border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {loadError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {[
                  "MobiGest",
                  "Veículo",
                  "Tipo",
                  "Proprietário",
                  "Posto",
                  "Estado",
                  "Acções",
                ].map((heading) => (
                  <th className="px-5 py-3 font-semibold" key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    A carregar veículos...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    {rows.length === 0
                      ? "Ainda não existem veículos registados."
                      : "Nenhum veículo corresponde aos filtros."}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-sky-700">
                      {row.mobigest_number || "Aguardando aprovação"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {row.vehicle_type === "carro" ? (
                          <CarFront className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Bike className="h-4 w-4 text-slate-400" />
                        )}
                        {[row.make, row.model].filter(Boolean).join(" ") ||
                          vehicleTypeLabel(row.vehicle_type)}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {vehicleTypeLabel(row.vehicle_type)}
                    </td>
                    <td className="px-5 py-4">{row.ownerName}</td>
                    <td className="px-5 py-4 text-slate-500">{row.postName}</td>
                    <td className="px-5 py-4">
                      <Status row={row} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        <Link
                          to="/veiculos/$id"
                          params={{ id: row.id }}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          title="Ver ficha"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {row.mobigest_number && (
                          <Link
                            to="/imprimir/qr/$id"
                            params={{ id: row.id }}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            title="QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                          </Link>
                        )}
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

function vehicleTypeLabel(type: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return type;
}

function displayStatusKey(row: VehicleRow) {
  if (
    row.registrationStatus &&
    ["pendente", "em_validacao", "correccao"].includes(row.registrationStatus)
  ) {
    return row.registrationStatus;
  }

  if (row.commercial_status === "a_venda") return "a_venda";
  return row.status;
}

function Status({ row }: { row: VehicleRow }) {
  const value = displayStatusKey(row);
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_validacao: "Em validação",
    correccao: "Correcção",
    activa: "Activa",
    a_venda: "À venda",
    roubada: "Roubada",
    apreendida: "Apreendida",
    suspensa: "Suspensa",
    cancelada: "Cancelada",
  };

  const className =
    value === "activa"
      ? "bg-emerald-50 text-emerald-700"
      : value === "roubada" || value === "cancelada"
        ? "bg-red-50 text-red-700"
        : value === "a_venda"
          ? "bg-blue-50 text-blue-700"
          : "bg-amber-50 text-amber-700";

  return (
    <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + className}>
      {labels[value] ?? value}
    </span>
  );
}

function VeiculosRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/veiculos">
      <Veiculos />
    </RouteIndexBoundary>
  );
}
