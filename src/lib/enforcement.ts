import { supabase } from "./supabase";

const EVIDENCE_BUCKET = "mobigest-evidence";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === "object" ? (data as T) : null;
}

function throwRpc(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

function safeFileName(name: string) {
  const extension = name.includes(".")
    ? "." + name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";

  const base = name
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return (base || "evidencia") + extension;
}

export type FiscalizationResult =
  | "regular"
  | "irregular"
  | "pendente"
  | "nao_localizado"
  | "outro";

export async function createFiscalization(input: {
  vehicleId: string;
  result: FiscalizationResult;
  occurrence?: string | null;
  observation?: string | null;
  administrativePostId?: string | null;
  localityId?: string | null;
  occurredAt?: string | null;
}) {
  const { data, error } = await supabase.rpc("create_fiscalization", {
    p_vehicle_id: input.vehicleId,
    p_result: input.result,
    p_occurrence: input.occurrence ?? null,
    p_observation: input.observation ?? null,
    p_administrative_post_id: input.administrativePostId ?? null,
    p_locality_id: input.localityId ?? null,
    p_occurred_at: input.occurredAt ?? null,
  });

  throwRpc(error, "Não foi possível registar a fiscalização.");

  if (typeof data !== "string") {
    throw new Error("O servidor não devolveu o identificador da fiscalização.");
  }

  return data;
}

export async function uploadFiscalizationEvidence(input: {
  municipalityId: string;
  fiscalizationId: string;
  file: File;
  description?: string | null;
}) {
  if (!ALLOWED_TYPES.has(input.file.type)) {
    throw new Error("Formato não permitido. Use PDF, JPG, PNG ou WEBP.");
  }

  if (input.file.size > MAX_FILE_SIZE) {
    throw new Error("A evidência excede o limite de 10 MB.");
  }

  const path =
    input.municipalityId +
    "/fiscalization/" +
    input.fiscalizationId +
    "/" +
    crypto.randomUUID() +
    "-" +
    safeFileName(input.file.name);

  const { error: uploadError } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.file.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Não foi possível carregar a evidência.");
  }

  const { data, error } = await supabase.rpc("add_fiscalization_evidence", {
    p_fiscalization_id: input.fiscalizationId,
    p_file_path: path,
    p_description: input.description?.trim() || null,
  });

  if (error || typeof data !== "string") {
    await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
    throwRpc(error, "Não foi possível associar a evidência à fiscalização.");
    throw new Error("O servidor não devolveu a evidência criada.");
  }

  return data;
}

export async function createEvidenceViewUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(filePath, 60);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Não foi possível abrir a evidência.");
  }

  return data.signedUrl;
}

export async function createFineType(input: {
  code: string;
  name: string;
  description?: string | null;
  amount: number;
  active?: boolean;
}) {
  const { data, error } = await supabase.rpc("create_fine_type", {
    p_code: input.code,
    p_name: input.name,
    p_description: input.description ?? null,
    p_amount: input.amount,
    p_active: input.active ?? true,
  });

  throwRpc(error, "Não foi possível criar o tipo de multa.");

  if (typeof data !== "string") {
    throw new Error("O servidor não devolveu o identificador do tipo de multa.");
  }

  return data;
}

export async function updateFineType(input: {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  amount: number;
  active: boolean;
}) {
  const { error } = await supabase.rpc("update_fine_type", {
    p_id: input.id,
    p_code: input.code,
    p_name: input.name,
    p_description: input.description ?? null,
    p_amount: input.amount,
    p_active: input.active,
  });

  throwRpc(error, "Não foi possível actualizar o tipo de multa.");
}

export async function issueFine(input: {
  driverId: string;
  fineTypeId: string;
  vehicleId?: string | null;
  location?: string | null;
  observation?: string | null;
  occurredAt?: string | null;
}) {
  const { data, error } = await supabase.rpc("issue_fine", {
    p_driver_id: input.driverId,
    p_fine_type_id: input.fineTypeId,
    p_vehicle_id: input.vehicleId ?? null,
    p_location: input.location ?? null,
    p_observation: input.observation ?? null,
    p_occurred_at: input.occurredAt ?? null,
  });

  throwRpc(error, "Não foi possível emitir a multa.");

  const row = firstRow<{
    fine_id: string;
    fine_reference: string;
    charge_id: string;
    amount: number;
  }>(data);

  if (!row) {
    throw new Error("O servidor não devolveu a multa emitida.");
  }

  return row;
}

export async function setFineCaseStatus(input: {
  fineId: string;
  status: "pendente" | "anulada" | "em_recurso";
  reason: string;
}) {
  const { error } = await supabase.rpc("set_fine_case_status", {
    p_fine_id: input.fineId,
    p_status: input.status,
    p_reason: input.reason,
  });

  throwRpc(error, "Não foi possível alterar o estado da multa.");
}
