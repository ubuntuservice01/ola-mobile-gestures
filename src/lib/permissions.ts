import { supabase } from "./supabase";

export type RoleCode =
  | "super_admin"
  | "admin_municipal"
  | "tecnico"
  | "fiscal"
  | "financeiro";

export type PermissionRow = {
  id: string;
  code: string;
  module: string;
  action: string;
  description: string | null;
};

export type RolePermissionRow = {
  role: RoleCode;
  permission_id: string;
  allowed: boolean;
};

export const ROLE_ORDER: RoleCode[] = [
  "super_admin",
  "admin_municipal",
  "tecnico",
  "fiscal",
  "financeiro",
];

export const ROLE_META: Record<
  RoleCode,
  { name: string; scope: string; description: string; slug: string }
> = {
  super_admin: {
    name: "Super Administrador",
    scope: "Plataforma inteira",
    description:
      "Administração global, municípios, licenças, segurança e configuração da plataforma.",
    slug: "super-administrador",
  },
  admin_municipal: {
    name: "Administrador Municipal",
    scope: "Município atribuído",
    description:
      "Administração operacional do município e gestão dos utilizadores municipais.",
    slug: "administrador-municipal",
  },
  tecnico: {
    name: "Técnico",
    scope: "Município / posto",
    description:
      "Registo, documentação, validação e actualização de processos no âmbito autorizado.",
    slug: "tecnico",
  },
  fiscal: {
    name: "Fiscal",
    scope: "Município / posto",
    description:
      "Consulta operacional, fiscalização e emissão de actos autorizados.",
    slug: "fiscal",
  },
  financeiro: {
    name: "Financeiro",
    scope: "Município",
    description:
      "Cobranças, pagamentos, taxas e informação financeira autorizada.",
    slug: "financeiro",
  },
};

export function roleFromSlug(slug: string): RoleCode | null {
  return (
    ROLE_ORDER.find((role) => ROLE_META[role].slug === slug) ?? null
  );
}

export async function loadRbac() {
  const [permissionsResult, rolePermissionsResult] = await Promise.all([
    supabase
      .from("permissions")
      .select("id, code, module, action, description")
      .order("module", { ascending: true })
      .order("action", { ascending: true }),
    supabase
      .from("role_permissions")
      .select("role, permission_id, allowed"),
  ]);

  const error =
    permissionsResult.error ?? rolePermissionsResult.error;

  if (error) {
    throw new Error(
      error.message || "Não foi possível carregar as permissões.",
    );
  }

  return {
    permissions: (permissionsResult.data ?? []) as PermissionRow[],
    rolePermissions:
      (rolePermissionsResult.data ?? []) as RolePermissionRow[],
  };
}

export function permissionSet(
  rolePermissions: RolePermissionRow[],
  role: RoleCode,
) {
  return new Set(
    rolePermissions
      .filter((item) => item.role === role && item.allowed)
      .map((item) => item.permission_id),
  );
}

export function moduleLabel(module: string) {
  const labels: Record<string, string> = {
    vehicles: "Veículos",
    owners: "Proprietários",
    registrations: "Registos",
    documents: "Documentos",
    fiscalization: "Fiscalização",
    finance: "Financeiro",
    reports: "Relatórios",
    users: "Utilizadores",
    municipalities: "Municípios",
    settings: "Definições",
    ownership: "Transferências",
    drivers: "Taxistas / Condutores",
    fines: "Multas",
    fine_types: "Tipos de multa",
    audit: "Auditoria",
  };

  return labels[module] ?? humanize(module);
}

export function actionLabel(action: string) {
  const labels: Record<string, string> = {
    view: "Consultar",
    create: "Criar",
    update: "Actualizar",
    validate: "Validar",
    manage: "Gerir",
    change_status: "Alterar estado",
    transfer: "Transferir",
    approve: "Aprovar",
  };

  return labels[action] ?? humanize(action);
}

export function humanize(value: string) {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
