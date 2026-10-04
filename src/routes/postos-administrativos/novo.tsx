import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Save } from "lucide-react";
import { useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { createAdministrativePost } from "../../lib/territory";
import {
  LoadingButton,
  notify,
} from "../../components/mobigest/Experience";

export const Route = createFileRoute("/postos-administrativos/novo")({
  component: NovoPosto,
});

function NovoPosto() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const save = async () => {
    if (name.trim().length < 2 || saving) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      const id = await createAdministrativePost({
        name: name.trim(),
        code: code.trim() || null,
      });
      setCreatedId(id);
      notify.success("Posto administrativo criado");
    } catch (error) {
      console.error("Falha ao criar posto administrativo:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível criar o posto administrativo.";
      setErrorMessage(message);
      notify.error("Não foi possível criar o posto", message);
    } finally {
      setSaving(false);
    }
  };

  if (createdId) {
    return (
      <MobiGestShell
        title="Posto administrativo criado"
        subtitle="A estrutura territorial foi actualizada e auditada."
      >
        <Card className="mx-auto max-w-2xl p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-bold">{name}</h2>
          <p className="mt-2 text-sm text-slate-500">
            Código: {code || "Não definido"}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/postos-administrativos"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
            >
              Voltar aos postos
            </Link>
            <Link
              to="/postos-administrativos/$id"
              params={{ id: createdId }}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Abrir posto
            </Link>
          </div>
        </Card>
      </MobiGestShell>
    );
  }

  return (
    <MobiGestShell
      title="Novo posto administrativo"
      subtitle="Adicionar uma unidade à estrutura territorial do município."
    >
      <Link
        to="/postos-administrativos"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Postos administrativos
      </Link>

      <Card className="mx-auto max-w-2xl p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Building2 />
          </div>
          <div>
            <h2 className="text-xl font-bold">Dados do posto</h2>
            <p className="mt-1 text-sm text-slate-500">
              O município é determinado automaticamente pelo contexto autenticado.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <Field
            label="Nome *"
            value={name}
            onChange={setName}
            placeholder="Ex.: Malanga"
          />
          <Field
            label="Código"
            value={code}
            onChange={(value) =>
              setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))
            }
            placeholder="Ex.: MAL"
          />
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-6">
          <Link
            to="/postos-administrativos"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
          >
            Cancelar
          </Link>
          <LoadingButton
            onClick={save}
            disabled={name.trim().length < 2}
            state={saving ? "loading" : "idle"}
            idleLabel="Criar posto"
            loadingLabel="A guardar..."
            icon={<Save className="h-4 w-4" />}
            className="bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40"
          />
        </div>
      </Card>
    </MobiGestShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"
      />
    </label>
  );
}
