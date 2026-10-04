import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, FileText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";

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
  }, []);

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
          haystack.includes(query.trim().toLowerCase()) &&
          (statusFilter === "todos" || row.status === statusFilter)
        );
      }),
    [rows, query, statusFilter],
  );

  return (
    <MobiGestShell
      title="Registos"
      subtitle="Processos municipais de registo inicial e transferência."
    >
      <PageHeader
        title="Registos"
        description="Acompanhe submissão, validação, correcção, aprovação e rejeição."
        action="+ Registar veículo"
        actionTo="/veiculos/novo"
      />

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

        {loadError && (
          <div className="border-b border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            A carregar processos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {rows.length === 0
              ? "Ainda não existem processos de registo."
              : "Nenhum processo corresponde aos filtros."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <Link
                key={row.id}
                to="/registos/$id"
                params={{ id: row.id }}
                className="grid gap-3 p-5 transition hover:bg-slate-50 md:grid-cols-[auto_1.3fr_1fr_1fr_auto_auto] md:items-center"
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
                  {new Date(row.submitted_at ?? row.created_at).toLocaleDateString(
                    "pt-MZ",
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </MobiGestShell>
  );
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

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_validacao: "Em validação",
    correccao: "Correcção",
    aprovada: "Aprovada",
    rejeitada: "Rejeitada",
    cancelada: "Cancelada",
  };

  const className =
    status === "aprovada"
      ? "bg-emerald-50 text-emerald-700"
      : status === "rejeitada" || status === "cancelada"
        ? "bg-rose-50 text-rose-700"
        : status === "correccao"
          ? "bg-amber-50 text-amber-700"
          : "bg-sky-50 text-sky-700";

  return (
    <span className={"w-fit rounded-full px-3 py-1 text-xs font-semibold " + className}>
      {labels[status] ?? status}
    </span>
  );
}

function RegistosRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/registos">
      <Registos />
    </RouteIndexBoundary>
  );
}
