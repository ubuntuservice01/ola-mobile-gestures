import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Plus, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../../components/MobiGestShell";
import { createFeeConfig, updateFeeConfig } from "../../lib/finance";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/definicoes/taxas")({
  head: () => ({
    meta: [
      { title: "Taxas municipais — MobiGest" },
      {
        name: "description",
        content: "Configure os serviços, valores e condições de cobrança do município.",
      },
    ],
  }),
  component: Taxas,
});

type FeeRow = {
  id: string;
  code: string;
  name: string;
  vehicle_type: "motorizada" | "carro" | "bicicleta" | null;
  amount: number;
  valid_from: string;
  valid_to: string | null;
  active: boolean;
  conditions: string | null;
  exemption_allowed: boolean;
};

type FeeForm = {
  id?: string;
  code: string;
  name: string;
  vehicleType: "todos" | "motorizada" | "carro" | "bicicleta";
  amount: string;
  validFrom: string;
  validTo: string;
  active: boolean;
  conditions: string;
  exemptionAllowed: boolean;
};

function blankForm(): FeeForm {
  return {
    code: "",
    name: "",
    vehicleType: "todos",
    amount: "",
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: "",
    active: true,
    conditions: "",
    exemptionAllowed: false,
  };
}

function Taxas() {
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [edit, setEdit] = useState<FeeForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("fee_configs")
        .select(
          "id, code, name, vehicle_type, amount, valid_from, valid_to, active, conditions, exemption_allowed",
        )
        .order("active", { ascending: false })
        .order("valid_from", { ascending: false })
        .order("code", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar taxas municipais:", error);
        setErrorMessage("Não foi possível carregar as taxas municipais.");
        setLoading(false);
        return;
      }

      setRows((data ?? []) as FeeRow[]);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [refreshToken]);

  const beginEdit = (row: FeeRow) => {
    setEdit({
      id: row.id,
      code: row.code,
      name: row.name,
      vehicleType: row.vehicle_type ?? "todos",
      amount: String(row.amount),
      validFrom: row.valid_from,
      validTo: row.valid_to ?? "",
      active: row.active,
      conditions: row.conditions ?? "",
      exemptionAllowed: row.exemption_allowed,
    });
    setErrorMessage(null);
    setMessage(null);
  };

  const save = async () => {
    if (!edit || saving) return;

    const amount = Number(edit.amount.replace(",", "."));

    if (
      !edit.code.trim() ||
      !edit.name.trim() ||
      !edit.validFrom ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setErrorMessage("Preencha código, nome, valor e início de validade.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const payload = {
        code: edit.code.trim(),
        name: edit.name.trim(),
        vehicleType:
          edit.vehicleType === "todos" ? null : edit.vehicleType,
        amount,
        validFrom: edit.validFrom,
        validTo: edit.validTo || null,
        active: edit.active,
        conditions: edit.conditions.trim() || null,
        exemptionAllowed: edit.exemptionAllowed,
      } as const;

      if (edit.id) {
        await updateFeeConfig({
          id: edit.id,
          ...payload,
        });
        setMessage("Taxa municipal actualizada.");
      } else {
        await createFeeConfig(payload);
        setMessage("Taxa municipal criada.");
      }

      setEdit(null);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao guardar taxa municipal:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar a taxa municipal.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobiGestShell title="Taxas municipais">
      <Link
        to="/definicoes"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Definições
      </Link>

      <PageHeader
        title="Taxas municipais"
        description="Valores, vigência e regras de isenção definidos pelo município."
      />

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setEdit(blankForm());
            setErrorMessage(null);
            setMessage(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Nova taxa
        </button>
      </div>

      {errorMessage && !edit && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              {[
                "Código",
                "Nome",
                "Veículo",
                "Valor",
                "Validade",
                "Isenção",
                "Estado",
                "",
              ].map((heading) => (
                <th key={heading} className="px-4 py-3 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  A carregar taxas...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  Ainda não existem taxas municipais configuradas.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold">{row.code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.name}</p>
                    <p className="mt-1 max-w-md text-xs text-slate-400">
                      {row.conditions || "Sem condições adicionais"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {vehicleTypeLabel(row.vehicle_type)}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatMoney(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(row.valid_from).toLocaleDateString("pt-MZ")}
                    {" → "}
                    {row.valid_to
                      ? new Date(row.valid_to).toLocaleDateString("pt-MZ")
                      : "sem fim"}
                  </td>
                  <td className="px-4 py-3">
                    {row.exemption_allowed ? "Permitida" : "Não permitida"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs font-semibold " +
                        (row.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500")
                      }
                    >
                      {row.active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => beginEdit(row)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                      aria-label={"Editar " + row.name}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {edit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setEdit(null)}
        >
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
            <div
              onClick={(event) => event.stopPropagation()}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="flex items-center justify-between sm:col-span-2">
                <h3 className="font-semibold">
                  {edit.id ? "Editar taxa" : "Nova taxa"}
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

              <label className="text-sm">
                Tipo de veículo
                <select
                  className={inputClass}
                  value={edit.vehicleType}
                  onChange={(event) =>
                    setEdit({
                      ...edit,
                      vehicleType: event.target.value as FeeForm["vehicleType"],
                    })
                  }
                >
                  <option value="todos">Todos</option>
                  <option value="motorizada">Motorizada</option>
                  <option value="carro">Carro</option>
                  <option value="bicicleta">Bicicleta</option>
                </select>
              </label>

              <Field
                label="Valor (MT) *"
                value={edit.amount}
                onChange={(value) =>
                  setEdit({
                    ...edit,
                    amount: value.replace(/[^0-9.,]/g, ""),
                  })
                }
              />

              <label className="text-sm">
                Início de validade *
                <input
                  type="date"
                  className={inputClass}
                  value={edit.validFrom}
                  onChange={(event) =>
                    setEdit({ ...edit, validFrom: event.target.value })
                  }
                />
              </label>

              <label className="text-sm">
                Fim de validade
                <input
                  type="date"
                  className={inputClass}
                  value={edit.validTo}
                  onChange={(event) =>
                    setEdit({ ...edit, validTo: event.target.value })
                  }
                />
              </label>

              <label className="text-sm">
                Estado
                <select
                  className={inputClass}
                  value={edit.active ? "1" : "0"}
                  onChange={(event) =>
                    setEdit({ ...edit, active: event.target.value === "1" })
                  }
                >
                  <option value="1">Activa</option>
                  <option value="0">Inactiva</option>
                </select>
              </label>

              <label className="flex items-center gap-2 pt-7 text-sm">
                <input
                  type="checkbox"
                  checked={edit.exemptionAllowed}
                  onChange={(event) =>
                    setEdit({
                      ...edit,
                      exemptionAllowed: event.target.checked,
                    })
                  }
                />
                Permite isenção
              </label>

              <label className="text-sm sm:col-span-2">
                Condições
                <textarea
                  className={inputClass}
                  rows={3}
                  value={edit.conditions}
                  onChange={(event) =>
                    setEdit({ ...edit, conditions: event.target.value })
                  }
                />
              </label>

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 sm:col-span-2">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-2 sm:col-span-2">
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
                  {saving ? "A guardar..." : "Guardar"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </MobiGestShell>
  );
}

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3";

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      {label}
      <input
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function vehicleTypeLabel(type: FeeRow["vehicle_type"]) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return "Todos";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-MZ", {
    style: "currency",
    currency: "MZN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
