import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/super-admin/municipios/novo")({
  component: NovoMunicipio,
});

type CreatedMunicipality = {
  id: string;
  name: string;
  code: string;
};

function NovoMunicipio() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [province, setProvince] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedMunicipality | null>(null);

  const canSubmit =
    name.trim().length > 0 &&
    /^[A-Z0-9]{2,10}$/.test(code) &&
    province.trim().length > 0 &&
    !saving;

  const createMunicipality = async () => {
    if (!canSubmit) return;

    setSaving(true);
    setErrorMessage(null);

    const { data, error } = await supabase.rpc("super_admin_create_municipality", {
      p_name: name.trim(),
      p_code: code.trim(),
      p_province: province.trim(),
      p_area: area.trim() || null,
      p_institutional_phone: phone.trim() || null,
      p_institutional_email: email.trim() || null,
      p_address: address.trim() || null,
    });

    if (error) {
      console.error("Falha ao criar município:", error);
      setErrorMessage(
        error.message.includes("Já existe")
          ? error.message
          : "Não foi possível criar o município. Verifique os dados e tente novamente.",
      );
      setSaving(false);
      return;
    }

    const id = typeof data === "string" ? data : null;
    if (!id) {
      setErrorMessage("O município foi processado, mas o sistema não recebeu o identificador esperado.");
      setSaving(false);
      return;
    }

    setCreated({ id, name: name.trim(), code: code.trim() });
    setSaving(false);
  };

  if (created) {
    return (
      <SuperAdminShell
        title="Município criado"
        subtitle="A entidade municipal foi criada e registada na auditoria."
      >
        <SuperCard className="mx-auto max-w-2xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold">{created.name}</h2>
          <p className="mt-2 text-sm text-slate-500">
            Código MobiGest: <b>{created.code}</b>
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            O município inicia no estado <b>Configuração</b>. O Administrador Municipal deve ser criado
            numa etapa separada e associado a este município.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/super-admin/municipios/$id"
              params={{ id: created.id }}
              className="inline-flex rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Abrir município
            </Link>
            <Link
              to="/super-admin/municipios/$id/administrador/novo"
              params={{ id: created.id }}
              className="inline-flex rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Criar Administrador Municipal
            </Link>
          </div>
        </SuperCard>
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell title="Novo município" subtitle="Criar uma nova entidade municipal na plataforma.">
      <Link
        to="/super-admin/municipios"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Municípios
      </Link>

      <SuperCard className="mx-auto max-w-5xl p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Building2 />
          </div>
          <div>
            <h2 className="text-xl font-bold">Dados institucionais</h2>
            <p className="mt-1 text-sm text-slate-500">
              Esta operação cria o município na base institucional e gera um registo de auditoria.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <Field
            label="Nome oficial"
            required
            value={name}
            onChange={setName}
            placeholder="Ex.: Município de Lichinga"
          />
          <Field
            label="Código MobiGest"
            required
            value={code}
            onChange={(value) =>
              setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))
            }
            placeholder="Ex.: LIC"
            hint="2 a 10 caracteres, apenas letras maiúsculas e números."
          />
          <Field
            label="Província"
            required
            value={province}
            onChange={setProvince}
            placeholder="Ex.: Niassa"
          />
          <Field
            label="Distrito / área administrativa"
            value={area}
            onChange={setArea}
            placeholder="Ex.: Lichinga"
          />
          <Field
            label="Contacto institucional"
            value={phone}
            onChange={setPhone}
            placeholder="+258 ..."
          />
          <Field
            label="Email institucional"
            value={email}
            onChange={setEmail}
            placeholder="municipio@..."
            type="email"
          />
          <div className="md:col-span-2">
            <Field
              label="Endereço"
              value={address}
              onChange={setAddress}
              placeholder="Morada / localização institucional"
            />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
          <ShieldCheck className="mr-2 inline h-4 w-4" />
          <b>Segurança:</b> a criação é executada por uma função exclusiva do Super Administrador.
          O estado inicial será <b>Configuração</b> e a operação ficará registada em auditoria.
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-6">
          <Link
            to="/super-admin/municipios"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
          >
            Cancelar
          </Link>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={createMunicipality}
            className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "A criar..." : "Criar município"}
          </button>
        </div>
      </SuperCard>
    </SuperAdminShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  hint?: string;
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
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
      />
      {hint && <span className="mt-1 block text-xs font-normal text-slate-400">{hint}</span>}
    </label>
  );
}
