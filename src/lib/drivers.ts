import { supabase } from "./supabase";

export type DriverType = "taxista" | "mototaxista" | "condutor" | "outro";
export type DriverStatus = "activo" | "suspenso" | "inactivo" | "bloqueado";

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === "object" ? (data as T) : null;
}

function throwRpc(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export async function createDriver(input: {
  driverType: DriverType;
  fullName: string;
  documentType?: string | null;
  documentNumber?: string | null;
  nuit?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  address?: string | null;
  administrativePostId?: string | null;
  localityId?: string | null;
  vehicleId?: string | null;
}) {
  const { data, error } = await supabase.rpc("create_driver", {
    p_driver_type: input.driverType,
    p_full_name: input.fullName,
    p_document_type: input.documentType ?? null,
    p_document_number: input.documentNumber ?? null,
    p_nuit: input.nuit ?? null,
    p_phone: input.phone ?? null,
    p_email: input.email ?? null,
    p_birth_date: input.birthDate ?? null,
    p_address: input.address ?? null,
    p_administrative_post_id: input.administrativePostId ?? null,
    p_locality_id: input.localityId ?? null,
    p_vehicle_id: input.vehicleId ?? null,
  });

  throwRpc(error, "Não foi possível criar o taxista/condutor.");

  const row = firstRow<{ driver_id: string; driver_reference: string }>(data);
  if (!row) {
    throw new Error("O Supabase não devolveu a referência do taxista/condutor.");
  }

  return row;
}

export async function updateDriver(input: {
  driverId: string;
  driverType: DriverType;
  fullName: string;
  documentType?: string | null;
  documentNumber?: string | null;
  nuit?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  address?: string | null;
  administrativePostId?: string | null;
  localityId?: string | null;
  vehicleId?: string | null;
}) {
  const { error } = await supabase.rpc("update_driver", {
    p_driver_id: input.driverId,
    p_driver_type: input.driverType,
    p_full_name: input.fullName,
    p_document_type: input.documentType ?? null,
    p_document_number: input.documentNumber ?? null,
    p_nuit: input.nuit ?? null,
    p_phone: input.phone ?? null,
    p_email: input.email ?? null,
    p_birth_date: input.birthDate ?? null,
    p_address: input.address ?? null,
    p_administrative_post_id: input.administrativePostId ?? null,
    p_locality_id: input.localityId ?? null,
    p_vehicle_id: input.vehicleId ?? null,
  });

  throwRpc(error, "Não foi possível actualizar o taxista/condutor.");
}

export async function setDriverStatus(input: {
  driverId: string;
  status: DriverStatus;
  reason: string;
}) {
  const { error } = await supabase.rpc("set_driver_status", {
    p_driver_id: input.driverId,
    p_status: input.status,
    p_reason: input.reason,
  });

  throwRpc(error, "Não foi possível alterar o estado do taxista/condutor.");
}
