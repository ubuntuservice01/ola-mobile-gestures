import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  KeyRound,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  SuperAdminShell,
  SuperCard,
} from "../../../components/SuperAdminShell";
import {
  effectiveLicenseStatus,
  renewLicense,
  setLicenseStatus,
  updateLicense,
} from "../../../lib/licenses";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/super-admin/licencas/$id")({
  component: LicencaDetalhe,
});

type License = {
  id: string;
  municipality_id: string;
  plan_id: string;
  license_code: string;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  max_users: number | null;
  max_vehicles: number | null;
  notes: string | null;
  created_at: string;
};

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  max_users: number | null;
  max_vehicles: number | null;
  modules: unknown;
  active: boolean;
};

function LicencaDetalhe() {
  const { id } = Route.useParams();

  const [license, setLicense] = useState<License | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [municipalityName, setMunicipalityName] = useState("—");
  const [municipalityCode, setMunicipalityCode] = useState("—");
  const [activeUsers, setActiveUsers] = useState(0);
  const [vehicles, setVehicles] = useState(0);

  const [editing, setEditing] = useState(false);
  const [editPlanId, setEditPlanId] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editMaxUsers, setEditMaxUsers] = useState("");
  const [editMaxVehicles, setEditMaxVehicles] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [statusTarget, setStatusTarget] = useState<
    "activa" | "suspensa" | "cancelada" | "em_configuracao" | null
  >(null);
  const [statusReason, setStatusReason] = useState("");

  const [renewing, setRenewing] = useState(false);
  const [renewEnd, setRenewEnd] = useState("");
  const [renewReason, setRenewReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [licenseResult, plansResult] = await Promise.all([
        supabase
          .from("licenses")
          .select(
            "id, municipality_id, plan_id, license_code, starts_at, ends_at, status, max_users, max_vehicles, notes, created_at",
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("license_plans")
          .select(
            "id, code, name, description, max_users, max_vehicles, modules, active",
          )
          .order("name", { ascending: true }),
      ]);

      if (!active) return;

      const error = licenseResult.error ?? plansResult.error;
      if (error || !licenseResult.data) {
        console.error("Falha ao carregar licença:", error);
        setLoadError("Licença não encontrada ou indisponível.");
        setLoading(false);
        return;
      }

      const current = licenseResult.data as License;

      const [municipalityResult, usersResult, vehiclesResult] =
        await Promise.all([
          supabase
            .from("municipalities")
            .select("name, code")
            .eq("id", current.municipality_id)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("municipality_id", current.municipality_id)
            .eq("status", "activo"),
          supabase
            .from("vehicles")
            .select("id", { count: "exact", head: true })
            .eq("municipality_id", current.municipality_id)
            .neq("status", "cancelada"),
        ]);

      if (!active) return;

      const relationError =
        municipalityResult.error ??
        usersResult.error ??
        vehiclesResult.error;

      if (relationError) {
        console.error(
          "Falha ao carregar utilização da licença:",
          relationError,
        );
        setLoadError(
          "A licença foi encontrada, mas a utilização não pôde ser carregada.",
        );
        setLoading(false);
        return;
      }

      setLicense(current);
      setPlans((plansResult.data ?? []) as Plan[]);
      setMunicipalityName(
        municipalityResult.data?.name ?? "Município",
      );
      setMunicipalityCode(
        municipalityResult.data?.code ?? "—",
      );
      setActiveUsers(usersResult.count ?? 0);
      setVehicles(vehiclesResult.count ?? 0);

      setEditPlanId(current.plan_id);
      setEditStart(current.starts_at ?? "");
      setEditEnd(current.ends_at ?? "");
      setEditMaxUsers(
        current.max_users !== null ? String(current.max_users) : "",
      );
      setEditMaxVehicles(
        current.max_vehicles !== null ? String(current.max_vehicles) : "",
      );
      setEditNotes(current.notes ?? "");
      setEditing(false);
      setStatusTarget(null);
      setStatusReason("");
      setRenewing(false);
      setRenewEnd("");
      setRenewReason("");
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, refreshToken]);

  const plan =
    plans.find((item) => item.id === license?.plan_id) ?? null;
  const editPlan =
    plans.find((item) => item.id === editPlanId) ?? null;
  const effectiveStatus = license
    ? effectiveLicenseStatus(license)
    : "—";
  const modules = normalizeModules(plan?.modules);

  const effectiveMaxUsers =
    license?.max_users ?? plan?.max_users ?? null;
  const effectiveMaxVehicles =
    license?.max_vehicles ?? plan?.max_vehicles ?? null;

  const editEffectiveUsers =
    editMaxUsers !== ""
      ? Number(editMaxUsers)
      : editPlan?.max_users ?? null;
  const editEffectiveVehicles =
    editMaxVehicles !== ""
      ? Number(editMaxVehicles)
      : editPlan?.max_vehicles ?? null;

  const canSaveEdit =
    Boolean(editPlanId) &&
    (!editStart || !editEnd || editEnd >= editStart) &&
    !saving;

  const saveEdit = async () => {
    if (!license || !canSaveEdit) return;

    const parsedUsers = editMaxUsers
      ? Number(editMaxUsers)
      : null;
    const parsedVehicles = editMaxVehicles
      ? Number(editMaxVehicles)
      : null;

    if (
      (parsedUsers !== null &&
        (!Number.isInteger(parsedUsers) || parsedUsers <= 0)) ||
      (parsedVehicles !== null &&
        (!Number.isInteger(parsedVehicles) ||
          parsedVehicles <= 0))
    ) {
      setActionError(
        "Os limites devem ser números inteiros positivos.",
      );
      return;
    }

    setSaving(true);
    setActionError(null);
    setMessage(null);

    try {
      await updateLicense({
        licenseId: license.id,
        planId: editPlanId,
        startsAt: editStart || null,
        endsAt: editEnd || null,
        maxUsers: parsedUsers,
        maxVehicles: parsedVehicles,
        notes: editNotes.trim() || null,
      });

      setMessage("Licença actualizada.");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao actualizar licença:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível actualizar a licença.",
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (
      !license ||
      !statusTarget ||
      statusReason.trim().length < 4 ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setActionError(null);
    setMessage(null);

    try {
      await setLicenseStatus({
        licenseId: license.id,
        status: statusTarget,
        reason: statusReason.trim(),
      });

      setMessage("Estado da licença actualizado.");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao alterar estado da licença:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o estado da licença.",
      );
    } finally {
      setSaving(false);
    }
  };

  const renew = async () => {
    if (
      !license ||
      !renewEnd ||
      renewReason.trim().length < 4 ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setActionError(null);
    setMessage(null);

    try {
      await renewLicense({
        licenseId: license.id,
        newEndsAt: renewEnd,
        reason: renewReason.trim(),
      });

      setMessage("Licença renovada e reactivada.");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao renovar licença:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível renovar a licença.",
      );
    } finally {
      setSaving(false);
    }
  };

  const statusActions = useMemo(() => {
    if (!license || license.status === "cancelada") return [];

    if (effectiveStatus === "expirada") {
      return [["cancelada", "Cancelar"] as const];
    }

    if (license.status === "activa") {
      return [
        ["suspensa", "Suspender"] as const,
        ["cancelada", "Cancelar"] as const,
      ];
    }

    if (license.status === "suspensa") {
      return [
        ["activa", "Reactivar"] as const,
        ["cancelada", "Cancelar"] as const,
      ];
    }

    return [
      ["activa", "Activar"] as const,
      ["suspensa", "Suspender"] as const,
      ["cancelada", "Cancelar"] as const,
    ];
  }, [license, effectiveStatus]);

  return (
    <SuperAdminShell
      title="Detalhe da licença"
      subtitle="Estado, período, plano, limites, módulos e utilização efectiva."
    >
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Link
          to="/super-admin/licencas"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Licenças
        </Link>

        {license && license.status !== "cancelada" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing((value) => !value);
                setStatusTarget(null);
                setRenewing(false);
                setActionError(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              <Pencil className="h-4 w-4" />
              {editing ? "Fechar edição" : "Editar"}
            </button>

            {statusActions.map(([target, label]) => (
              <button
                key={target}
                type="button"
                onClick={() => {
                  setStatusTarget(target);
                  setStatusReason("");
                  setEditing(false);
                  setRenewing(false);
                  setActionError(null);
                }}
                className={
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold " +
                  (target === "cancelada"
                    ? "border-rose-200 text-rose-700"
                    : target === "suspensa"
                      ? "border-amber-200 text-amber-700"
                      : "border-emerald-200 text-emerald-700")
                }
              >
                {target === "cancelada" ||
                target === "suspensa" ? (
                  <Ban className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <SuperCard className="p-10 text-sm text-slate-500">
          A carregar licença...
        </SuperCard>
      ) : loadError || !license ? (
        <SuperCard className="p-10 text-sm font-medium text-red-700">
          {loadError ?? "Licença não encontrada."}
        </SuperCard>
      ) : (
        <div className="space-y-6">
          {actionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {actionError}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          {statusTarget && (
            <SuperCard className="border-amber-200 p-6">
              <h3 className="font-semibold">
                {statusActionLabel(statusTarget)} licença
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                A alteração produz efeito no acesso municipal e fica
                registada na auditoria.
              </p>

              <textarea
                value={statusReason}
                onChange={(event) =>
                  setStatusReason(event.target.value)
                }
                rows={3}
                placeholder="Motivo obrigatório..."
                className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2"
              />

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={
                    statusReason.trim().length < 4 || saving
                  }
                  onClick={changeStatus}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {saving
                    ? "A processar..."
                    : "Confirmar alteração"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusTarget(null);
                    setStatusReason("");
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </SuperCard>
          )}

          {editing && (
            <SuperCard className="p-6">
              <h3 className="font-semibold">Editar licença</h3>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">
                  Plano
                  <select
                    value={editPlanId}
                    onChange={(event) =>
                      setEditPlanId(event.target.value)
                    }
                    className={inputClass}
                  >
                    {plans
                      .filter(
                        (item) =>
                          item.active ||
                          item.id === license.plan_id,
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.code}
                        </option>
                      ))}
                  </select>
                </label>

                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <p className="text-xs text-slate-400">
                    Limites do plano seleccionado
                  </p>
                  <p className="mt-1 font-semibold">
                    {editPlan?.max_users ?? "∞"} utilizadores ·{" "}
                    {editPlan?.max_vehicles ?? "∞"} veículos
                  </p>
                </div>

                <label className="text-sm font-medium">
                  Início
                  <input
                    type="date"
                    value={editStart}
                    onChange={(event) =>
                      setEditStart(event.target.value)
                    }
                    className={inputClass}
                  />
                </label>

                <label className="text-sm font-medium">
                  Fim
                  <input
                    type="date"
                    min={editStart || undefined}
                    value={editEnd}
                    onChange={(event) =>
                      setEditEnd(event.target.value)
                    }
                    className={inputClass}
                  />
                </label>

                <Field
                  label="Limite personalizado de utilizadores"
                  value={editMaxUsers}
                  onChange={(value) =>
                    setEditMaxUsers(
                      value.replace(/[^0-9]/g, ""),
                    )
                  }
                  placeholder="Vazio = usar plano"
                />

                <Field
                  label="Limite personalizado de veículos"
                  value={editMaxVehicles}
                  onChange={(value) =>
                    setEditMaxVehicles(
                      value.replace(/[^0-9]/g, ""),
                    )
                  }
                  placeholder="Vazio = usar plano"
                />

                <label className="text-sm font-medium md:col-span-2">
                  Observações
                  <textarea
                    value={editNotes}
                    onChange={(event) =>
                      setEditNotes(event.target.value)
                    }
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Usage
                  label="Utilizadores"
                  current={activeUsers}
                  max={editEffectiveUsers}
                />
                <Usage
                  label="Veículos"
                  current={vehicles}
                  max={editEffectiveVehicles}
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  disabled={!canSaveEdit}
                  onClick={saveEdit}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  {saving
                    ? "A guardar..."
                    : "Guardar alterações"}
                </button>
              </div>
            </SuperCard>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <SuperCard className="p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <KeyRound className="h-7 w-7" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Licença
                  </p>
                  <h2 className="text-2xl font-bold">
                    {plan?.name ?? "Plano não encontrado"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {license.license_code} · {municipalityName}
                  </p>
                </div>

                <div className="ml-auto">
                  <LicenseStatus status={effectiveStatus} />
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <Info
                  label="Início"
                  value={formatDate(license.starts_at)}
                  icon={<CalendarDays />}
                />
                <Info
                  label="Fim"
                  value={formatDate(license.ends_at)}
                  icon={<CalendarDays />}
                />
                <Usage
                  label="Utilizadores"
                  current={activeUsers}
                  max={effectiveMaxUsers}
                />
                <Usage
                  label="Veículos"
                  current={vehicles}
                  max={effectiveMaxVehicles}
                />
              </div>

              {license.notes && (
                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  {license.notes}
                </div>
              )}
            </SuperCard>

            <SuperCard className="p-6">
              <h3 className="font-semibold">Estado da licença</h3>
              <div className="mt-4 space-y-3">
                <State
                  label="Município"
                  value={municipalityName}
                />
                <State
                  label="Código municipal"
                  value={municipalityCode}
                />
                <State
                  label="Plano"
                  value={plan?.name ?? "—"}
                />
                <State
                  label="Estado"
                  value={licenseStatusLabel(effectiveStatus)}
                />
              </div>
            </SuperCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SuperCard className="p-6">
              <h3 className="font-semibold">Módulos incluídos</h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {modules.length === 0 ? (
                  <p className="text-sm text-rose-600 sm:col-span-2">
                    O plano não possui módulos configurados.
                  </p>
                ) : (
                  modules.map((module) => (
                    <div
                      key={module}
                      className="rounded-xl bg-slate-50 p-3 text-sm font-medium"
                    >
                      <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-500" />
                      {moduleLabel(module)}
                    </div>
                  ))
                )}
              </div>
            </SuperCard>

            <SuperCard className="p-6">
              <h3 className="font-semibold">Renovação</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                A renovação prolonga a validade da mesma licença e
                conserva a alteração no histórico de auditoria.
              </p>

              {license.status === "cancelada" ? (
                <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Licenças canceladas são terminais e não podem
                  ser renovadas.
                </p>
              ) : renewing ? (
                <div className="mt-5">
                  <label className="text-sm font-medium">
                    Nova data de fim *
                    <input
                      type="date"
                      min={
                        license.ends_at ??
                        license.starts_at ??
                        undefined
                      }
                      value={renewEnd}
                      onChange={(event) =>
                        setRenewEnd(event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="mt-4 block text-sm font-medium">
                    Motivo *
                    <textarea
                      value={renewReason}
                      onChange={(event) =>
                        setRenewReason(event.target.value)
                      }
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={
                        !renewEnd ||
                        renewReason.trim().length < 4 ||
                        saving
                      }
                      onClick={renew}
                      className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {saving
                        ? "A renovar..."
                        : "Confirmar renovação"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenewing(false);
                        setRenewEnd("");
                        setRenewReason("");
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRenewing(true);
                    setEditing(false);
                    setStatusTarget(null);
                    setActionError(null);
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                >
                  <RefreshCw className="h-4 w-4" />
                  Preparar renovação
                </button>
              )}
            </SuperCard>
          </div>

          <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
            <ShieldCheck className="mr-2 inline h-4 w-4" />
            <b>Segurança:</b> suspender, expirar ou cancelar a
            licença deixa de satisfazer a autorização para
            utilizadores municipais. Os dados históricos não são
            apagados.
          </div>
        </div>
      )}
    </SuperAdminShell>
  );
}

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3";

function LicenseStatus({ status }: { status: string }) {
  const className =
    status === "activa"
      ? "bg-emerald-50 text-emerald-700"
      : status === "cancelada" || status === "expirada"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold " +
        className
      }
    >
      {status === "activa" && (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      {(status === "suspensa" ||
        status === "cancelada" ||
        status === "expirada") && (
        <XCircle className="h-3.5 w-3.5" />
      )}
      {licenseStatusLabel(status)}
    </span>
  );
}

function licenseStatusLabel(status: string) {
  const labels: Record<string, string> = {
    activa: "Activa",
    suspensa: "Suspensa",
    cancelada: "Cancelada",
    expirada: "Expirada",
    em_configuracao: "Em configuração",
    aguarda_inicio: "Aguarda início",
  };
  return labels[status] ?? status;
}

function statusActionLabel(
  status: "activa" | "suspensa" | "cancelada" | "em_configuracao",
) {
  if (status === "activa") return "Activar";
  if (status === "suspensa") return "Suspender";
  if (status === "cancelada") return "Cancelar";
  return "Colocar em configuração";
}

function normalizeModules(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
}

function moduleLabel(code: string) {
  const labels: Record<string, string> = {
    all: "Todos os módulos",
    core: "Core / Dashboard",
    vehicles: "Veículos",
    owners: "Proprietários",
    drivers: "Taxistas / Condutores",
    registrations: "Registos",
    documents: "Documentos",
    transfers: "Transferências",
    fiscalization: "Fiscalização",
    fines: "Multas",
    finance: "Financeiro",
    reports: "Relatórios",
    users: "Utilizadores",
    municipalities: "Município",
    settings: "Definições",
    audit: "Auditoria",
  };

  return labels[code] ?? code;
}

function formatDate(value: string | null) {
  return value
    ? new Date(value + "T00:00:00").toLocaleDateString("pt-MZ")
    : "—";
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function Info({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      {icon && <span className="text-slate-400">{icon}</span>}
      <p className="mt-1 text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Usage({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number | null;
}) {
  const exceeded = max !== null && current > max;

  return (
    <div
      className={
        "rounded-xl p-4 " +
        (exceeded ? "bg-rose-50" : "bg-slate-50")
      }
    >
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={
          "mt-1 text-sm font-semibold " +
          (exceeded ? "text-rose-700" : "")
        }
      >
        {current.toLocaleString("pt-MZ")} /{" "}
        {max === null
          ? "sem limite"
          : max.toLocaleString("pt-MZ")}
      </p>
    </div>
  );
}

function State({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
