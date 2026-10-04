import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Building2, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../../../components/SuperAdminShell";
import { supabase } from "../../../../lib/supabase";

export const Route = createFileRoute("/super-admin/municipios/$id/editar")({
  component: EditarMunicipio,
});

type MunicipalityForm = {
  name: string;
  code: string;
  province: string;
  area: string;
  phone: string;
  email: string;
  address: string;
  status: string;
};

const EMPTY_FORM: MunicipalityForm = {
  name: "",
  code: "",
  province: "",
  area: "",
  phone: "",
  email: "",
  address: "",
  status: "",
};

function EditarMunicipio() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<MunicipalityForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("municipalities")
        .select(
          "id, name, code, province, area, institutional_phone, institutional_email, address, status",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        console.error("Falha ao carregar município:", error);
        setLoadError("Não foi possível carregar os dados deste município.");
        setLoading(false);
        return;
      }

      setForm({
        name: data.name ?? "",
        code: data.code ?? "",
        province: data.province ?? "",
        area: data.area ?? "",
        phone: data.institutional_phone ?? "",
        email: data.institutional_email ?? "",
        address: data.address ?? "",
        status: data.status ?? "",
      });
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  const canSave =
    !loading &&
    !saving &&
    form.name.trim().length > 0 &&
    /^[A-Z0-9]{2,10}$/.test(form.code) &&
    form.province.trim().length > 0;

  const updateField = (field: keyof MunicipalityForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    if (!canSave) return;

    setSaving(true);
    setSaveError(null);

    const { error } = await supabase.rpc("super_admin_update_municipality", {
      p_municipality_id: id,
      p_name: form.name.trim(),
      p_code: form.code.trim(),
      p_province: form.province.trim(),
      p_area: form.area.trim() || null,
      p_institutional_phone: form.phone.trim() || null,
      p_institutional_email: form.email.trim() || null,
      p_address: form.address.trim() || null,
    });

    if (error) {
      console.error("Falha ao actualizar município:", error);
      setSaveError(
        error.message.includes("Já existe")
          ? error.message
          : "Não foi possível guardar as alterações. Verifique os dados e tente novamente.",
      );
      setSaving(false);
      return;
    }

    await navigate({
      to: "/super-admin/municipios/$id",
      params: { id },
      replace: true,
    });
  };

  return (
    <SuperAdminShell
      title="Editar município"
      subtitle="Actualizar os dados institucionais do município."
    >
      <Link
        to="/super-admin/municipios/$id"
        params={{ id }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao município
      </Link>

      <SuperCard className="mx-auto max-w-5xl p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Building2 />
          </div>
          <div>
            <h2 className="text-xl font-bold">Dados institucionais</h2>
            <p className="mt-1 text-sm text-slate-500">
              As alterações são executadas por uma operação exclusiva do Super Administrador e ficam auditadas.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="mt-7 text-sm text-slate-500">A carregar dados do município...</p>
        ) : loadError ? (
          <div className="mt-7 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {loadError}
          </div>
        ) : (
          <>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <Field
                label="Nome oficial"
                required
                value={form.name}
                onChange={(value) => updateField("name", value)}
              />
              <Field
                label="Código MobiGest"
                required
                value={form.code}
                onChange={(value) =>
                  updateField(
                    "code",
                    value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
                  )
                }
              />
              <Field
                label="Província"
                required
                value={form.province}
                onChange={(value) => updateField("province", value)}
              />
              <Field
                label="Distrito / área administrativa"
                value={form.area}
                onChange={(value) => updateField("area", value)}
              />
              <Field
                label="Contacto institucional"
                value={form.phone}
                onChange={(value) => updateField("phone", value)}
              />
              <Field
                label="Email institucional"
                value={form.email}
                onChange={(value) => updateField("email", value)}
                type="email"
              />
              <div className="md:col-span-2">
                <Field
                  label="Endereço"
                  value={form.address}
                  onChange={(value) => updateField("address", value)}
                />
              </div>

              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Estado actual
                </p>
                <p className="mt-1 text-sm font-semibold">{statusLabel(form.status)}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  O estado não é alterado nesta página. Suspender, reactivar ou inactivar exige motivo e auditoria própria.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <ShieldCheck className="mr-2 inline h-4 w-4" />
              <b>Atenção:</b> alterações ao código municipal podem afectar a numeração futura.
              O código deve permanecer estável depois do início da operação real.
            </div>

            {saveError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {saveError}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-6">
              <Link
                to="/super-admin/municipios/$id"
                params={{ id }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
              >
                Cancelar
              </Link>
              <button
                type="button"
                disabled={!canSave}
                onClick={save}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                {saving ? "A guardar..." : "Guardar alterações"}
              </button>
            </div>
          </>
        )}
      </SuperCard>
    </SuperAdminShell>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      {required && <span className="ml-1 text-sky-600">*</span>}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
      />
    </label>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    configuracao: "Configuração",
    activo: "Activo",
    suspenso: "Suspenso",
    inactivo: "Inactivo",
  };

  return labels[status] ?? status;
}
