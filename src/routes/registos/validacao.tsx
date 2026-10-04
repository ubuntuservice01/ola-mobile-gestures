import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronRight,
  FileCheck2,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/registos/validacao")({
  component: ValidacaoRegisto,
});

type QueueRow = {
  id: string;
  reference: string | null;
  registration_type: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  owner_id: string;
  vehicle_id: string | null;
  ownerName: string;
  vehicleLabel: string;
};

function ValidacaoRegisto() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [query, setQuery] = useState("");
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
          "id, reference, registration_type, status, submitted_at, created_at, owner_id, vehicle_id",
        )
        .in("status", ["pendente", "em_validacao", "correccao"])
        .order("submitted_at", { ascending: true, nullsFirst: true });

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar fila de validação:", error);
        setLoadError("Não foi possível carregar a fila de validação.");
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
              .select("id, vehicle_type, make, model")
              .in("id", vehicleIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!active) return;

      const relationError = ownersResult.error ?? vehiclesResult.error;
      if (relationError) {
        console.error("Falha ao enriquecer fila de validação:", relationError);
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
          } as QueueRow;
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
      rows.filter((row) =>
        [
          row.reference ?? "",
          row.ownerName,
          row.vehicleLabel,
          registrationTypeLabel(row.registration_type),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [rows, query],
  );

  return (
    <MobiGestShell
      title="Validação de registos"
      subtitle="Fila real de processos que aguardam análise ou correcção."
    >
      <Link
        to="/registos"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos registos
      </Link>

      <Card className="overflow-hidden">
        <div className="flex items-center border-b border-slate-100 p-5">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar referência, proprietário ou veículo..."
            className="h-11 flex-1 bg-transparent px-3 text-sm outline-none"
          />
        </div>

        {loadError && (
          <div className="border-b border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            A carregar fila...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {rows.length === 0
              ? "Não existem processos pendentes de validação."
              : "Nenhum processo corresponde à pesquisa."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <Link
                key={row.id}
                to="/registos/$id"
                params={{ id: row.id }}
                className="grid gap-3 p-5 hover:bg-slate-50 md:grid-cols-[auto_1.2fr_1.2fr_1fr_auto_auto] md:items-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <FileCheck2 className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    {row.reference || row.id}
                  </p>
                  <p className="text-xs text-slate-500">
                    {registrationTypeLabel(row.registration_type)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium">{row.vehicleLabel}</p>
                  <p className="text-xs text-slate-400">{row.ownerName}</p>
                </div>

                <StatusBadge status={row.status} />

                <span className="text-xs text-slate-400">
                  {new Date(row.submitted_at ?? row.created_at).toLocaleString(
                    "pt-MZ",
                  )}
                </span>

                <ChevronRight className="h-4 w-4 text-slate-300" />
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
  const label =
    status === "correccao"
      ? "Correcção"
      : status === "em_validacao"
        ? "Em validação"
        : "Pendente";

  const className =
    status === "correccao"
      ? "bg-amber-50 text-amber-700"
      : "bg-sky-50 text-sky-700";

  return (
    <span className={"w-fit rounded-full px-3 py-1 text-xs font-semibold " + className}>
      {label}
    </span>
  );
}
