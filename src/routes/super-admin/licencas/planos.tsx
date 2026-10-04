import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  KeyRound,
  Pencil,
  Plus,
  Save,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";
import {
  createLicensePlan,
  updateLicensePlan,
} from "../../../lib/licenses";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/super-admin/licencas/planos")({
  component: Planos,
});

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

type PlanForm = {
  id?: string;
  code: string;
  name: string;
  description: string;
  maxUsers: string;
  maxVehicles: string;
  modules: string[];
  active: boolean;
};

const MODULE_OPTIONS = [
  ["core", "Core / Dashboard"],
  ["vehicles", "Veículos"],
  ["owners", "Proprietários"],
  ["drivers", "Taxistas / Condutores"],
  ["registrations", "Registos"],
  ["documents", "Documentos"],
  ["transfers", "Transferências"],
  ["fiscalization", "Fiscalização"],
  ["fines", "Multas"],
  ["finance", "Financeiro"],
  ["reports", "Relatórios"],
  ["users", "Utilizadores"],
  ["municipalities", "Município"],
  ["settings", "Definições"],
  ["audit", "Auditoria"],
] as const;

function blankForm(): PlanForm {
  return {
    code: "",
    name: "",
    description: "",
    maxUsers: "",
    maxVehicles: "",
    modules: MODULE_OPTIONS.map(([code]) => code),
    active: true,
  };
}

function Planos() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [edit, setEdit] = useState<PlanForm | null>(null);
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

      const { data, error } = await supabase
        .from("license_plans")
        .select(
          "id, code, name, description, max_users, max_vehicles, modules, active",
        )
        .order("active", { ascending: false })
        .order("name", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar planos de licença:", error);
        setLoadError("Não foi possível carregar os planos de licença.");
        setLoading(false);
        return;
      }

      setRows((data ?? []) as Plan[]);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [refreshToken]);

  const beginEdit = (plan: Plan) => {
    setEdit({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description ?? "",
      maxUsers: plan.max_users ? String(plan.max_users) : "",
      maxVehicles: plan.max_vehicles ? String(plan.max_vehicles) : "",
      modules: normalizeModules(plan.modules),
      active: plan.active,
    });
    setActionError(null);
    setMessage(null);
  };

  const toggleModule = (code: string) => {
    if (!edit) return;

    setEdit({
      ...edit,
      modules: edit.modules.includes(code)
        ? edit.modules.filter((item) => item !== code)
        : [...edit.modules, code],
    });
  };

  const save = async () => {
    if (!edit || saving) return;

    const maxUsers = edit.maxUsers ? Number(edit.maxUsers) : null;
    const maxVehicles = edit.maxVehicles ? Number(edit.maxVehicles) : null;

    if (
      !edit.code.trim() ||
      !edit.name.trim() ||
      edit.modules.length === 0 ||
      (maxUsers !== null && (!Number.isInteger(maxUsers) || maxUsers <= 0)) ||
      (maxVehicles !== null &&
        (!Number.isInteger(maxVehicles) || maxVehicles <= 0))
    ) {
      setActionError(
        "Informe código, nome, pelo menos um módulo e limites válidos.",
      );
      return;
    }

    setSaving(true);
    setActionError(null);
    setMessage(null);

    try {
      const payload = {
        code: edit.code.trim(),
        name: edit.name.trim(),
        description: edit.description.trim() || null,
        maxUsers,
        maxVehicles,
        modules: edit.modules,
        active: edit.active,
      };

      if (edit.id) {
        await updateLicensePlan({
          id: edit.id,
          ...payload,
        });
        setMessage("Plano actualizado.");
      } else {
        await createLicensePlan(payload);
        setMessage("Plano criado.");
      }

      setEdit(null);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao guardar plano de licença:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar o plano.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SuperAdminShell
      title="Planos de licença"
      subtitle="Modelos comerciais, limites e módulos atribuíveis aos municípios."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/super-admin/licencas"
          className="inline-flex items-center gap-2 text-sm text-slate-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Licenças
        </Link>

        <button
          type="button"
          onClick={() => {
            setEdit(blankForm());
            setActionError(null);
            setMessage(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Novo plano
        </button>
      </div>

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      {message && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}

      {loading ? (
        <SuperCard className="p-8 text-sm text-slate-500">
          A carregar planos...
        </SuperCard>
      ) : rows.length === 0 ? (
        <SuperCard className="p-8 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            Ainda não existem planos de licença.
          </p>
        </SuperCard>
      ) : (
        <div className="grid gap-5 xl:grid-cols-3">
          {rows.map((plan) => {
            const modules = normalizeModules(plan.modules);

            return (
              <SuperCard key={plan.id} className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <KeyRound />
                  </div>

                  <button
                    type="button"
                    onClick={() => beginEdit(plan)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                    aria-label={"Editar " + plan.name}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  <span
                    className={
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold " +
                      (plan.active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500")
                    }
                  >
                    {plan.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-sky-700">
                  {plan.code}
                </p>
                <p className="mt-3 min-h-12 text-sm leading-5 text-slate-500">
                  {plan.description || "Sem descrição."}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Limit
                    label="Utilizadores"
                    value={
                      plan.max_users
                        ? plan.max_users.toLocaleString("pt-MZ")
                        : "Sem limite"
                    }
                  />
                  <Limit
                    label="Veículos"
                    value={
                      plan.max_vehicles
                        ? plan.max_vehicles.toLocaleString("pt-MZ")
                        : "Sem limite"
                    }
                  />
                </div>

                <div className="mt-5 space-y-2">
                  {modules.length === 0 ? (
                    <p className="text-sm text-rose-600">
                      Sem módulos configurados.
                    </p>
                  ) : (
                    modules.slice(0, 8).map((module) => (
                      <p key={module} className="text-sm">
                        <Check className="mr-2 inline h-4 w-4 text-emerald-500" />
                        {moduleLabel(module)}
                      </p>
                    ))
                  )}
                  {modules.length > 8 && (
                    <p className="text-xs text-slate-400">
                      + {modules.length - 8} módulo(s)
                    </p>
                  )}
                </div>
              </SuperCard>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
        Os módulos configurados aqui são aplicados pelo servidor no mecanismo de
        autorização. Um perfil não consegue usar um módulo que o plano da
        licença não inclua.
      </div>

      {edit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setEdit(null)}
        >
          <SuperCard className="max-h-[92vh] w-full max-w-3xl overflow-y-auto p-6">
            <div onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {edit.id ? "Editar plano" : "Novo plano"}
                </h3>
                <button
                  type="button"
                  onClick={() => setEdit(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Código *"
                  value={edit.code}
                  onChange={(value) =>
                    setEdit({ ...edit, code: value.toUpperCase() })
                  }
                />
                <Field
                  label="Nome *"
                  value={edit.name}
                  onChange={(value) => setEdit({ ...edit, name: value })}
                />
                <Field
                  label="Máximo de utilizadores"
                  value={edit.maxUsers}
                  onChange={(value) =>
                    setEdit({
                      ...edit,
                      maxUsers: value.replace(/[^0-9]/g, ""),
                    })
                  }
                  placeholder="Vazio = sem limite"
                />
                <Field
                  label="Máximo de veículos"
                  value={edit.maxVehicles}
                  onChange={(value) =>
                    setEdit({
                      ...edit,
                      maxVehicles: value.replace(/[^0-9]/g, ""),
                    })
                  }
                  placeholder="Vazio = sem limite"
                />

                <label className="text-sm font-medium sm:col-span-2">
                  Descrição
                  <textarea
                    value={edit.description}
                    onChange={(event) =>
                      setEdit({ ...edit, description: event.target.value })
                    }
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="text-sm font-medium">
                  Estado
                  <select
                    value={edit.active ? "activo" : "inactivo"}
                    onChange={(event) =>
                      setEdit({
                        ...edit,
                        active: event.target.value === "activo",
                      })
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </label>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold">Módulos incluídos *</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {MODULE_OPTIONS.map(([code, label]) => (
                    <label
                      key={code}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={edit.modules.includes(code)}
                        onChange={() => toggleModule(code)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {actionError && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {actionError}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEdit(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={save}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "A guardar..." : "Guardar plano"}
                </button>
              </div>
            </div>
          </SuperCard>
        </div>
      )}
    </SuperAdminShell>
  );
}

function normalizeModules(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function moduleLabel(code: string) {
  return (
    MODULE_OPTIONS.find(([value]) => value === code)?.[1] ??
    (code === "all" ? "Todos os módulos" : code)
  );
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
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
      />
    </label>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
