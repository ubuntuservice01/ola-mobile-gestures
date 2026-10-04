import { supabase } from "./supabase";

export type ManagedUserRole =
  | "admin_municipal"
  | "tecnico"
  | "fiscal"
  | "financeiro";

type AdminUsersResponse = {
  id?: string;
  email?: string;
  created?: boolean;
  activationCode?: string;
  activationExpiresAt?: string;
  updated?: boolean;
  status?: string;
  error?: string;
};

async function invokeAdminUsers(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke<AdminUsersResponse>(
    "admin-users",
    { body },
  );

  if (error) {
    const context = (error as { context?: Response }).context;

    if (context && typeof context.clone === "function") {
      try {
        const payload = await context.clone().json() as AdminUsersResponse;
        if (payload?.error) {
          throw new Error(payload.error);
        }
      } catch (contextError) {
        if (contextError instanceof Error && contextError.message) {
          throw contextError;
        }
      }
    }

    throw new Error(
      error.message || "Falha ao contactar o serviço de utilizadores.",
    );
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data ?? {};
}

export async function createManagedUser(input: {
  email: string;
  fullName: string;
  phone?: string | null;
  role: ManagedUserRole;
  municipalityId: string;
  administrativePostId?: string | null;
  accessSessionId?: string | null;
}) {
  return invokeAdminUsers({
    action: "create",
    email: input.email,
    fullName: input.fullName,
    phone: input.phone ?? null,
    role: input.role,
    municipalityId: input.municipalityId,
    administrativePostId: input.administrativePostId ?? null,
    accessSessionId: input.accessSessionId ?? null,
  });
}

export async function updateManagedUser(input: {
  userId: string;
  fullName: string;
  phone?: string | null;
  role: ManagedUserRole;
  municipalityId: string;
  administrativePostId?: string | null;
  accessSessionId?: string | null;
}) {
  return invokeAdminUsers({
    action: "update_profile",
    userId: input.userId,
    fullName: input.fullName,
    phone: input.phone ?? null,
    role: input.role,
    municipalityId: input.municipalityId,
    administrativePostId: input.administrativePostId ?? null,
    accessSessionId: input.accessSessionId ?? null,
  });
}

export async function setManagedUserStatus(input: {
  userId: string;
  status: "activo" | "suspenso" | "inactivo";
  reason: string;
  accessSessionId?: string | null;
}) {
  return invokeAdminUsers({
    action: "set_status",
    userId: input.userId,
    status: input.status,
    reason: input.reason,
    accessSessionId: input.accessSessionId ?? null,
  });
}
