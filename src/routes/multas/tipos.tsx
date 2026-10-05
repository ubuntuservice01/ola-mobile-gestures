import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Plus, Save, Settings2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../../components/MobiGestShell";
import { createFineType, updateFineType } from "../../lib/enforcement";
import { useSessionDraft } from "../../hooks/use-session-draft";
import { supabase } from "../../lib/supabase";
import { notify } from "../../components/mobigest/Experience";

export const Route = createFileRoute("/multas/tipos")({
  component: Tipos,
});

type FineType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  amount: number;
  active: boolean;
};

function Tipos() {
  const [rows, setRows] = useState<FineType[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [active, setActive] = useState(true);
  const [editing, setEditing] = useState<FineType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const fineTypeDraft = useSessionDraft({
    key: "multas:tipos:formulario",
    value: { editing, code, name, description, amount, active },
    restore: (draft) => {
      setEditing(draft.editing ?? null);
      setCode(draft.code ?? "");
      setName(draft.name ?? "");
      setDescription(draft.description ?? "");
      setAmount(draft.amount ?? "");
      setActive(draft.active ?? true);
      notify.info("Rascunho recuperado automaticamente.");
    },
    isMeaningful: (draft) =>
      Boolean(
        draft.editing ||
          draft.code?.trim() ||
          draft.name?.trim() ||
          draft.description?.trim() ||
          draft.amount,
      ),
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("fine_types")
        .select("id, code, name, description, amount, active")
        .order("active", { ascending: false })
        .order("name", { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error("Falha ao carregar tipos de multa:", error);
        setErrorMessage("Não foi possível carregar os tipos de multa.");
        setLoading(false);
        return;
      }

      setRows((data ?? []) as FineType[]);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [refreshToken]);

  const resetForm = () => {
    fineTypeDraft.clearDraft();
    setEditing(null);
    setCode("");
    setName("");
    setDescription("");
    setAmount("");
    setActive(true);
  };

  const beginEdit = (row: FineType) => {
    setEditing(row);
    setCode(row.code);
    setName(row.name);
    setDescription(row.description ?? "");
    setAmount(String(row.amount));
    setActive(row.active);
    setErrorMessage(null);
    setMessage(null);
  };

  const save = async () => {
    const parsedAmount = Number(amount.replace(",", "."));

    if (
      !code.trim() ||
      !name.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount < 0 ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      if (editing) {
        await updateFineType({
          id: editing.id,
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || null,
          amount: parsedAmount,
          active,
        });
        setMessage("Tipo de multa actualizado.");
      } else {
        await createFineType({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || null,
          amount: parsedAmount,
          active,
        });
        setMessage("Tipo de multa criado.");
      }

      resetForm();
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao guardar tipo de multa:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar o tipo de multa.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobiGestShell
      title="Tipos de multa"
      subtitle="Configuração municipal das infracções e respectivos valores."
    >
      <Link
        to="/multas"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Multas
      </Link>

      <PageHeader
        title="Tipos de multa"
        description="Cada município define as suas infracções, valores e estado."
      />

      <Card className="mb-5 p-6">
        <h3 className="flex items-center gap-2 font-semibold">
          {editing ? (
            <Pencil className="h-4 w-4 text-sky-600" />
          ) : (
            <Plus className="h-4 w-4 text-sky-600" />
          )}
          {editing ? "Editar tipo de multa" : "Cadastrar tipo de multa"}
        </h3>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[160px_1.2fr_1fr_180px_150px]">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Código"
            className="h-11 rounded-xl border border-slate-300 px-3"
          />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Designação da infracção"
            className="h-11 rounded-xl border border-slate-300 px-3"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrição opcional"
            className="h-11 rounded-xl border border-slate-300 px-3"
          />
          <input
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value.replace(/[^0-9.,]/g, ""))
            }
            placeholder="Valor (MT)"
            inputMode="decimal"
            className="h-11 rounded-xl border border-slate-300 px-3"
          />
          <select
            value={active ? "activo" : "inactivo"}
            onChange={(event) => setActive(event.target.value === "activo")}
            className="h-11 rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              <X className="h-4 w-4" />
              Cancelar edição
            </button>
          )}

          <button
            type="button"
            disabled={
              !code.trim() ||
              !name.trim() ||
              !amount.trim() ||
              saving
            }
            onClick={save}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            {saving
              ? "A guardar..."
              : editing
                ? "Guardar alterações"
                : "Guardar tipo de multa"}
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">
            A carregar tipos de multa...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">
            Ainda não existem tipos de multa configurados.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div>
                  <p className="font-semibold">
                    {row.code} · {row.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.description || "Sem descrição"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <b>{formatMoney(row.amount)}</b>
                  <span
                    className={
                      "rounded-full px-2.5 py-1 text-xs font-semibold " +
                      (row.active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600")
                    }
                  >
                    {row.active ? "Activo" : "Inactivo"}
                  </span>

                  <button
                    type="button"
                    onClick={() => beginEdit(row)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    aria-label={"Editar " + row.name}
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </MobiGestShell>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-MZ", {
    style: "currency",
    currency: "MZN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
