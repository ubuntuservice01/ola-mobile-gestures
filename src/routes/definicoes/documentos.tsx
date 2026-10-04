import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  FileCheck2,
  Pencil,
  Plus,
  Save,
  Settings2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  MobiGestShell,
  PageHeader,
  Card,
} from "../../components/MobiGestShell";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/definicoes/documentos")({
  component: RequisitosDocumentais,
});

type Requirement = {
  id: string;
  vehicle_type: "motorizada" | "carro" | "bicicleta" | null;
  document_code: string;
  label: string;
  required: boolean;
  expiry_required: boolean;
  active: boolean;
};

type FormState = {
  id?: string;
  vehicleType: "todos" | "motorizada" | "carro" | "bicicleta";
  documentCode: string;
  label: string;
  required: boolean;
  expiryRequired: boolean;
  active: boolean;
};

function blankForm(): FormState {
  return {
    vehicleType: "todos",
    documentCode: "",
    label: "",
    required: true,
    expiryRequired: false,
    active: true,
  };
}

function RequisitosDocumentais() {
  const [rows, setRows] = useState<Requirement[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [edit, setEdit] = useState<FormState | null>(null);
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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [requirementsResult, profileResult] = await Promise.all([
        supabase
          .from("document_requirements")
          .select(
            "id, vehicle_type, document_code, label, required, expiry_required, active",
          )
          .order("active", { ascending: false })
          .order("label", { ascending: true }),
        user
          ? supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!active) return;

      const error =
        requirementsResult.error ?? profileResult.error;

      if (error) {
        console.error("Falha ao carregar requisitos documentais:", error);
        setLoadError(
          "Não foi possível carregar os requisitos documentais.",
        );
        setLoading(false);
        return;
      }

      setRows((requirementsResult.data ?? []) as Requirement[]);
      setRole(profileResult.data?.role ?? null);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [refreshToken]);

  const canManage =
    role === "super_admin" || role === "admin_municipal";

  const beginEdit = (row: Requirement) => {
    setEdit({
      id: row.id,
      vehicleType: row.vehicle_type ?? "todos",
      documentCode: row.document_code,
      label: row.label,
      required: row.required,
      expiryRequired: row.expiry_required,
      active: row.active,
    });
    setActionError(null);
    setMessage(null);
  };

  const save = async () => {
    if (!edit || saving) return;

    if (!edit.documentCode.trim() || !edit.label.trim()) {
      setActionError("Código e designação são obrigatórios.");
      return;
    }

    setSaving(true);
    setActionError(null);
    setMessage(null);

    const args = {
      p_vehicle_type:
        edit.vehicleType === "todos" ? null : edit.vehicleType,
      p_document_code: edit.documentCode.trim(),
      p_label: edit.label.trim(),
      p_required: edit.required,
      p_expiry_required: edit.expiryRequired,
      p_active: edit.active,
    };

    const result = edit.id
      ? await supabase.rpc("update_document_requirement", {
          p_id: edit.id,
          ...args,
        })
      : await supabase.rpc("create_document_requirement", args);

    if (result.error) {
      console.error("Falha ao guardar requisito documental:", result.error);
      setActionError(
        result.error.message ||
          "Não foi possível guardar o requisito.",
      );
      setSaving(false);
      return;
    }

    setMessage(
      edit.id
        ? "Requisito documental actualizado."
        : "Requisito documental criado.",
    );
    setEdit(null);
    setRefreshToken((value) => value + 1);
    setSaving(false);
  };

  return (
    <MobiGestShell
      title="Requisitos documentais"
      subtitle="Configuração municipal dos documentos exigidos nos processos."
    >
      <PageHeader
        title="Documentos obrigatórios por tipo"
        description="Os requisitos activos desta página são usados pelo servidor na aprovação dos registos."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <FileCheck2 className="h-5 w-5 text-sky-600" />
          <p className="mt-3 text-sm font-bold">Obrigatório</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Um requisito activo e obrigatório precisa de documento
            validado antes da aprovação do processo.
          </p>
        </Card>

        <Card className="p-5">
          <Settings2 className="h-5 w-5 text-amber-600" />
          <p className="mt-3 text-sm font-bold">Por tipo</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Pode aplicar-se a todos os veículos ou apenas a
            motorizadas, carros ou bicicletas.
          </p>
        </Card>

        <Card className="p-5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="mt-3 text-sm font-bold">Validação real</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            O backend cruza estes requisitos com documentos
            validados durante a decisão do registo.
          </p>
        </Card>
      </div>

      {canManage && (
        <div className="mb-4 flex justify-end">
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
            Novo requisito
          </button>
        </div>
      )}

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            A carregar requisitos...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Ainda não existem requisitos documentais configurados.
          </div>
        ) : (
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Documento</th>
                <th className="px-5 py-4">Código</th>
                <th className="px-5 py-4">Tipo</th>
                <th className="px-5 py-4">Obrigatório</th>
                <th className="px-5 py-4">Validade exigida</th>
                <th className="px-5 py-4">Estado</th>
                {canManage && <th className="px-5 py-4" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-100"
                >
                  <td className="px-5 py-4 font-semibold">
                    {row.label}
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {row.document_code}
                  </td>
                  <td className="px-5 py-4">
                    {vehicleTypeLabel(row.vehicle_type)}
                  </td>
                  <td className="px-5 py-4">
                    {row.required ? "Sim" : "Não"}
                  </td>
                  <td className="px-5 py-4">
                    {row.expiry_required ? "Sim" : "Não"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        "rounded-full px-2.5 py-1 text-xs font-semibold " +
                        (row.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500")
                      }
                    >
                      {row.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => beginEdit(row)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                        aria-label={"Editar " + row.label}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
        Esta configuração define regras operacionais do MobiGest, não
        requisitos legais nacionais. O município deve configurar apenas
        documentos que tenham fundamento administrativo aplicável.
      </div>

      {edit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setEdit(null)}
        >
          <Card className="w-full max-w-2xl p-6">
            <div onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {edit.id ? "Editar requisito" : "Novo requisito"}
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
                <label className="text-sm font-medium">
                  Código *
                  <input
                    value={edit.documentCode}
                    onChange={(event) =>
                      setEdit({
                        ...edit,
                        documentCode: event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, ""),
                      })
                    }
                    className={inputClass}
                    placeholder="ex.: identificacao_proprietario"
                  />
                </label>

                <label className="text-sm font-medium">
                  Tipo de veículo
                  <select
                    value={edit.vehicleType}
                    onChange={(event) =>
                      setEdit({
                        ...edit,
                        vehicleType:
                          event.target.value as FormState["vehicleType"],
                      })
                    }
                    className={inputClass}
                  >
                    <option value="todos">Todos</option>
                    <option value="motorizada">Motorizada</option>
                    <option value="carro">Carro</option>
                    <option value="bicicleta">Bicicleta</option>
                  </select>
                </label>

                <label className="text-sm font-medium sm:col-span-2">
                  Designação *
                  <input
                    value={edit.label}
                    onChange={(event) =>
                      setEdit({ ...edit, label: event.target.value })
                    }
                    className={inputClass}
                  />
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={edit.required}
                    onChange={(event) =>
                      setEdit({
                        ...edit,
                        required: event.target.checked,
                      })
                    }
                  />
                  Documento obrigatório
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={edit.expiryRequired}
                    onChange={(event) =>
                      setEdit({
                        ...edit,
                        expiryRequired: event.target.checked,
                      })
                    }
                  />
                  Exigir data de validade
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
                    className={inputClass}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </label>
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
                  onClick={() => void save()}
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

function vehicleTypeLabel(
  type: Requirement["vehicle_type"],
) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return "Todos";
}
