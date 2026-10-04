import { supabase } from "./supabase";

export type PaymentMethod =
  | "numerario"
  | "pos"
  | "transferencia"
  | "pagamento_movel"
  | "outro";

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === "object" ? (data as T) : null;
}

function throwRpc(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export async function createFeeConfig(input: {
  code: string;
  name: string;
  vehicleType?: "motorizada" | "carro" | "bicicleta" | null;
  amount: number;
  validFrom: string;
  validTo?: string | null;
  active: boolean;
  conditions?: string | null;
  exemptionAllowed: boolean;
}) {
  const { data, error } = await supabase.rpc("create_fee_config", {
    p_code: input.code,
    p_name: input.name,
    p_vehicle_type: input.vehicleType ?? null,
    p_amount: input.amount,
    p_valid_from: input.validFrom,
    p_valid_to: input.validTo ?? null,
    p_active: input.active,
    p_conditions: input.conditions ?? null,
    p_exemption_allowed: input.exemptionAllowed,
  });

  throwRpc(error, "Não foi possível criar a taxa municipal.");

  if (typeof data !== "string") {
    throw new Error("O servidor não devolveu o identificador da taxa.");
  }

  return data;
}

export async function updateFeeConfig(input: {
  id: string;
  code: string;
  name: string;
  vehicleType?: "motorizada" | "carro" | "bicicleta" | null;
  amount: number;
  validFrom: string;
  validTo?: string | null;
  active: boolean;
  conditions?: string | null;
  exemptionAllowed: boolean;
}) {
  const { error } = await supabase.rpc("update_fee_config", {
    p_id: input.id,
    p_code: input.code,
    p_name: input.name,
    p_vehicle_type: input.vehicleType ?? null,
    p_amount: input.amount,
    p_valid_from: input.validFrom,
    p_valid_to: input.validTo ?? null,
    p_active: input.active,
    p_conditions: input.conditions ?? null,
    p_exemption_allowed: input.exemptionAllowed,
  });

  throwRpc(error, "Não foi possível actualizar a taxa municipal.");
}

export async function createCharge(input: {
  feeConfigId: string;
  ownerId: string;
  vehicleId?: string | null;
  registrationId?: string | null;
  note?: string | null;
}) {
  const { data, error } = await supabase.rpc("create_charge", {
    p_fee_config_id: input.feeConfigId,
    p_owner_id: input.ownerId,
    p_vehicle_id: input.vehicleId ?? null,
    p_registration_id: input.registrationId ?? null,
    p_note: input.note ?? null,
  });

  throwRpc(error, "Não foi possível criar a cobrança.");

  const row = firstRow<{
    charge_id: string;
    charge_reference: string;
    amount: number;
  }>(data);

  if (!row) {
    throw new Error("O servidor não devolveu a cobrança criada.");
  }

  return row;
}

export async function setChargeStatus(input: {
  chargeId: string;
  status: "pendente" | "em_confirmacao" | "cancelado";
  reason: string;
}) {
  const { error } = await supabase.rpc("set_charge_status", {
    p_charge_id: input.chargeId,
    p_status: input.status,
    p_reason: input.reason,
  });

  throwRpc(error, "Não foi possível alterar o estado da cobrança.");
}

export async function registerChargePayment(input: {
  chargeId: string;
  method: PaymentMethod;
  reference?: string | null;
  note?: string | null;
}) {
  const { data, error } = await supabase.rpc("register_charge_payment", {
    p_charge_id: input.chargeId,
    p_method: input.method,
    p_reference: input.reference ?? null,
    p_note: input.note ?? null,
  });

  throwRpc(error, "Não foi possível registar o pagamento.");

  const row = firstRow<{
    payment_id: string;
    receipt_number: string;
    amount: number;
  }>(data);

  if (!row) {
    throw new Error("O servidor não devolveu o pagamento confirmado.");
  }

  return row;
}

export async function applyChargeExemption(input: {
  chargeId: string;
  reason: string;
  note?: string | null;
}) {
  const { error } = await supabase.rpc("apply_charge_exemption", {
    p_charge_id: input.chargeId,
    p_reason: input.reason,
    p_note: input.note ?? null,
  });

  throwRpc(error, "Não foi possível aplicar a isenção.");
}

export async function refundCharge(input: {
  chargeId: string;
  reason: string;
}) {
  const { data, error } = await supabase.rpc("refund_charge", {
    p_charge_id: input.chargeId,
    p_reason: input.reason,
  });

  throwRpc(error, "Não foi possível reembolsar a cobrança.");

  const row = firstRow<{
    refund_id: string;
    refund_reference: string;
    amount: number;
  }>(data);

  if (!row) {
    throw new Error("O servidor não devolveu o reembolso.");
  }

  return row;
}
