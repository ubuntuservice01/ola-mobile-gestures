import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CircleDollarSign,
  FileText,
  Printer,
  ReceiptText,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import {
  applyChargeExemption,
  refundCharge,
  registerChargePayment,
  setChargeStatus,
  type PaymentMethod,
} from "../../lib/finance";
import { supabase } from "../../lib/supabase";
import {
  ConfirmDialog,
  LoadingButton,
  NetworkErrorState,
  ProcessingOverlay,
  SkeletonCard,
  StatusBadge,
  notify,
} from "../../components/mobigest/Experience";
import { formatDateTime, formatMoneyMt } from "../../lib/format";

export const Route = createFileRoute("/financeiro/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da cobrança — MobiGest" },
      {
        name: "description",
        content: "Pagamento, isenção, reembolso e histórico da cobrança.",
      },
    ],
  }),
  component: Detalhe,
});

type Charge = {
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
  exemption_approved_by: string | null;
  exemption_approved_at: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Payment = {
  id: string;
  method: string;
  amount: number;
  reference: string | null;
  receipt_number: string | null;
  paid_at: string | null;
  confirmed_by: string | null;
  note: string | null;
  created_at: string;
};

type Refund = {
  id: string;
  reference: string;
  amount: number;
  reason: string;
  refunded_at: string;
  refunded_by: string | null;
};

type Fee = {
  id: string;
  code: string;
  name: string;
  amount: number;
  exemption_allowed: boolean;
};

function Detalhe() {
  const { id } = Route.useParams();

  const [charge, setCharge] = useState<Charge | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [refund, setRefund] = useState<Refund | null>(null);
  const [fee, setFee] = useState<Fee | null>(null);
  const [ownerName, setOwnerName] = useState("—");
  const [vehicleLabel, setVehicleLabel] = useState("Sem veículo");
  const [municipalityName, setMunicipalityName] = useState("Município");
  const [creatorName, setCreatorName] = useState("—");
  const [paymentUserName, setPaymentUserName] = useState("—");
  const [exemptionUserName, setExemptionUserName] = useState("—");
  const [refundUserName, setRefundUserName] = useState("—");
  const [fine, setFine] = useState<{ id: string; reference: string } | null>(
    null,
  );
  const [role, setRole] = useState<string | null>(null);

  const [method, setMethod] = useState<PaymentMethod>("numerario");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const [workflowStatus, setWorkflowStatus] = useState<
    "pendente" | "em_confirmacao" | "cancelado" | ""
  >("");
  const [workflowReason, setWorkflowReason] = useState("");

  const [exemptionReason, setExemptionReason] = useState("");
  const [exemptionNote, setExemptionNote] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<
    "payment" | "status" | "exemption" | "refund" | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "payment" | "status" | "exemption" | "refund" | null
  >(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const chargeResult = await supabase
        .from("charges")
        .select(
          "id, reference, municipality_id, fee_config_id, registration_id, owner_id, vehicle_id, service_type, amount, currency, status, exemption, exemption_reason, exemption_approved_by, exemption_approved_at, note, created_by, created_at, updated_at",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (chargeResult.error || !chargeResult.data) {
        console.error("Falha ao carregar cobrança:", chargeResult.error);
        setLoadError("Cobrança não encontrada ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      const current = chargeResult.data as Charge;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [
        ownerResult,
        vehicleResult,
        municipalityResult,
        feeResult,
        paymentResult,
        refundResult,
        fineResult,
        profileResult,
      ] = await Promise.all([
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
              .select("mobigest_number, make, model, vehicle_type")
              .eq("id", current.vehicle_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("municipalities")
          .select("name")
          .eq("id", current.municipality_id)
          .maybeSingle(),
        current.fee_config_id
          ? supabase
              .from("fee_configs")
              .select("id, code, name, amount, exemption_allowed")
              .eq("id", current.fee_config_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("payments")
          .select(
            "id, method, amount, reference, receipt_number, paid_at, confirmed_by, note, created_at",
          )
          .eq("charge_id", current.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("payment_refunds")
          .select(
            "id, reference, amount, reason, refunded_at, refunded_by",
          )
          .eq("charge_id", current.id)
          .maybeSingle(),
        supabase
          .from("fines")
          .select("id, reference")
          .eq("charge_id", current.id)
          .maybeSingle(),
        user
          ? supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!active) return;

      const error =
        ownerResult.error ??
        vehicleResult.error ??
        municipalityResult.error ??
        feeResult.error ??
        paymentResult.error ??
        refundResult.error ??
        fineResult.error ??
        profileResult.error;

      if (error) {
        console.error("Falha ao carregar relações financeiras:", error);
        setLoadError(
          "A cobrança foi encontrada, mas os dados relacionados não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      const currentPayment = paymentResult.data as Payment | null;
      const currentRefund = refundResult.data as Refund | null;

      const profileIds = [
        current.created_by,
        currentPayment?.confirmed_by ?? null,
        current.exemption_approved_by,
        currentRefund?.refunded_by ?? null,
      ].filter(Boolean) as string[];

      const profilesResult = profileIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", [...new Set(profileIds)])
        : { data: [], error: null };

      if (!active) return;

      if (profilesResult.error) {
        console.error("Falha ao carregar responsáveis financeiros:", profilesResult.error);
        setLoadError("Não foi possível carregar os responsáveis financeiros.");
        setLoading(false);
        return;
      }

      const profileMap = new Map(
        (profilesResult.data ?? []).map((profile) => [
          profile.id,
          profile.full_name,
        ]),
      );

      const vehicle = vehicleResult.data;

      setCharge(current);
      setPayment(currentPayment);
      setRefund(currentRefund);
      setFee(feeResult.data as Fee | null);
      setOwnerName(ownerResult.data?.full_name ?? "Sem proprietário");
      setMunicipalityName(municipalityResult.data?.name ?? "Município");
      setVehicleLabel(
        vehicle
          ? (vehicle.mobigest_number ||
              [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
              vehicleTypeLabel(vehicle.vehicle_type))
          : "Sem veículo",
      );
      setCreatorName(
        current.created_by
          ? profileMap.get(current.created_by) ?? "Utilizador"
          : "—",
      );
      setPaymentUserName(
        currentPayment?.confirmed_by
          ? profileMap.get(currentPayment.confirmed_by) ?? "Utilizador"
          : "—",
      );
      setExemptionUserName(
        current.exemption_approved_by
          ? profileMap.get(current.exemption_approved_by) ?? "Utilizador"
          : "—",
      );
      setRefundUserName(
        currentRefund?.refunded_by
          ? profileMap.get(currentRefund.refunded_by) ?? "Utilizador"
          : "—",
      );
      setFine(fineResult.data as { id: string; reference: string } | null);
      setRole(profileResult.data?.role ?? null);

      setWorkflowStatus("");
      setWorkflowReason("");
      setPaymentReference("");
      setPaymentNote("");
      setExemptionReason("");
      setExemptionNote("");
      setRefundReason("");
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, refreshToken]);

  const canManage =
    role === "super_admin" ||
    role === "admin_municipal" ||
    role === "financeiro";

  const open =
    charge?.status === "pendente" || charge?.status === "em_confirmacao";

  const workflowTargets = useMemo(() => {
    if (!charge || !open) return [];

    return (["pendente", "em_confirmacao", "cancelado"] as const).filter(
      (status) => status !== charge.status,
    );
  }, [charge, open]);

  const registerPayment = async () => {
    if (!charge || action) return;

    setAction("payment");
    setActionError(null);
    setMessage(null);

    try {
      const result = await registerChargePayment({
        chargeId: charge.id,
        method,
        reference: paymentReference.trim() || null,
        note: paymentNote.trim() || null,
      });

      const successMessage =
        "Pagamento confirmado. Recibo " + result.receipt_number + " emitido.";
      setMessage(successMessage);
      notify.success("Pagamento confirmado", "O recibo foi emitido com sucesso.");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao registar pagamento:", error);
      const safeMessage = "Não foi possível registar o pagamento.";
      setActionError(safeMessage);
      notify.error("Pagamento não concluído", safeMessage);
    } finally {
      setAction(null);
    }
  };

  const changeWorkflowStatus = async () => {
    if (
      !charge ||
      !workflowStatus ||
      workflowReason.trim().length < 4 ||
      action
    ) {
      return;
    }

    setAction("status");
    setActionError(null);
    setMessage(null);

    try {
      await setChargeStatus({
        chargeId: charge.id,
        status: workflowStatus,
        reason: workflowReason.trim(),
      });

      setMessage("Estado da cobrança actualizado.");
      notify.success("Estado actualizado");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao alterar estado da cobrança:", error);
      const safeMessage = "Não foi possível alterar o estado da cobrança.";
      setActionError(safeMessage);
      notify.error("Estado não actualizado", safeMessage);
    } finally {
      setAction(null);
    }
  };

  const exempt = async () => {
    if (!charge || exemptionReason.trim().length < 4 || action) return;

    setAction("exemption");
    setActionError(null);
    setMessage(null);

    try {
      await applyChargeExemption({
        chargeId: charge.id,
        reason: exemptionReason.trim(),
        note: exemptionNote.trim() || null,
      });

      setMessage("Isenção aplicada e registada na auditoria.");
      notify.success("Isenção aplicada", "A decisão ficou registada na auditoria.");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao aplicar isenção:", error);
      const safeMessage = "Não foi possível aplicar a isenção.";
      setActionError(safeMessage);
      notify.error("Isenção não aplicada", safeMessage);
    } finally {
      setAction(null);
    }
  };

  const refundPayment = async () => {
    if (!charge || refundReason.trim().length < 4 || action) return;

    setAction("refund");
    setActionError(null);
    setMessage(null);

    try {
      const result = await refundCharge({
        chargeId: charge.id,
        reason: refundReason.trim(),
      });

      setMessage(
        "Reembolso " + result.refund_reference + " registado com sucesso.",
      );
      notify.success("Reembolso registado", result.refund_reference);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao reembolsar cobrança:", error);
      const safeMessage = "Não foi possível registar o reembolso.";
      setActionError(safeMessage);
      notify.error("Reembolso não concluído", safeMessage);
    } finally {
      setAction(null);
    }
  };

  return (
    <MobiGestShell title="Detalhe da cobrança">
      <Link
        to="/financeiro"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Financeiro
      </Link>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : loadError || !charge ? (
        <NetworkErrorState
          message={loadError ?? "Cobrança não encontrada."}
          onRetry={() => setRefreshToken((value) => value + 1)}
        />
      ) : (
        <div className="space-y-6">
          {actionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {actionError}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <Card className="p-7">
              <div className="flex flex-wrap items-start gap-4">
                <ReceiptText className="h-7 w-7 text-sky-600" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold">{charge.reference}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {municipalityName}
                  </p>
                </div>
                <StatusBadge status={charge.status} />
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <Info label="Proprietário" value={ownerName} />
                <Info label="Veículo" value={vehicleLabel} />
                <Info
                  label="Serviço"
                  value={
                    fee?.name ??
                    (charge.service_type.startsWith("multa:")
                      ? "Multa · " + charge.service_type.slice(6)
                      : charge.service_type)
                  }
                />
                <Info
                  label="Taxa"
                  value={fee ? fee.code : "Cobrança automática"}
                />
                <Info
                  label="Valor aplicado"
                  value={formatMoneyMt(charge.amount)}
                />
                <Info
                  label="Data da cobrança"
                  value={formatDateTime(charge.created_at)}
                />
                <Info label="Criada por" value={creatorName} />
                <Info
                  label="Última actualização"
                  value={formatDateTime(charge.updated_at)}
                />
              </div>

              {charge.note && (
                <div className="mt-6 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">Observação</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                    {charge.note}
                  </p>
                </div>
              )}

              {payment && (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-sm font-semibold text-emerald-900">
                    Pagamento confirmado
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Info
                      label="Recibo"
                      value={payment.receipt_number || "—"}
                    />
                    <Info
                      label="Método"
                      value={paymentMethodLabel(payment.method)}
                    />
                    <Info
                      label="Referência"
                      value={payment.reference || "—"}
                    />
                    <Info
                      label="Valor"
                      value={formatMoneyMt(payment.amount)}
                    />
                    <Info
                      label="Pago em"
                      value={
                        payment.paid_at
                          ? formatDateTime(payment.paid_at)
                          : "—"
                      }
                    />
                    <Info
                      label="Confirmado por"
                      value={paymentUserName}
                    />
                  </div>

                  <Link
                    to="/financeiro/recibo/$id"
                    params={{ id: charge.id }}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Printer className="h-4 w-4" />
                    Ver / imprimir recibo
                  </Link>
                </div>
              )}

              {charge.exemption && (
                <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-5">
                  <p className="text-sm font-semibold text-sky-900">
                    Cobrança isenta
                  </p>
                  <p className="mt-2 text-sm text-sky-800">
                    {charge.exemption_reason || "Sem motivo registado."}
                  </p>
                  <p className="mt-2 text-xs text-sky-700">
                    Aprovada por {exemptionUserName}
                    {charge.exemption_approved_at
                      ? " · " +
                        new Date(
                          charge.exemption_approved_at,
                        ).toLocaleString("pt-MZ")
                      : ""}
                  </p>
                </div>
              )}

              {refund && (
                <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5">
                  <p className="text-sm font-semibold text-rose-900">
                    Reembolso {refund.reference}
                  </p>
                  <p className="mt-2 text-sm text-rose-800">
                    {formatMoneyMt(refund.amount)} · {refund.reason}
                  </p>
                  <p className="mt-2 text-xs text-rose-700">
                    {formatDateTime(refund.refunded_at)} ·{" "}
                    {refundUserName}
                  </p>
                </div>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                {charge.registration_id && (
                  <Link
                    to="/registos/$id"
                    params={{ id: charge.registration_id }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                  >
                    <FileText className="h-4 w-4" />
                    Abrir processo
                  </Link>
                )}

                {fine && (
                  <Link
                    to="/multas/$id"
                    params={{ id: fine.id }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Multa {fine.reference}
                  </Link>
                )}
              </div>
            </Card>

            <div className="space-y-6">
              {canManage && open && (
                <Card className="p-6">
                  <h3 className="font-semibold">Registar pagamento</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    O valor é integral e definido pela cobrança. A confirmação
                    gera automaticamente um recibo REC-*.
                  </p>

                  <label className="mt-4 block text-sm font-medium">
                    Método
                    <select
                      value={method}
                      onChange={(event) =>
                        setMethod(event.target.value as PaymentMethod)
                      }
                      className={inputClass}
                    >
                      <option value="numerario">Numerário</option>
                      <option value="pos">POS</option>
                      <option value="transferencia">Transferência</option>
                      <option value="pagamento_movel">Pagamento móvel</option>
                      <option value="outro">Outro</option>
                    </select>
                  </label>

                  <label className="mt-3 block text-sm font-medium">
                    Referência do pagamento
                    <input
                      value={paymentReference}
                      onChange={(event) =>
                        setPaymentReference(event.target.value)
                      }
                      className={inputClass}
                      placeholder="Talão, operação, transacção..."
                    />
                  </label>

                  <label className="mt-3 block text-sm font-medium">
                    Observação
                    <textarea
                      value={paymentNote}
                      onChange={(event) => setPaymentNote(event.target.value)}
                      rows={3}
                      className={inputClass}
                    />
                  </label>

                  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-4 text-sm">
                    <span className="text-slate-500">Valor a confirmar</span>
                    <b>{formatMoneyMt(charge.amount)}</b>
                  </div>

                  <LoadingButton
                    onClick={() => setConfirmAction("payment")}
                    disabled={Boolean(action)}
                    state={action === "payment" ? "loading" : "idle"}
                    idleLabel="Confirmar pagamento"
                    loadingLabel="A confirmar pagamento..."
                    className="mt-4 w-full bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40"
                  />
                </Card>
              )}

              {canManage && open && workflowTargets.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-semibold">Fluxo da cobrança</h3>

                  <label className="mt-4 block text-sm font-medium">
                    Novo estado
                    <select
                      value={workflowStatus}
                      onChange={(event) =>
                        setWorkflowStatus(
                          event.target.value as
                            | "pendente"
                            | "em_confirmacao"
                            | "cancelado"
                            | "",
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">Seleccione</option>
                      {workflowTargets.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="mt-3 block text-sm font-medium">
                    Motivo *
                    <textarea
                      value={workflowReason}
                      onChange={(event) =>
                        setWorkflowReason(event.target.value)
                      }
                      rows={3}
                      className={inputClass}
                    />
                  </label>

                  <LoadingButton
                    onClick={() => setConfirmAction("status")}
                    disabled={
                      !workflowStatus ||
                      workflowReason.trim().length < 4 ||
                      Boolean(action)
                    }
                    state={action === "status" ? "loading" : "idle"}
                    idleLabel="Guardar estado"
                    loadingLabel="A actualizar estado..."
                    icon={<Save className="h-4 w-4" />}
                    className="mt-4 w-full border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-40"
                  />
                </Card>
              )}

              {canManage &&
                open &&
                fee?.exemption_allowed &&
                !fine && (
                  <Card className="p-6">
                    <h3 className="font-semibold">Aplicar isenção</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Esta taxa permite isenção. O motivo é obrigatório.
                    </p>

                    <label className="mt-4 block text-sm font-medium">
                      Motivo *
                      <input
                        value={exemptionReason}
                        onChange={(event) =>
                          setExemptionReason(event.target.value)
                        }
                        className={inputClass}
                      />
                    </label>

                    <label className="mt-3 block text-sm font-medium">
                      Observação
                      <textarea
                        value={exemptionNote}
                        onChange={(event) =>
                          setExemptionNote(event.target.value)
                        }
                        rows={3}
                        className={inputClass}
                      />
                    </label>

                    <LoadingButton
                      onClick={() => setConfirmAction("exemption")}
                      disabled={
                        exemptionReason.trim().length < 4 ||
                        Boolean(action)
                      }
                      state={action === "exemption" ? "loading" : "idle"}
                      idleLabel="Aplicar isenção"
                      loadingLabel="A aplicar isenção..."
                      className="mt-4 w-full border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:opacity-40"
                    />
                  </Card>
                )}

              {canManage && charge.status === "pago" && payment && (
                <Card className="p-6">
                  <h3 className="font-semibold">Reembolso</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    O reembolso preserva o pagamento original e cria um registo
                    RMB-* separado.
                  </p>

                  <label className="mt-4 block text-sm font-medium">
                    Motivo *
                    <textarea
                      value={refundReason}
                      onChange={(event) =>
                        setRefundReason(event.target.value)
                      }
                      rows={3}
                      className={inputClass}
                    />
                  </label>

                  <LoadingButton
                    onClick={() => setConfirmAction("refund")}
                    disabled={
                      refundReason.trim().length < 4 || Boolean(action)
                    }
                    state={action === "refund" ? "loading" : "idle"}
                    idleLabel="Registar reembolso"
                    loadingLabel="A registar reembolso..."
                    icon={<RotateCcw className="h-4 w-4" />}
                    className="mt-4 w-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40"
                  />
                </Card>
              )}

              <Card className="p-6">
                <CircleDollarSign className="h-5 w-5 text-sky-600" />
                <h3 className="mt-3 font-semibold">Resumo financeiro</h3>
                <div className="mt-4 space-y-3">
                  <Line
                    label="Valor"
                    value={formatMoneyMt(charge.amount)}
                  />
                  <Line label="Estado" value={statusLabel(charge.status)} />
                  <Line
                    label="Pagamento"
                    value={payment?.receipt_number || "Não confirmado"}
                  />
                  <Line
                    label="Reembolso"
                    value={refund?.reference || "Não aplicável"}
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open && !action) setConfirmAction(null);
        }}
        title={
          confirmAction === "payment"
            ? "Confirmar este pagamento?"
            : confirmAction === "refund"
              ? "Registar este reembolso?"
              : confirmAction === "exemption"
                ? "Aplicar esta isenção?"
                : workflowStatus === "cancelado"
                  ? "Cancelar esta cobrança?"
                  : "Alterar o estado da cobrança?"
        }
        description={
          confirmAction === "payment"
            ? "Será confirmado o pagamento integral de " +
              formatMoneyMt(charge?.amount ?? 0) +
              " e será emitido um recibo oficial."
            : confirmAction === "refund"
              ? "O pagamento original será preservado e o sistema criará um registo de reembolso separado."
              : confirmAction === "exemption"
                ? "A cobrança será marcada como isenta e o motivo ficará registado na auditoria."
                : workflowStatus === "cancelado"
                  ? "A cobrança será cancelada. O motivo informado ficará registado na auditoria."
                  : "O estado da cobrança será actualizado com o motivo informado."
        }
        confirmLabel={
          confirmAction === "payment"
            ? "Confirmar pagamento"
            : confirmAction === "refund"
              ? "Registar reembolso"
              : confirmAction === "exemption"
                ? "Aplicar isenção"
                : workflowStatus === "cancelado"
                  ? "Cancelar cobrança"
                  : "Actualizar estado"
        }
        destructive={
          confirmAction === "refund" ||
          (confirmAction === "status" && workflowStatus === "cancelado")
        }
        busy={Boolean(action)}
        onConfirm={async () => {
          const selected = confirmAction;
          if (selected === "payment") await registerPayment();
          if (selected === "status") await changeWorkflowStatus();
          if (selected === "exemption") await exempt();
          if (selected === "refund") await refundPayment();
          setConfirmAction(null);
        }}
      />

      <ProcessingOverlay
        open={Boolean(action)}
        message={
          action === "payment"
            ? "A confirmar pagamento e emitir recibo..."
            : action === "refund"
              ? "A registar o reembolso..."
              : action === "exemption"
                ? "A aplicar a isenção..."
                : "A actualizar o estado da cobrança..."
        }
      />
    </MobiGestShell>
  );
}

const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-3 text-sm last:border-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <b className="text-right">{value}</b>
    </div>
  );
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

function vehicleTypeLabel(type: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return type;
}
