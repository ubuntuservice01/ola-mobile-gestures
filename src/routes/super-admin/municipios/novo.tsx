import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, ShieldCheck, Users } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";
import { useState } from "react";

export const Route = createFileRoute("/super-admin/municipios/novo")({
  component: NovoMunicipio,
});

function NovoMunicipio() {
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [province, setProvince] = useState("");
  const [admin, setAdmin] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const steps = ["Município", "Administrador", "Configuração", "Revisão"];

  if (created) return (
    <SuperAdminShell title="Município criado" subtitle="O ambiente municipal foi preparado para configuração.">
      <SuperCard className="mx-auto max-w-2xl p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><ShieldCheck /></div>
        <h2 className="mt-5 text-2xl font-bold">{name}</h2>
        <p className="mt-2 text-sm text-slate-500">Código MobiGest: <b>{code}</b></p>
        <p className="mt-4 text-sm text-slate-500">Administrador: {admin} · {adminEmail}</p>
        <Link to="/super-admin/municipios" className="mt-7 inline-flex rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">Ver municípios</Link>
      </SuperCard>
    </SuperAdminShell>
  );

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

        <div className="mb-7 flex items-center gap-2 overflow-x-auto">
          {steps.map((label, i) => <div key={label} className="flex min-w-max items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i <= step ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-400"}`}>{i + 1}</span>
            <span className={`text-sm font-semibold ${i === step ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
          </div>)}
        </div>
        {step === 0 && <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-medium">Nome oficial *<input value={name} onChange={e=>setName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Ex.: Município de Lichinga"/></label>
          <label className="text-sm font-medium">Código MobiGest *<input value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6))} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Ex.: LIC"/></label>
          <label className="text-sm font-medium">Província *<input value={province} onChange={e=>setProvince(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Ex.: Niassa"/></label>
          <Field label="Contacto institucional" placeholder="+258 ..."/><Field label="Email institucional" placeholder="municipio@..."/><Field label="Endereço" placeholder="Morada / localização"/>
        </div>}
        {step === 1 && <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-medium">Nome completo do Administrador *<input value={admin} onChange={e=>setAdmin(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Nome do administrador"/></label>
          <label className="text-sm font-medium">Email de acesso *<input value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="administrador@municipio.gov.mz"/></label>
          <div className="md:col-span-2 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900"><Users className="mr-2 inline h-4 w-4"/><b>Perfil:</b> Administrador Municipal. A conta será criada no Supabase Auth na fase de integração.</div>
        </div>}
        {step === 2 && <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-5"><p className="font-semibold">Numeração MobiGest</p><p className="mt-1 text-sm text-slate-500">MOBI-{code || "COD"}-000001</p></div>
          <div className="rounded-xl border border-slate-200 p-5"><p className="font-semibold">Consulta pública</p><p className="mt-1 text-sm text-slate-500">QR Code e número MobiGest preparados para consulta pública.</p></div>
          <div className="rounded-xl border border-slate-200 p-5"><p className="font-semibold">Isolamento de dados</p><p className="mt-1 text-sm text-slate-500">O município terá dados isolados por regras RLS no Supabase.</p></div>
        </div>}
        {step === 3 && <div className="grid gap-3 md:grid-cols-2">
          <Info label="Município" value={name || "—"}/><Info label="Código" value={code || "—"}/><Info label="Província" value={province || "—"}/><Info label="Administrador" value={admin || "—"}/><Info label="Email" value={adminEmail || "—"}/>
          <div className="md:col-span-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><ShieldCheck className="mr-2 inline h-4 w-4"/>Criar o município não concede acesso automaticamente. O acesso será criado no Auth e associado ao município.</div>
        </div>}
        <div className="mt-7 flex justify-between border-t border-slate-100 pt-6">
          {step > 0 ? <button type="button" onClick={()=>setStep(step-1)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold">Anterior</button> : <span/>}
          {step < 3 ? <button type="button" disabled={(step===0 && (!name||!code||!province)) || (step===1 && (!admin||!adminEmail))} onClick={()=>setStep(step+1)} className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Continuar</button> : <button type="button" onClick={()=>setCreated(true)} className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">Criar município</button>}
        </div>
      </SuperCard>
    </SuperAdminShell>
  );
}
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
