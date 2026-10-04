import { supabase } from "./supabase";

export type MunicipalAccessMode = "consulta" | "assistencia";

export type MunicipalAccessSession = {
  session_id: string;
  municipality_id: string;
  municipality_name: string;
  municipality_code: string;
  access_mode: MunicipalAccessMode;
  reason: string;
  starts_at: string;
  expires_at: string;
};

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === "object" ? (data as T) : null;
}

export async function loadCurrentMunicipalAccess(): Promise<MunicipalAccessSession | null> {
  const { data, error } = await supabase.rpc("super_admin_current_municipal_access");

  if (error) {
    // Durante rollout de migrations, ausência da RPC é tratada como sem sessão.
    console.error("Falha ao consultar sessão municipal do Super Admin:", error);
    return null;
  }

  return firstRow<MunicipalAccessSession>(data);
}

export async function startMunicipalAccess(input: {
  municipalityId: string;
  mode: MunicipalAccessMode;
  reason: string;
  durationMinutes: number;
}) {
  const { data, error } = await supabase.rpc("super_admin_start_municipal_access", {
    p_municipality_id: input.municipalityId,
    p_mode: input.mode,
    p_reason: input.reason,
    p_duration_minutes: input.durationMinutes,
  });

  if (error) throw error;

  const session = firstRow<MunicipalAccessSession>(data);
  if (!session) {
    throw new Error("O Supabase não devolveu a sessão municipal criada.");
  }

  return session;
}

export async function endMunicipalAccess(sessionId: string, reason = "Encerramento manual") {
  const { error } = await supabase.rpc("super_admin_end_municipal_access", {
    p_session_id: sessionId,
    p_reason: reason,
  });

  if (error) throw error;
}

export function remainingSessionSeconds(expiresAt: string) {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}
