import { supabase } from "./supabase";

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === "object" ? (data as T) : null;
}

export type PublicVehicleLookup = {
  mobigest_number: string;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  color: string | null;
  manufacture_year: number | null;
  operational_status: string;
  commercial_status: string;
  municipality_name: string;
  municipality_code: string;
  registration_date: string | null;
};

export type PublicDriverLookup = {
  driver_reference: string;
  full_name: string;
  driver_type: string;
  driver_status: string;
  municipality_name: string;
  municipality_code: string;
  primary_vehicle_number: string | null;
  primary_vehicle_type: string | null;
};

export async function lookupPublicVehicle(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const { data, error } = await supabase.rpc("lookup_public_vehicle", {
    p_code: normalized,
  });

  if (error) {
    throw new Error(error.message || "Não foi possível consultar o veículo.");
  }

  return firstRow<PublicVehicleLookup>(data);
}

export async function lookupPublicDriver(reference: string) {
  const normalized = reference.trim().toUpperCase();
  if (!normalized) return null;

  const { data, error } = await supabase.rpc("lookup_public_driver", {
    p_reference: normalized,
  });

  if (error) {
    throw new Error(
      error.message || "Não foi possível consultar o taxista/condutor.",
    );
  }

  return firstRow<PublicDriverLookup>(data);
}
