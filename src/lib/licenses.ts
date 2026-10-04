import { supabase } from "./supabase";

export type LicenseStatus =
  | "em_configuracao"
  | "activa"
  | "suspensa"
  | "expirada"
  | "cancelada";

export type CurrentLicenseAccess = {
  municipality_id: string;
  license_id: string | null;
  license_code: string | null;
  plan_id: string | null;
  plan_name: string | null;
  effective_status: string;
  starts_at: string | null;
  ends_at: string | null;
  max_users: number | null;
  max_vehicles: number | null;
  modules: unknown;
};

function throwRpc(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export async function createLicensePlan(input: {
  code: string;
  name: string;
  description?: string | null;
  maxUsers?: number | null;
  maxVehicles?: number | null;
  modules: string[];
  active: boolean;
}) {
  const { data, error } = await supabase.rpc(
    "super_admin_create_license_plan",
    {
      p_code: input.code,
      p_name: input.name,
      p_description: input.description ?? null,
      p_max_users: input.maxUsers ?? null,
      p_max_vehicles: input.maxVehicles ?? null,
      p_modules: input.modules,
      p_active: input.active,
    },
  );

  throwRpc(error, "Não foi possível criar o plano.");

  if (typeof data !== "string") {
    throw new Error("O servidor não devolveu o identificador do plano.");
  }

  return data;
}

export async function updateLicensePlan(input: {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  maxUsers?: number | null;
  maxVehicles?: number | null;
  modules: string[];
  active: boolean;
}) {
  const { error } = await supabase.rpc(
    "super_admin_update_license_plan",
    {
      p_id: input.id,
      p_code: input.code,
      p_name: input.name,
      p_description: input.description ?? null,
      p_max_users: input.maxUsers ?? null,
      p_max_vehicles: input.maxVehicles ?? null,
      p_modules: input.modules,
      p_active: input.active,
    },
  );

  throwRpc(error, "Não foi possível actualizar o plano.");
}

export async function createLicense(input: {
  municipalityId: string;
  planId: string;
  startsAt?: string | null;
  endsAt?: string | null;
  status: "em_configuracao" | "activa" | "suspensa";
  maxUsers?: number | null;
  maxVehicles?: number | null;
  notes?: string | null;
}) {
  const { data, error } = await supabase.rpc(
    "super_admin_create_license",
    {
      p_municipality_id: input.municipalityId,
      p_plan_id: input.planId,
      p_starts_at: input.startsAt ?? null,
      p_ends_at: input.endsAt ?? null,
      p_status: input.status,
      p_max_users: input.maxUsers ?? null,
      p_max_vehicles: input.maxVehicles ?? null,
      p_notes: input.notes ?? null,
    },
  );

  throwRpc(error, "Não foi possível criar a licença.");

  if (typeof data !== "string") {
    throw new Error("O servidor não devolveu a licença criada.");
  }

  return data;
}

export async function updateLicense(input: {
  licenseId: string;
  planId: string;
  startsAt?: string | null;
  endsAt?: string | null;
  maxUsers?: number | null;
  maxVehicles?: number | null;
  notes?: string | null;
}) {
  const { error } = await supabase.rpc(
    "super_admin_update_license",
    {
      p_license_id: input.licenseId,
      p_plan_id: input.planId,
      p_starts_at: input.startsAt ?? null,
      p_ends_at: input.endsAt ?? null,
      p_max_users: input.maxUsers ?? null,
      p_max_vehicles: input.maxVehicles ?? null,
      p_notes: input.notes ?? null,
    },
  );

  throwRpc(error, "Não foi possível actualizar a licença.");
}

export async function setLicenseStatus(input: {
  licenseId: string;
  status: "em_configuracao" | "activa" | "suspensa" | "cancelada";
  reason: string;
}) {
  const { error } = await supabase.rpc(
    "super_admin_set_license_status",
    {
      p_license_id: input.licenseId,
      p_status: input.status,
      p_reason: input.reason,
    },
  );

  throwRpc(error, "Não foi possível alterar o estado da licença.");
}

export async function renewLicense(input: {
  licenseId: string;
  newEndsAt: string;
  reason: string;
}) {
  const { error } = await supabase.rpc(
    "super_admin_renew_license",
    {
      p_license_id: input.licenseId,
      p_new_ends_at: input.newEndsAt,
      p_reason: input.reason,
    },
  );

  throwRpc(error, "Não foi possível renovar a licença.");
}

export async function loadCurrentLicenseAccess():
  Promise<CurrentLicenseAccess | null> {
  const { data, error } = await supabase.rpc("current_license_access");

  if (error) {
    throw new Error(
      error.message || "Não foi possível verificar a licença municipal.",
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row ? (row as CurrentLicenseAccess) : null;
}

export function effectiveLicenseStatus(input: {
  status: string;
  starts_at: string | null;
  ends_at: string | null;
}) {
  if (input.status !== "activa") return input.status;

  const today = new Date().toISOString().slice(0, 10);

  if (input.starts_at && input.starts_at > today) return "aguarda_inicio";
  if (input.ends_at && input.ends_at < today) return "expirada";
  return "activa";
}
