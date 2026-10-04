import { supabase } from "./supabase";

export type MobiGestRole =
  | "super_admin"
  | "admin_municipal"
  | "tecnico"
  | "fiscal"
  | "financeiro";

export type AccessProfile = {
  id: string;
  role: MobiGestRole;
  status: "activo" | "suspenso" | "inactivo";
  municipality_id: string | null;
  administrative_post_id: string | null;
};

const VALID_ROLES = new Set<MobiGestRole>([
  "super_admin",
  "admin_municipal",
  "tecnico",
  "fiscal",
  "financeiro",
]);

export async function loadAccessProfile(userId: string): Promise<AccessProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, status, municipality_id, administrative_post_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  if (!VALID_ROLES.has(data.role as MobiGestRole)) return null;

  return data as AccessProfile;
}

export function profileAccessProblem(profile: AccessProfile | null):
  | "missing_profile"
  | "inactive"
  | "missing_municipality"
  | null {
  if (!profile) return "missing_profile";
  if (profile.status !== "activo") return "inactive";

  if (profile.role !== "super_admin" && !profile.municipality_id) {
    return "missing_municipality";
  }

  return null;
}

export function defaultRouteForProfile(
  profile: AccessProfile,
  hasMunicipalAccess = false,
) {
  if (profile.role === "super_admin") {
    return hasMunicipalAccess ? "/dashboard" : "/super-admin";
  }

  return "/dashboard";
}

export function isPathAllowedForProfile(
  pathname: string,
  profile: AccessProfile,
  hasMunicipalAccess = false,
) {
  const isSuperAdminArea =
    pathname === "/super-admin" || pathname.startsWith("/super-admin/");

  if (profile.role === "super_admin") {
    // Sem sessão auditada, o Super Admin permanece na administração global.
    // Com sessão auditada, permanece exclusivamente no contexto municipal até
    // terminar ou expirar a sessão.
    return hasMunicipalAccess ? !isSuperAdminArea : isSuperAdminArea;
  }

  return !isSuperAdminArea;
}

export function accessReasonMessage(reason: string | null) {
  switch (reason) {
    case "missing_profile":
      return "A sua conta existe, mas ainda não possui um perfil MobiGest autorizado.";
    case "inactive":
      return "A sua conta MobiGest está suspensa ou inactiva. Contacte a administração.";
    case "missing_municipality":
      return "A sua conta municipal ainda não está associada a um município.";
    case "access_denied":
      return "Não tem permissão para aceder à área solicitada.";
    default:
      return null;
  }
}


export function isSafeInternalPath(pathname: string | null): pathname is string {
  return Boolean(
    pathname &&
      pathname.startsWith("/") &&
      !pathname.startsWith("//") &&
      !pathname.includes("\\")
  );
}
