import { supabase } from "./supabase";

export type ManagedUserRole =
  | "admin_municipal"
  | "tecnico"
  | "fiscal"
  | "financeiro";

type AdminUsersResponse = {
  id?: string;
  email?: string;
  invited?: boolean;
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
    throw new Error(error.message || "Falha ao contactar o serviço de utilizadores.");
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
}) {
  return invokeAdminUsers({
    action: "create",
    email: input.email,
    fullName: input.fullName,
    phone: input.phone ?? null,
    role: input.role,
    municipalityId: input.municipalityId,
    administrativePostId: input.administrativePostId ?? null,
  });
}

export async function updateManagedUser(input: {
  userId: string;
  fullName: string;
  phone?: string | null;
  role: ManagedUserRole;
  municipalityId: string;
  administrativePostId?: string | null;
}) {
  return invokeAdminUsers({
    action: "update_profile",
    userId: input.userId,
    fullName: input.fullName,
    phone: input.phone ?? null,
    role: input.role,
    municipalityId: input.municipalityId,
    administrativePostId: input.administrativePostId ?? null,
  });
}

export async function setManagedUserStatus(input: {
  userId: string;
  status: "activo" | "suspenso" | "inactivo";
  reason: string;
}) {
  return invokeAdminUsers({
    action: "set_status",
    userId: input.userId,
    status: input.status,
    reason: input.reason,
  });
}
