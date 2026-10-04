import { supabase } from "./supabase";

export type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  actor_name: string;
  actor_role: string | null;
  municipality_id: string | null;
  municipality_name: string;
  module: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  result: string | null;
  reference: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  observation: string | null;
  origin: string | null;
  created_at: string;
};

function normalizeRows(data: unknown): AuditLogRow[] {
  return Array.isArray(data) ? (data as AuditLogRow[]) : [];
}

export async function loadMunicipalAuditLogs(limit = 500) {
  const { data, error } = await supabase.rpc("list_municipal_audit_logs", {
    p_limit: limit,
  });

  if (error) {
    throw new Error(error.message || "Não foi possível carregar a auditoria.");
  }

  return normalizeRows(data);
}

export async function loadGlobalAuditLogs(limit = 1000) {
  const { data, error } = await supabase.rpc("list_global_audit_logs", {
    p_limit: limit,
  });

  if (error) {
    throw new Error(
      error.message || "Não foi possível carregar a auditoria global.",
    );
  }

  return normalizeRows(data);
}

function csvCell(value: unknown) {
  let text =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);

  if (/^[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  return '"' + text.replace(/"/g, '""') + '"';
}

export function exportAuditCsv(
  rows: AuditLogRow[],
  fileName: string,
) {
  const headers = [
    "Data/Hora",
    "Utilizador",
    "Perfil",
    "Município",
    "Módulo",
    "Acção",
    "Entidade",
    "Referência",
    "Resultado",
    "Origem",
    "Observação",
    "Valor anterior",
    "Novo valor",
  ];

  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.created_at,
        row.actor_name,
        row.actor_role,
        row.municipality_name,
        row.module,
        row.action,
        row.entity_type,
        row.reference,
        row.result,
        row.origin,
        row.observation,
        row.old_values,
        row.new_values,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function roleLabel(role: string | null) {
  const labels: Record<string, string> = {
    super_admin: "Super Administrador",
    admin_municipal: "Administrador Municipal",
    tecnico: "Técnico",
    fiscal: "Fiscal",
    financeiro: "Financeiro",
  };

  return role ? labels[role] ?? role : "Sistema";
}

export function actionLabel(action: string) {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
