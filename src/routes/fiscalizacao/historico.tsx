import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  Search,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/fiscalizacao/historico")({
  component: HistoricoFiscalizacao,
});

type Row = {
  id: string;
  vehicle_id: string;
  result: string;
  occurrence: string | null;
  observation: string | null;
  evidence_count: number;
  occurred_at: string;
  administrative_post_id: string | null;
  locality_id: string | null;
  fiscal_id: string | null;
  vehicleNumber: string;
  vehicleType: string;
  vehicleLabel: string;
  postName: string;
  localityName: string;
  fiscalName: string;
};

function HistoricoFiscalizacao() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [resultFilter, setResultFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("fiscalizations")
        .select(
          "id, vehicle_id, result, occurrence, observation, evidence_count, occurred_at, administrative_post_id, locality_id, fiscal_id",
        )
        .order("occurred_at", { ascending: false })
        .limit(500);

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar histórico de fiscalização:", error);
        setLoadError("Não foi possível carregar o histórico de fiscalização.");
        setLoading(false);
        return;
      }

      const base = data ?? [];
      const vehicleIds = [...new Set(base.map((row) => row.vehicle_id))];
      const postIds = [
        ...new Set(base.map((row) => row.administrative_post_id).filter(Boolean)),
      ] as string[];
      const localityIds = [
        ...new Set(base.map((row) => row.locality_id).filter(Boolean)),
      ] as string[];
      const fiscalIds = [
        ...new Set(base.map((row) => row.fiscal_id).filter(Boolean)),
      ] as string[];

      const [vehiclesResult, postsResult, localitiesResult, fiscalsResult] =
        await Promise.all([
          vehicleIds.length
            ? supabase
                .from("vehicles")
                .select("id, mobigest_number, vehicle_type, make, model")
                .in("id", vehicleIds)
            : Promise.resolve({ data: [], error: null }),
          postIds.length
            ? supabase
                .from("administrative_posts")
                .select("id, name")
                .in("id", postIds)
            : Promise.resolve({ data: [], error: null }),
          localityIds.length
            ? supabase
                .from("localities")
                .select("id, name")
                .in("id", localityIds)
            : Promise.resolve({ data: [], error: null }),
          fiscalIds.length
            ? supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", fiscalIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (!active) return;

      const relationError =
        vehiclesResult.error ??
        postsResult.error ??
        localitiesResult.error ??
        fiscalsResult.error;

      if (relationError) {
        console.error(
          "Falha ao enriquecer histórico de fiscalização:",
          relationError,
        );
        setLoadError(
          "As fiscalizações foram encontradas, mas os dados relacionados não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      const vehicleMap = new Map(
        (vehiclesResult.data ?? []).map((vehicle) => [vehicle.id, vehicle]),
      );
      const postMap = new Map(
        (postsResult.data ?? []).map((post) => [post.id, post.name]),
      );
      const localityMap = new Map(
        (localitiesResult.data ?? []).map((locality) => [
          locality.id,
          locality.name,
        ]),
      );
      const fiscalMap = new Map(
        (fiscalsResult.data ?? []).map((fiscal) => [
          fiscal.id,
          fiscal.full_name,
        ]),
      );

      setRows(
        base.map((row) => {
          const vehicle = vehicleMap.get(row.vehicle_id);
          return {
            ...row,
            vehicleNumber: vehicle?.mobigest_number ?? "Sem número MobiGest",
            vehicleType: vehicle?.vehicle_type ?? "veiculo",
            vehicleLabel:
              [vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ||
              vehicleTypeLabel(vehicle?.vehicle_type),
            postName: row.administrative_post_id
              ? postMap.get(row.administrative_post_id) ??
                "Posto não encontrado"
              : "Não definido",
            localityName: row.locality_id
              ? localityMap.get(row.locality_id) ??
                "Localidade não encontrada"
              : "Não definida",
            fiscalName: row.fiscal_id
              ? fiscalMap.get(row.fiscal_id) ?? "Fiscal"
              : "Fiscal não identificado",
          } as Row;
        }),
      );

      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return rows.filter((row) => {
      const haystack = [
        row.vehicleNumber,
        row.vehicleLabel,
        row.occurrence ?? "",
        row.observation ?? "",
        row.postName,
        row.localityName,
        row.fiscalName,
      ]
        .join(" ")
        .toLowerCase();

      const rowDate = new Date(row.occurred_at).toISOString().slice(0, 10);

      return (
        (!normalized || haystack.includes(normalized)) &&
        (typeFilter === "todos" || row.vehicleType === typeFilter) &&
        (resultFilter === "todos" || row.result === resultFilter) &&
        (!dateFilter || rowDate === dateFilter)
      );
    });
  }, [rows, query, typeFilter, resultFilter, dateFilter]);

  const metrics = useMemo(() => {
    const now = new Date();

    return {
      regular: filtered.filter((row) => row.result === "regular").length,
      occurrence: filtered.filter((row) => row.result !== "regular").length,
      month: filtered.filter((row) => {
        const date = new Date(row.occurred_at);
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        );
      }).length,
      total: filtered.length,
    };
  }, [filtered]);

  return (
    <MobiGestShell
      title="Histórico de fiscalização"
      subtitle="Consultas e ocorrências reais registadas pelos agentes."
    >
      <Link
        to="/fiscalizacao"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar à fiscalização
      </Link>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-sky-600" />
            Filtros
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex items-center rounded-xl border border-slate-300 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Número MobiGest, fiscal, ocorrência..."
                className="h-11 w-full bg-transparent px-3 outline-none"
              />
            </label>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 px-3"
            >
              <option value="todos">Todos os tipos</option>
              <option value="motorizada">Motorizada</option>
              <option value="carro">Carro</option>
              <option value="bicicleta">Bicicleta</option>
            </select>

            <select
              value={resultFilter}
              onChange={(event) => setResultFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 px-3"
            >
              <option value="todos">Todos os resultados</option>
              <option value="regular">Regular</option>
              <option value="irregular">Irregular</option>
              <option value="pendente">Pendente</option>
              <option value="nao_localizado">Não localizado</option>
              <option value="outro">Outro</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 px-3"
            />
          </div>

          {(query || typeFilter !== "todos" || resultFilter !== "todos" || dateFilter) && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setTypeFilter("todos");
                  setResultFilter("todos");
                  setDateFilter("");
                }}
                className="text-xs font-semibold text-sky-700"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>

        {loadError && (
          <div className="border-b border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            A carregar histórico...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {rows.length === 0
              ? "Ainda não existem fiscalizações registadas."
              : "Nenhuma fiscalização corresponde aos filtros."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <Link
                key={row.id}
                to="/fiscalizacao/$id"
                params={{ id: row.id }}
                className="grid gap-3 p-5 hover:bg-slate-50 md:grid-cols-[1.2fr_1fr_1.2fr_1fr_1fr] md:items-center"
              >
                <div>
                  <p className="text-sm font-semibold">{row.vehicleNumber}</p>
                  <p className="text-xs text-slate-400">
                    {vehicleTypeLabel(row.vehicleType)} · {row.vehicleLabel}
                  </p>
                </div>

                <div>
                  <ResultBadge result={row.result} />
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {row.occurrence || "Sem ocorrência descrita"}
                  </p>
                </div>

                <div className="text-xs text-slate-500">
                  <p className="font-medium text-slate-600">{row.postName}</p>
                  <p>{row.localityName}</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock3 className="h-4 w-4" />
                  {new Date(row.occurred_at).toLocaleString("pt-MZ")}
                </div>

                <div className="text-xs text-slate-500">
                  <p>{row.fiscalName}</p>
                  <p className="mt-1">{row.evidence_count} evidência(s)</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="grid gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <Summary
            icon={<FileText className="h-5 w-5 text-sky-600" />}
            label="Resultados visíveis"
            value={loading ? "—" : String(metrics.total)}
          />
          <Summary
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            label="Regulares"
            value={loading ? "—" : String(metrics.regular)}
          />
          <Summary
            icon={<ShieldAlert className="h-5 w-5 text-amber-600" />}
            label="Com ocorrência"
            value={loading ? "—" : String(metrics.occurrence)}
          />
          <Summary
            icon={<Clock3 className="h-5 w-5 text-sky-600" />}
            label="Este mês"
            value={loading ? "—" : String(metrics.month)}
          />
        </div>
      </Card>
    </MobiGestShell>
  );
}

function ResultBadge({ result }: { result: string }) {
  const labels: Record<string, string> = {
    regular: "Regular",
    irregular: "Irregular",
    pendente: "Pendente",
    nao_localizado: "Não localizado",
    outro: "Outro",
  };

  const className =
    result === "regular"
      ? "bg-emerald-50 text-emerald-700"
      : result === "irregular"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={"w-fit rounded-full px-2.5 py-1 text-xs font-semibold " + className}
    >
      {labels[result] ?? result}
    </span>
  );
}

function Summary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-bold">{value}</p>
      </div>
    </div>
  );
}

function vehicleTypeLabel(type?: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return "Veículo";
}
