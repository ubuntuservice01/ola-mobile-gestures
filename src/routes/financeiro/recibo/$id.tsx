import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/financeiro/recibo/$id")({
  head: () => ({
    meta: [
      { title: "Recibo — MobiGest" },
      {
        name: "description",
        content: "Recibo de pagamento confirmado no MobiGest.",
      },
    ],
  }),
  component: Recibo,
});

type Charge = {
  id: string;
  reference: string;
  municipality_id: string;
  fee_config_id: string | null;
  owner_id: string | null;
  vehicle_id: string | null;
  service_type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

type Payment = {
  id: string;
  method: string;
  amount: number;
  reference: string | null;
  receipt_number: string | null;
  paid_at: string | null;
  confirmed_by: string | null;
};

function Recibo() {
  const { id } = Route.useParams();

  const [charge, setCharge] = useState<Charge | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [municipalityName, setMunicipalityName] = useState("Município");
  const [ownerName, setOwnerName] = useState("Sem proprietário");
  const [vehicleLabel, setVehicleLabel] = useState("Sem veículo");
  const [serviceLabel, setServiceLabel] = useState("Serviço municipal");
  const [responsibleName, setResponsibleName] = useState("—");
  const [refundReference, setRefundReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const chargeResult = await supabase
        .from("charges")
        .select(
          "id, reference, municipality_id, fee_config_id, owner_id, vehicle_id, service_type, amount, currency, status, created_at",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (chargeResult.error || !chargeResult.data) {
        console.error("Falha ao carregar cobrança do recibo:", chargeResult.error);
        setLoadError("Cobrança não encontrada ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      const current = chargeResult.data as Charge;

      const paymentResult = await supabase
        .from("payments")
        .select(
          "id, method, amount, reference, receipt_number, paid_at, confirmed_by",
        )
        .eq("charge_id", current.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (paymentResult.error || !paymentResult.data) {
        console.error("Falha ao carregar pagamento do recibo:", paymentResult.error);
        setLoadError("Esta cobrança ainda não possui pagamento confirmado.");
        setLoading(false);
        return;
      }

      const currentPayment = paymentResult.data as Payment;

      const [
        municipalityResult,
        ownerResult,
        vehicleResult,
        feeResult,
        responsibleResult,
        refundResult,
      ] = await Promise.all([
        supabase
          .from("municipalities")
          .select("name")
          .eq("id", current.municipality_id)
          .maybeSingle(),
        current.owner_id
          ? supabase
              .from("owners")
              .select("full_name")
              .eq("id", current.owner_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        current.vehicle_id
          ? supabase
              .from("vehicles")
              .select("mobigest_number, make, model")
              .eq("id", current.vehicle_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        current.fee_config_id
          ? supabase
              .from("fee_configs")
              .select("code, name")
              .eq("id", current.fee_config_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        currentPayment.confirmed_by
          ? supabase
              .from("profiles")
              .select("full_name")
              .eq("id", currentPayment.confirmed_by)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("payment_refunds")
          .select("reference")
          .eq("charge_id", current.id)
          .maybeSingle(),
      ]);

      if (!active) return;

      const error =
        municipalityResult.error ??
        ownerResult.error ??
        vehicleResult.error ??
        feeResult.error ??
        responsibleResult.error ??
        refundResult.error;

      if (error) {
        console.error("Falha ao carregar dados do recibo:", error);
        setLoadError("O pagamento existe, mas o recibo não pôde ser composto.");
        setLoading(false);
        return;
      }

      const vehicle = vehicleResult.data;

      setCharge(current);
      setPayment(currentPayment);
      setMunicipalityName(municipalityResult.data?.name ?? "Município");
      setOwnerName(ownerResult.data?.full_name ?? "Sem proprietário");
      setVehicleLabel(
        vehicle
          ? vehicle.mobigest_number ||
              [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
              "Veículo"
          : "Sem veículo",
      );
      setServiceLabel(
        feeResult.data?.name ??
          (current.service_type.startsWith("multa:")
            ? "Multa · " + current.service_type.slice(6)
            : current.service_type),
      );
      setResponsibleName(responsibleResult.data?.full_name ?? "—");
      setRefundReference(refundResult.data?.reference ?? null);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-10 text-center text-sm text-slate-500">
        A carregar recibo...
      </div>
    );
  }

  if (loadError || !charge || !payment) {
    return (
      <div className="min-h-screen bg-slate-100 p-10 text-center">
        <p className="text-sm font-medium text-red-700">
          {loadError ?? "Recibo não encontrado."}
        </p>
        <Link
          to="/financeiro/$id"
          params={{ id }}
          className="mt-4 inline-block text-sm font-semibold text-sky-700"
        >
          Voltar à cobrança
        </Link>
      </div>
    );
  }

  const rows: [string, string][] = [
    ["Recibo", payment.receipt_number || "—"],
    ["Cobrança", charge.reference],
    [
      "Data do pagamento",
      payment.paid_at
        ? new Date(payment.paid_at).toLocaleString("pt-MZ")
        : "—",
    ],
    ["Proprietário", ownerName],
    ["Veículo", vehicleLabel],
    ["Serviço", serviceLabel],
    ["Valor pago", formatMoney(payment.amount)],
    ["Método de pagamento", paymentMethodLabel(payment.method)],
    ["Referência do pagamento", payment.reference || "—"],
    ["Utilizador responsável", responsibleName],
    ["Estado da cobrança", statusLabel(charge.status)],
  ];

  if (refundReference) {
    rows.push(["Reembolso associado", refundReference]);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-2xl justify-between print:hidden">
        <Link
          to="/financeiro/$id"
          params={{ id }}
          className="text-sm text-slate-500"
        >
          ← Voltar
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          <Printer className="h-4 w-4" />
          Imprimir recibo
        </button>
      </div>

      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm print:shadow-none">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <img src="/mobigest-logo.svg" alt="MobiGest" className="h-10" />
          <div className="text-right">
            <p className="font-bold">{municipalityName}</p>
            <p className="text-xs text-slate-500">Recibo de pagamento</p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-700">
          <ShieldCheck className="h-5 w-5" />
          <div>
            <p className="text-sm font-semibold">Pagamento confirmado</p>
            <p className="text-xs">
              {payment.receipt_number} · {formatMoney(payment.amount)}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-5 border-b border-slate-100 pb-2 text-sm"
            >
              <span className="text-slate-500">{label}</span>
              <b className="break-all text-right">{value}</b>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-slate-200 pt-5 text-center">
          <p className="text-xs font-medium text-slate-600">
            Documento emitido pelo MobiGest para registo do pagamento municipal.
          </p>
          <p className="mt-1 text-[10px] leading-4 text-slate-400">
            A validade fiscal ou contabilística externa depende das regras e
            integrações adoptadas pelo município.
          </p>
        </div>
      </div>
    </div>
  );
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

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_confirmacao: "Em confirmação",
    pago: "Pago",
    cancelado: "Cancelado",
    reembolsado: "Reembolsado",
    isento: "Isento",
  };
  return labels[status] ?? status;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-MZ", {
    style: "currency",
    currency: "MZN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
