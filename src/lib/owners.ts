import { supabase } from "./supabase";

export type OwnerStatus = "activo" | "inactivo" | "bloqueado";

export type OwnerPayload = {
  fullName: string;
  documentType?: string | null;
  documentNumber?: string | null;
  nuit?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  address?: string | null;
  administrativePostId?: string | null;
  localityId?: string | null;
  notes?: string | null;
};

function rpcError(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export async function createOwner(input: OwnerPayload) {
  const { data, error } = await supabase.rpc("create_owner", {
    p_full_name: input.fullName,
    p_document_type: input.documentType ?? null,
    p_document_number: input.documentNumber ?? null,
    p_nuit: input.nuit ?? null,
    p_phone: input.phone ?? null,
    p_alternate_phone: input.alternatePhone ?? null,
    p_email: input.email ?? null,
    p_address: input.address ?? null,
    p_administrative_post_id: input.administrativePostId ?? null,
    p_locality_id: input.localityId ?? null,
    p_notes: input.notes ?? null,
  });

  rpcError(error, "Não foi possível criar o proprietário.");

  if (typeof data !== "string") {
    throw new Error("O Supabase não devolveu o identificador do proprietário.");
  }

  return data;
}

export async function updateOwner(
  id: string,
  input: OwnerPayload & { status: OwnerStatus },
) {
  const { error } = await supabase.rpc("update_owner", {
    p_id: id,
    p_full_name: input.fullName,
    p_document_type: input.documentType ?? null,
    p_document_number: input.documentNumber ?? null,
    p_nuit: input.nuit ?? null,
    p_phone: input.phone ?? null,
    p_alternate_phone: input.alternatePhone ?? null,
    p_email: input.email ?? null,
    p_address: input.address ?? null,
    p_administrative_post_id: input.administrativePostId ?? null,
    p_locality_id: input.localityId ?? null,
    p_notes: input.notes ?? null,
    p_status: input.status,
  });

  rpcError(error, "Não foi possível actualizar o proprietário.");
}
