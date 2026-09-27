import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, KeyRound, Mail, MapPin, ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { SuperAdminShell, SuperCard } from "../../../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/municipios/$id/administrador/novo")({
  component: NovoAdministradorMunicipal,
});

function NovoAdministradorMunicipal() {
  const { id } = Route.useParams();
  const [step, setStep] = useState(1);
  const [created, setCreated] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [post, setPost] = useState("Todos / não definido");
  const [status, setStatus] = useState("Activo");

  const municipality = "Município de Lichinga";
  const code = "LIC";

  if (created) {
    return (
      <SuperAdminShell title="Administrador Municipal" subtitle="Configuração inicial concluída.">
        <SuperCard className="mx-auto max-w-2xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Administrador Municipal</p>
          <h2 className="mt-2 text-2xl font-bold">{name}</h2>
          <p className="mt-2 text-sm text-slate-500">{email}</p>
          <div className="mx-auto mt-6 max-w-sm rounded-xl bg-slate-50 p-4 text-left text-sm">
            <p><b>Município:</b> {municipality}</p>
            <p className="mt-1"><b>Código:</b> {code}</p>
            <p className="mt-1"><b>Posto:</b> {post}</p>
            <p className="mt-1"><b>Estado:</b> {status}</p>
          </div>
          <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-900">
            A conta ainda não foi criada no Supabase Auth. Esta confirmação representa a configuração do perfil e do âmbito; o convite/acesso real será feito na fase de integração.
          </div>
          <div className="mt-7 flex justify-center gap-3">
            <Link to="/super-admin/municipios/$id" params={{ id }} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold">Voltar ao município</Link>
            <Link to="/super-admin/utilizadores" className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">Ver utilizadores</Link>
          </div>
        </SuperCard>
      </SuperAdminShell>
    );
  }

  const canContinue = step === 1 ? Boolean(name.trim() && email.trim()) : true;

  return (
    <SuperAdminShell title="Novo Administrador Municipal" subtitle="Atribuir um administrador ao município sem sair da área global.">
      <div className="mb-6">
        <Link to="/super-admin/municipios/$id" params={{ id }} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600">
          <ArrowLeft className="h-4 w-4" /> Voltar ao município
        </Link>
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="mb-6 grid grid-cols-4 gap-2">
          {["Dados", "Acesso", "Âmbito", "Revisão"].map((label, index) => {
            const n = index + 1;
            return (
              <div key={label} className={`rounded-xl border px-3 py-3 text-center text-xs font-semibold ${step === n ? "border-sky-200 bg-sky-50 text-sky-700" : step > n ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-400"}`}>
                <span className="mr-1">{n}.</span>{label}
              </div>
            );
          })}
        </div>

        <SuperCard className="p-7">
          {step === 1 && (
            <section>
              <SectionTitle icon={<UserPlus />} title="Dados do administrador" text="Identificação da pessoa que ficará responsável pela administração municipal." />
              <div className="mt-7 grid gap-5 md:grid-cols-2">
                <Field label="Nome completo *" value={name} onChange={setName} placeholder="Nome completo" />
                <Field label="Contacto" value={phone} onChange={setPhone} placeholder="+258 ..." />
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <SectionTitle icon={<KeyRound />} title="Acesso" text="Defina o email que será associado à conta institucional." />
              <div className="mt-7 grid gap-5 md:grid-cols-2">
                <Field label="Email de acesso *" value={email} onChange={setEmail} placeholder="administrador@municipio.gov.mz" type="email" />
                <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
                  <Mail className="mb-2 h-4 w-4" />
                  O perfil será <b>Administrador Municipal</b>. A palavra-passe e o convite serão tratados pelo Supabase Auth.
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <SectionTitle icon={<MapPin />} title="Âmbito de acesso" text="O município é definido pelo processo e não pode ser alterado nesta etapa." />
              <div className="mt-7 grid gap-5 md:grid-cols-2">
                <ReadOnly label="Município" value={municipality} />
                <ReadOnly label="Código MobiGest" value={code} />
                <label className="text-sm font-medium">Posto administrativo
                  <select value={post} onChange={e => setPost(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500">
                    <option>Todos / não definido</option>
                    <option>Chiuaula</option>
                    <option>Massenger</option>
                    <option>Meponda</option>
                  </select>
                </label>
                <label className="text-sm font-medium">Estado
                  <select value={status} onChange={e => setStatus(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3">
                    <option>Activo</option>
                    <option>Suspenso</option>
                  </select>
                </label>
              </div>
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                <b>Regra de segurança:</b> o administrador terá acesso às operações permitidas pelo seu perfil dentro do município. Se houver posto definido, o âmbito territorial poderá ser restringido às áreas autorizadas.
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <SectionTitle icon={<ShieldCheck />} title="Revisão" text="Confirme os dados antes de preparar o administrador." />
              <div className="mt-7 divide-y divide-slate-100 rounded-xl border border-slate-200">
                <Review label="Nome" value={name || "—"} />
                <Review label="Email" value={email || "—"} />
                <Review label="Contacto" value={phone || "—"} />
                <Review label="Perfil" value="Administrador Municipal" />
                <Review label="Município" value={municipality} />
                <Review label="Posto administrativo" value={post} />
                <Review label="Estado" value={status} />
              </div>
              <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <b>Importante:</b> esta etapa prepara o vínculo. A criação da conta, convite, autenticação e políticas RLS serão executados quando o MobiGest estiver ligado ao Supabase.
              </div>
            </section>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
            {step > 1 ? (
              <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
            ) : <span />}
            {step < 4 ? (
              <button type="button" disabled={!canContinue} onClick={() => setStep(step + 1)} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                Continuar <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={() => setCreated(true)} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white">
                <CheckCircle2 className="h-4 w-4" /> Preparar administrador
              </button>
            )}
          </div>
        </SuperCard>
      </div>
    </SuperAdminShell>
  );
}

function SectionTitle({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex items-start gap-4 border-b border-slate-100 pb-6"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">{icon}</div><div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{text}</p></div></div>;
}
function Field({ label, value, onChange, placeholder, type="text" }: { label:string; value:string; onChange:(v:string)=>void; placeholder:string; type?:string }) {
  return <label className="text-sm font-medium">{label}<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500" /></label>;
}
function ReadOnly({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>}
function Review({label,value}:{label:string;value:string}){return <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm text-slate-500">{label}</span><span className="text-sm font-semibold text-slate-800">{value}</span></div>}
