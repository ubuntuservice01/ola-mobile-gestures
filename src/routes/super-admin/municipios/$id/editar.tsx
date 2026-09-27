import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Save, ShieldCheck } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/municipios/$id/editar")({ component: EditarMunicipio });

function EditarMunicipio() {
  const { id } = Route.useParams();
  return <SuperAdminShell title="Editar município" subtitle="Actualizar os dados institucionais do município.">
    <Link to="/super-admin/municipios/$id" params={{id}} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/> Voltar ao município</Link>
    <SuperCard className="mx-auto max-w-5xl p-7">
      <div className="flex items-start gap-4 border-b border-slate-100 pb-6"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Building2/></div><div><h2 className="text-xl font-bold">Dados institucionais</h2><p className="mt-1 text-sm text-slate-500">Alterações críticas, como o código, devem ser controladas e auditadas.</p></div></div>
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <Field label="Nome oficial" value="Município de Lichinga"/><Field label="Código MobiGest" value="LIC"/><Field label="Província" value="Niassa"/><Field label="Distrito / área administrativa" value="Lichinga"/><Field label="Contacto institucional" value="+258 00 000 000"/><Field label="Email institucional" value="municipio@mobigest.co.mz"/><Field label="Endereço" value="Lichinga, Niassa"/>
        <label className="text-sm font-medium">Estado<select defaultValue="Activo" className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"><option>Activo</option><option>Configuração</option><option>Suspenso</option></select></label>
      </div>
      <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><ShieldCheck className="mr-2 inline h-4 w-4"/><b>Atenção:</b> alterações ao código municipal podem afectar a numeração futura. Quando houver registos, a alteração deverá exigir confirmação e auditoria.</div>
      <div className="mt-7 flex justify-end gap-3"><Link to="/super-admin/municipios/$id" params={{id}} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold">Cancelar</Link><button type="button" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700"><Save className="h-4 w-4"/> Guardar alterações</button></div>
    </SuperCard>
  </SuperAdminShell>;
}
function Field({label,value}:{label:string;value:string}){return <label className="text-sm font-medium">{label}<input defaultValue={value} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"/></label>}
