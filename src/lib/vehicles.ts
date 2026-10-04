import { supabase } from "./supabase";

export type VehicleType = "motorizada" | "carro" | "bicicleta";
export type VehicleOperationalStatus =
  | "activa"
  | "suspensa"
  | "roubada"
  | "apreendida"
  | "cancelada";
export type VehicleCommercialStatus = "normal" | "a_venda";
export type RegistrationDecision = "aprovada" | "correccao" | "rejeitada";

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === "object" ? (data as T) : null;
}

function throwRpc(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export async function createVehicleRegistration(input: {
  ownerId: string;
  vehicleType: VehicleType;
  administrativePostId?: string | null;
  localityId?: string | null;
  plateNumber?: string | null;
  chassisNumber?: string | null;
  frameNumber?: string | null;
  engineNumber?: string | null;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  manufactureYear?: number | null;
  notes?: string | null;
}) {
  const { data, error } = await supabase.rpc("create_vehicle_registration", {
    p_owner_id: input.ownerId,
    p_vehicle_type: input.vehicleType,
    p_administrative_post_id: input.administrativePostId ?? null,
    p_locality_id: input.localityId ?? null,
    p_plate_number: input.plateNumber ?? null,
    p_chassis_number: input.chassisNumber ?? null,
    p_frame_number: input.frameNumber ?? null,
    p_engine_number: input.engineNumber ?? null,
    p_make: input.make ?? null,
    p_model: input.model ?? null,
    p_color: input.color ?? null,
    p_manufacture_year: input.manufactureYear ?? null,
    p_notes: input.notes ?? null,
  });

  throwRpc(error, "Não foi possível criar o processo de registo.");

  const row = firstRow<{
    registration_id: string;
    registration_reference: string;
    vehicle_id: string;
  }>(data);

  if (!row) {
    throw new Error("O Supabase não devolveu o processo de registo criado.");
  }

  return row;
}

export async function updateVehicleCore(input: {
  vehicleId: string;
  administrativePostId?: string | null;
  localityId?: string | null;
  plateNumber?: string | null;
  chassisNumber?: string | null;
  frameNumber?: string | null;
  engineNumber?: string | null;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  manufactureYear?: number | null;
  notes?: string | null;
}) {
  const { error } = await supabase.rpc("update_vehicle_core", {
    p_vehicle_id: input.vehicleId,
    p_administrative_post_id: input.administrativePostId ?? null,
    p_locality_id: input.localityId ?? null,
    p_plate_number: input.plateNumber ?? null,
    p_chassis_number: input.chassisNumber ?? null,
    p_frame_number: input.frameNumber ?? null,
    p_engine_number: input.engineNumber ?? null,
    p_make: input.make ?? null,
    p_model: input.model ?? null,
    p_color: input.color ?? null,
    p_manufacture_year: input.manufactureYear ?? null,
    p_notes: input.notes ?? null,
  });

  throwRpc(error, "Não foi possível actualizar o veículo.");
}

export async function setVehicleOperationalStatus(input: {
  vehicleId: string;
  status: VehicleOperationalStatus;
  reason: string;
  occurrenceReference?: string | null;
}) {
  const { error } = await supabase.rpc("set_vehicle_operational_status", {
    p_vehicle_id: input.vehicleId,
    p_status: input.status,
    p_reason: input.reason,
    p_occurrence_reference: input.occurrenceReference ?? null,
  });

  throwRpc(error, "Não foi possível alterar o estado do veículo.");
}

export async function setVehicleCommercialStatus(input: {
  vehicleId: string;
  status: VehicleCommercialStatus;
  reason: string;
}) {
  const { error } = await supabase.rpc("set_vehicle_commercial_status", {
    p_vehicle_id: input.vehicleId,
    p_status: input.status,
    p_reason: input.reason,
  });

  throwRpc(error, "Não foi possível alterar o estado comercial do veículo.");
}

export async function requestVehicleTransfer(input: {
  vehicleId: string;
  newOwnerId: string;
  reason: string;
}) {
  const { data, error } = await supabase.rpc("request_vehicle_transfer", {
    p_vehicle_id: input.vehicleId,
    p_new_owner_id: input.newOwnerId,
    p_reason: input.reason,
  });

  throwRpc(error, "Não foi possível iniciar a transferência.");

  const row = firstRow<{
    registration_id: string;
    registration_reference: string;
  }>(data);

  if (!row) {
    throw new Error("O Supabase não devolveu o processo de transferência.");
  }

  return row;
}

export async function decideRegistration(input: {
  registrationId: string;
  decision: RegistrationDecision;
  observation?: string | null;
}) {
  const { data, error } = await supabase.rpc("decide_registration", {
    p_registration_id: input.registrationId,
    p_decision: input.decision,
    p_observation: input.observation ?? null,
  });

  throwRpc(error, "Não foi possível registar a decisão.");

  return firstRow<{
    registration_status: string;
    vehicle_mobigest_number: string | null;
  }>(data);
}

export async function resubmitRegistration(input: {
  registrationId: string;
  observation?: string | null;
}) {
  const { error } = await supabase.rpc("resubmit_registration", {
    p_registration_id: input.registrationId,
    p_observation: input.observation ?? null,
  });

  throwRpc(error, "Não foi possível reenviar o processo.");
}
