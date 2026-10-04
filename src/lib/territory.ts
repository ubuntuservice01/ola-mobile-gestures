import { supabase } from "./supabase";

function assertRpc(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export async function createAdministrativePost(input: {
  name: string;
  code?: string | null;
}) {
  const { data, error } = await supabase.rpc("create_administrative_post", {
    p_name: input.name,
    p_code: input.code ?? null,
  });

  assertRpc(error, "Não foi possível criar o posto administrativo.");
  if (typeof data !== "string") {
    throw new Error("O Supabase não devolveu o identificador do posto.");
  }
  return data;
}

export async function updateAdministrativePost(input: {
  id: string;
  name: string;
  code?: string | null;
  status: "activo" | "inactivo";
}) {
  const { error } = await supabase.rpc("update_administrative_post", {
    p_id: input.id,
    p_name: input.name,
    p_code: input.code ?? null,
    p_status: input.status,
  });

  assertRpc(error, "Não foi possível actualizar o posto administrativo.");
}

export async function createLocality(input: {
  administrativePostId: string;
  name: string;
  code?: string | null;
  type: "localidade" | "bairro" | "povoacao" | "outro";
}) {
  const { data, error } = await supabase.rpc("create_locality", {
    p_administrative_post_id: input.administrativePostId,
    p_name: input.name,
    p_code: input.code ?? null,
    p_type: input.type,
  });

  assertRpc(error, "Não foi possível criar a localidade/bairro.");
  if (typeof data !== "string") {
    throw new Error("O Supabase não devolveu o identificador da localidade.");
  }
  return data;
}

export async function updateLocality(input: {
  id: string;
  administrativePostId: string;
  name: string;
  code?: string | null;
  type: "localidade" | "bairro" | "povoacao" | "outro";
  status: "activo" | "inactivo";
}) {
  const { error } = await supabase.rpc("update_locality", {
    p_id: input.id,
    p_administrative_post_id: input.administrativePostId,
    p_name: input.name,
    p_code: input.code ?? null,
    p_type: input.type,
    p_status: input.status,
  });

  assertRpc(error, "Não foi possível actualizar a localidade/bairro.");
}
