import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
} from "@tanstack/react-router";
import {
  ChevronRight,
  CircleDollarSign,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";
import {
  AnimatedNumber,
  EmptyState,
  NetworkErrorState,
  PaginationBar,
  SkeletonCard,
  SkeletonTable,
  StatusBadge,
} from "../components/mobigest/Experience";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import { formatDateTime, formatMoneyMt } from "../lib/format";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — MobiGest" },
      {
        name: "description",
        content: "Cobranças, pagamentos e taxas municipais.",
      },
    ],
  }),
  component: Layout,
});

type ChargeRow = {
  id: string;
  reference: string;
  municipality_id: string;
  fee_config_id: string | null;
  registration_id: string | null;
  owner_id: string | null;
  vehicle_id: string | null;
  service_type: string;
  amount: number;
  currency: string;
  status: string;
  exemption: boolean;
  exemption_reason: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  ownerName: string;
  vehicleLabel: string;
  serviceLabel: string;
  municipalityName: string;
  paymentMethod: string;
  paymentReceipt: string | null;
  responsibleName: string;
};

function Layout() {
  const matchRoute = useMatchRoute();
  return matchRoute({ to: "/financeiro", fuzzy: false }) ? (
    <Financeiro />
  ) : (
    <Outlet />
  );
}

function Financeiro() {
  const [rows, setRows] = useState<ChargeRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 350);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("charges")
        .select(
          "id, reference, municipality_id, fee_config_id, registration_id, owner_id, vehicle_id, service_type, amount, currency, status, exemption, exemption_reason, note, created_by, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar cobranças:", error);
        setLoadError("Não foi possível carregar as cobranças.");
        setLoading(false);
        return;
      }

      const base = data ?? [];
      const municipalityIds = [
        ...new Set(base.map((row) => row.municipality_id).filter(Boolean)),
      ];
      const ownerIds = [
        ...new Set(base.map((row) => row.owner_id).filter(Boolean)),
      ] as string[];
      const vehicleIds = [
        ...new Set(base.map((row) => row.vehicle_id).filter(Boolean)),
      ] as string[];
      const feeIds = [
        ...new Set(base.map((row) => row.fee_config_id).filter(Boolean)),
      ] as string[];
      const creatorIds = [
        ...new Set(base.map((row) => row.created_by).filter(Boolean)),
      ] as string[];
      const chargeIds = base.map((row) => row.id);

      const [
        municipalitiesResult,
        ownersResult,
        vehiclesResult,
        feesResult,
        creatorsResult,
        paymentsResult,
      ] = await Promise.all([
        municipalityIds.length
          ? supabase
              .from("municipalities")
              .select("id, name")
              .in("id", municipalityIds)
          : Promise.resolve({ data: [], error: null }),
        ownerIds.length
          ? supabase
              .from("owners")
              .select("id, full_name")
              .in("id", ownerIds)
          : Promise.resolve({ data: [], error: null }),
        vehicleIds.length
          ? supabase
              .from("vehicles")
              .select("id, mobigest_number, make, model")
              .in("id", vehicleIds)
          : Promise.resolve({ data: [], error: null }),
        feeIds.length
          ? supabase
              .from("fee_configs")
              .select("id, code, name")
              .in("id", feeIds)
          : Promise.resolve({ data: [], error: null }),
        creatorIds.length
          ? supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", creatorIds)
          : Promise.resolve({ data: [], error: null }),
        chargeIds.length
          ? supabase
              .from("payments")
              .select(
                "charge_id, method, receipt_number, confirmed_by, paid_at",
              )
              .in("charge_id", chargeIds)
              .order("paid_at", { ascending: false, nullsFirst: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!active) return;

      const relationError =
        municipalitiesResult.error ??
        ownersResult.error ??
        vehiclesResult.error ??
        feesResult.error ??
        creatorsResult.error ??
        paymentsResult.error;

      if (relationError) {
        console.error("Falha ao enriquecer cobranças:", relationError);
        setLoadError(
          "As cobranças foram encontradas, mas os dados relacionados não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      const paymentUserIds = [
        ...new Set(
          (paymentsResult.data ?? [])
            .map((payment) => payment.confirmed_by)
            .filter(Boolean),
        ),
      ] as string[];

      const paymentUsersResult = paymentUserIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", paymentUserIds)
        : { data: [], error: null };

      if (!active) return;

      if (paymentUsersResult.error) {
        console.error(
          "Falha ao carregar responsáveis por pagamentos:",
          paymentUsersResult.error,
        );
        setLoadError(
          "As cobranças foram encontradas, mas os responsáveis não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      const municipalityMap = new Map(
        (municipalitiesResult.data ?? []).map((row) => [row.id, row.name]),
      );
      const ownerMap = new Map(
        (ownersResult.data ?? []).map((row) => [row.id, row.full_name]),
      );
      const vehicleMap = new Map(
        (vehiclesResult.data ?? []).map((row) => [row.id, row]),
      );
      const feeMap = new Map(
        (feesResult.data ?? []).map((row) => [row.id, row]),
      );
      const creatorMap = new Map(
        (creatorsResult.data ?? []).map((row) => [row.id, row.full_name]),
      );
      const paymentUserMap = new Map(
        (paymentUsersResult.data ?? []).map((row) => [row.id, row.full_name]),
      );
      const paymentMap = new Map<
        string,
        {
          method: string;
          receipt_number: string | null;
          confirmed_by: string | null;
        }
      >();

      for (const payment of paymentsResult.data ?? []) {
        if (!paymentMap.has(payment.charge_id)) {
          paymentMap.set(payment.charge_id, {
            method: payment.method,
            receipt_number: payment.receipt_number,
            confirmed_by: payment.confirmed_by,
          });
        }
      }

      setRows(
        base.map((charge) => {
          const vehicle = charge.vehicle_id
            ? vehicleMap.get(charge.vehicle_id)
            : null;
          const fee = charge.fee_config_id
            ? feeMap.get(charge.fee_config_id)
            : null;
          const payment = paymentMap.get(charge.id);

          return {
            ...charge,
            ownerName: charge.owner_id
              ? ownerMap.get(charge.owner_id) ?? "Proprietário não encontrado"
              : "Sem proprietário",
            vehicleLabel: vehicle
              ? (vehicle.mobigest_number ||
                  [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
                  "Veículo")
              : "Sem veículo",
            serviceLabel:
              fee?.name ??
              (charge.service_type.startsWith("multa:")
                ? "Multa · " + charge.service_type.slice(6)
                : charge.service_type),
            municipalityName:
              municipalityMap.get(charge.municipality_id) ?? "Município",
            paymentMethod: payment
              ? paymentMethodLabel(payment.method)
              : "—",
            paymentReceipt: payment?.receipt_number ?? null,
            responsibleName:
              (payment?.confirmed_by
                ? paymentUserMap.get(payment.confirmed_by)
                : null) ??
              (charge.created_by
                ? creatorMap.get(charge.created_by)
                : null) ??
              "—",
          } as ChargeRow;
        }),
      );

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
      const haystack = [
        row.reference,
        row.ownerName,
        row.vehicleLabel,
        row.serviceLabel,
        row.municipalityName,
        row.paymentReceipt ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalized || haystack.includes(normalized)) &&
        (statusFilter === "todos" || row.status === statusFilter)
      );
    });
  }, [rows, debouncedQuery, statusFilter]);

  const metrics = useMemo(() => {
    const sum = (statuses: string[]) =>
      rows
        .filter((row) => statuses.includes(row.status))
        .reduce((total, row) => total + Number(row.amount || 0), 0);

    return {
      issued: rows
        .filter((row) => row.status !== "cancelado")
        .reduce((total, row) => total + Number(row.amount || 0), 0),
      paid: sum(["pago"]),
      pending: sum(["pendente", "em_confirmacao"]),
      special: sum(["isento", "reembolsado"]),
    };
  }, [rows]);
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter]);


  return (
    <MobiGestShell title="Financeiro">
      <PageHeader
        title="Financeiro"
        description="Cobranças, pagamentos, recibos, isenções e reembolsos do município."
        action="Nova cobrança"
        actionTo="/financeiro/nova"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          <>
            <Metric label="Total emitido" value={metrics.issued} />
            <Metric label="Total pago" value={metrics.paid} />
            <Metric label="Total pendente" value={metrics.pending} />
            <Metric label="Isento / reembolsado" value={metrics.special} />
          </>
        )}
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <span className="font-semibold">Operações financeiras</span>

          <div className="flex flex-1 flex-col gap-2 lg:max-w-2xl lg:flex-row">
            <label className="flex flex-1 items-center rounded-xl border border-slate-200 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cobrança, proprietário, veículo, serviço..."
                className="h-10 flex-1 bg-transparent px-2 text-sm outline-none"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            >
              <option value="todos">Todos os estados</option>
              <option value="pendente">Pendente</option>
              <option value="em_confirmacao">Em confirmação</option>
              <option value="pago">Pago</option>
              <option value="isento">Isento</option>
              <option value="cancelado">Cancelado</option>
              <option value="reembolsado">Reembolsado</option>
            </select>

            <Link
              to="/definicoes/taxas"
              className="flex h-10 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-sky-700"
            >
              Taxas municipais
            </Link>
          </div>
        </div>

        {(query.trim() || statusFilter !== "todos") && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
            <span className="text-xs font-medium text-slate-400">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </span>
            {statusFilter !== "todos" && (
              <button
                type="button"
                onClick={() => setStatusFilter("todos")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {chargeStatusLabel(statusFilter)}
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
          <table className="mobigest-data-table w-full min-w-[1150px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-slate-500">
              <tr>
                {[
                  "Referência",
                  "Data",
                  "Município",
                  "Proprietário",
                  "Veículo",
                  "Serviço",
                  "Valor",
                  "Estado",
                  "Método",
                  "Responsável",
                  "",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-4">
                    <SkeletonTable rows={6} columns={8} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <EmptyState
                      title={
                        rows.length === 0
                          ? "Ainda não existem cobranças"
                          : "Nenhuma cobrança encontrada"
                      }
                      description={
                        rows.length === 0
                          ? "As cobranças, pagamentos e recibos do município aparecerão aqui."
                          : "Tente alterar a pesquisa ou limpar os filtros."
                      }
                      action={
                        rows.length === 0 ? (
                          <Link
                            to="/financeiro/nova"
                            className="mobigest-button inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                          >
                            Nova cobrança
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setQuery("");
                              setStatusFilter("todos");
                            }}
                            className="mobigest-button rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                          >
                            Limpar filtros
                          </button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                pagedRows.map((charge) => (
                  <tr
                    key={charge.id}
                    className="mobigest-table-row border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-semibold">
                      <Link
                        to="/financeiro/$id"
                        params={{ id: charge.id }}
                        className="text-sky-700"
                      >
                        {charge.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(charge.created_at)}
                    </td>
                    <td className="px-4 py-3">{charge.municipalityName}</td>
                    <td className="px-4 py-3">{charge.ownerName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {charge.vehicleLabel}
                    </td>
                    <td className="px-4 py-3">{charge.serviceLabel}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatMoneyMt(charge.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={charge.status} />
                    </td>
                    <td className="px-4 py-3">{charge.paymentMethod}</td>
                    <td className="px-4 py-3">{charge.responsibleName}</td>
                    <td className="px-4 py-3">
                      <Link
                        to="/financeiro/$id"
                        params={{ id: charge.id }}
                        aria-label={"Abrir " + charge.reference}
                      >
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <CircleDollarSign className="h-5 w-5 text-sky-600" />
      <p className="mt-4 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">
        <AnimatedNumber value={value} formatter={formatMoneyMt} />
      </p>
    </Card>
  );
}

function chargeStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_confirmacao: "Em confirmação",
    pago: "Pago",
    isento: "Isento",
    cancelado: "Cancelado",
    reembolsado: "Reembolsado",
  };
  return labels[status] ?? status;
}

function paymentMethodLabel(method: string) {
  const labels: Record<string, string> = {
    numerario: "Numerário",
    pos: "POS",
    transferencia: "Transferência",
    pagamento_movel: "Pagamento móvel",
    outro: "Outro",
  };
  return labels[method] ?? method;
}
