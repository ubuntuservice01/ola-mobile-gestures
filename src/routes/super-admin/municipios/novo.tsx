import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Save, ShieldCheck } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/municipios/novo")({
  component: NovoMunicipio,
});

function NovoMunicipio() {
  return (
    <SuperAdminShell title="Novo município" subtitle="Criar uma nova entidade municipal na plataforma.">
      <Link to="/super-admin/municipios" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600">
        <ArrowLeft className="h-4 w-4" /> Municípios
      </Link>

      <SuperCard className="mx-auto max-w-5xl p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Building2 />
          </div>
          <div>
            <h2 className="text-xl font-bold">Dados do município</h2>
            <p className="mt-1 text-sm text-slate-500">
              Estes dados serão usados para identificar e configurar o ambiente municipal.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <Field label="Nome oficial do município" placeholder="Ex.: Município de Lichinga" />
          <Field label="Código MobiGest" placeholder="Ex.: LIC" />
          <Field label="Província" placeholder="Ex.: Niassa" />
          <Field label="Distrito / área administrativa" placeholder="Opcional" />
          <Field label="Contacto institucional" placeholder="+258 ..." />
          <Field label="Email institucional" placeholder="municipio@..." />
          <Field label="Endereço" placeholder="Morada / localização" />
          <label className="text-sm font-medium">
            Estado inicial
            <select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500">
              <option>Activo</option>
              <option>Configuração</option>
              <option>Suspenso</option>
            </select>
          </label>
        </div>

        <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
          <ShieldCheck className="mr-2 inline h-4 w-4" />
          <b>Regra importante:</b> o código do município será único e será usado na numeração MobiGest. Depois de existirem registos, alterações ao código deverão passar por uma operação administrativa controlada.
        </div>

        <div className="mt-7 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Link to="/super-admin/municipios" className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold">
            Cancelar
          </Link>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">
            <Save className="h-4 w-4" />
            Criar município
          </button>
        </div>
      </SuperCard>
    </SuperAdminShell>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"
      />
    </label>
  );
}
