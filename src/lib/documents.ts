import { supabase } from "./supabase";

export type DocumentSubjectType = "owner" | "vehicle" | "registration";

const BUCKET = "mobigest-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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

  return (base || "documento") + extension;
}

function rpcError(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export async function uploadDocument(input: {
  municipalityId: string;
  subjectType: DocumentSubjectType;
  subjectId: string;
  documentType: string;
  file: File;
  documentNumber?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
}) {
  if (!ALLOWED_TYPES.has(input.file.type)) {
    throw new Error("Formato não permitido. Use PDF, JPG, PNG ou WEBP.");
  }

  if (input.file.size > MAX_FILE_SIZE) {
    throw new Error("O ficheiro excede o limite de 10 MB.");
  }

  if (!input.documentType.trim()) {
    throw new Error("Seleccione ou informe o tipo de documento.");
  }

  const path =
    input.municipalityId +
    "/" +
    input.subjectType +
    "/" +
    input.subjectId +
    "/" +
    crypto.randomUUID() +
    "-" +
    safeFileName(input.file.name);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.file.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Não foi possível carregar o ficheiro.");
  }

  const { data, error } = await supabase.rpc("create_document_metadata", {
    p_subject_type: input.subjectType,
    p_subject_id: input.subjectId,
    p_document_type: input.documentType.trim(),
    p_file_path: path,
    p_document_number: input.documentNumber?.trim() || null,
    p_issued_at: input.issuedAt || null,
    p_expires_at: input.expiresAt || null,
  });

  if (error || typeof data !== "string") {
    await supabase.storage.from(BUCKET).remove([path]);
    rpcError(error, "Não foi possível registar os metadados do documento.");
    throw new Error("O servidor não devolveu o identificador do documento.");
  }

  return data;
}

export async function createDocumentViewUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Não foi possível abrir o documento.");
  }

  return data.signedUrl;
}

export async function validateDocument(input: {
  documentId: string;
  status: "validado" | "rejeitado";
  reason?: string | null;
}) {
  const { error } = await supabase.rpc("validate_document", {
    p_document_id: input.documentId,
    p_status: input.status,
    p_reason: input.reason?.trim() || null,
  });

  rpcError(error, "Não foi possível validar o documento.");
}
