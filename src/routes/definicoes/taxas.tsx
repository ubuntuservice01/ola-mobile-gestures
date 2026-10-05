import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../../components/MobiGestShell";
import { createFeeConfig, updateFeeConfig } from "../../lib/finance";
import { useSessionDraft } from "../../hooks/use-session-draft";
import { supabase } from "../../lib/supabase";
import {
  EmptyState,
  LoadingButton,
  NetworkErrorState,
  SkeletonTable,
  StatusBadge,
  notify,
  type LoadingButtonState,
} from "../../components/mobigest/Experience";
import { formatDate, formatMoneyMt } from "../../lib/format";

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
  const [saveState, setSaveState] = useState<LoadingButtonState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const feeDraft = useSessionDraft({
    key: "definicoes:taxas:formulario",
    value: { edit },
    restore: (draft) => {
      if (draft.edit) {
        setEdit(draft.edit);
        notify.info("Rascunho recuperado automaticamente.");
      }
    },
    isMeaningful: (draft) => Boolean(draft.edit),
  });

  const closeEdit = () => {
    feeDraft.clearDraft();
    setEdit(null);
  };

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
    setSaveState("loading");
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
        notify.success("Taxa actualizada", "A configuração municipal foi guardada.");
      } else {
        await createFeeConfig(payload);
        setMessage("Taxa municipal criada.");
        notify.success("Taxa criada", "A nova taxa municipal já está disponível.");
      }

      setSaveState("success");
      closeEdit();
      setRefreshToken((value) => value + 1);
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch (error) {
      console.error("Falha ao guardar taxa municipal:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível guardar a taxa municipal.";
      setErrorMessage(message);
      setSaveState("error");
      notify.error("Não foi possível guardar a taxa", message);
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
        <div className="mb-4">
          <NetworkErrorState
            message={errorMessage}
            onRetry={() => setRefreshToken((value) => value + 1)}
          />
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}

      <Card className="overflow-x-auto">
        <table className="mobigest-data-table w-full min-w-[950px] text-left text-sm">
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
                <td colSpan={8} className="p-4">
                  <SkeletonTable rows={5} columns={8} />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    title="Ainda não existem taxas municipais"
                    description="Crie a primeira taxa para começar a configurar cobranças e serviços do município."
                    action={
                      <button
                        type="button"
                        onClick={() => setEdit(blankForm())}
                        className="mobigest-button rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                      >
                        Nova taxa
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="mobigest-table-row border-t border-slate-100 hover:bg-slate-50">
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
                    {formatMoneyMt(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {formatDate(row.valid_from)}
                    {" → "}
                    {row.valid_to
                      ? formatDate(row.valid_to)
                      : "sem fim"}
                  </td>
                  <td className="px-4 py-3">
                    {row.exemption_allowed ? "Permitida" : "Não permitida"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.active ? "activa" : "inactiva"} />
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
          className="mobigest-drawer-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={closeEdit}
        >
          <Card className="mobigest-soft-pop max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
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
                  onClick={closeEdit}
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
                  onClick={closeEdit}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                >
                  Cancelar
                </button>
                <LoadingButton
                  state={saveState}
                  disabled={saving}
                  onClick={save}
                  idleLabel="Guardar"
                  loadingLabel="A guardar..."
                  successLabel="Guardado"
                  errorLabel="Tentar novamente"
                  className="bg-sky-600 text-white hover:bg-sky-700"
                />
              </div>
            </div>
          </Card>
        </div>
      )}
    </MobiGestShell>
  );
}

const inputClass =
  "mobigest-input mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10";

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
