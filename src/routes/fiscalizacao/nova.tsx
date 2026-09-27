import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Camera, CheckCircle2, QrCode, MapPin } from "lucide-react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";

export const Route = createFileRoute("/fiscalizacao/nova")({ component: NovaFiscalizacao });

function NovaFiscalizacao() {
  return <MobiGestShell title="Nova fiscalização" subtitle="Registar uma verificação de campo">
    <Link to="/fiscalizacao" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Voltar à fiscalização</Link>
    <div className="mx-auto max-w-4xl">
      <Card className="p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><QrCode/></div>
          <div><h2 className="text-xl font-bold">Identificar veículo</h2><p className="mt-1 text-sm text-slate-500">Pesquise pelo número MobiGest ou use o QR Code.</p></div>
        </div>

        <div className="mt-6 flex gap-2">
          <input placeholder="MOBI-LIC-000000" className="h-12 flex-1 rounded-xl border border-slate-300 px-4 outline-none focus:border-sky-500"/>
          <button className="rounded-xl border border-slate-300 px-4" title="Ler QR Code"><QrCode className="h-5 w-5"/></button>
          <button className="rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white">Verificar</button>
        </div>

        <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600"/><div><p className="font-semibold text-emerald-900">Veículo encontrado</p><p className="mt-1 text-sm text-emerald-800">MOBI-LIC-004821 · Motorizada · Honda CB 125 · Estado: Activa</p><p className="mt-1 text-xs text-emerald-700">Os dados apresentados dependem das permissões do agente.</p></div></div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <Field label="Resultado da fiscalização"><select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"><option>Regular</option><option>Irregularidade documental</option><option>Registo suspenso</option><option>Veículo reportado como roubado</option><option>Veículo apreendido</option><option>Dados divergentes</option><option>QR Code inválido</option><option>Registo inexistente</option><option>Outro</option></select></Field>
          <Field label="Local da fiscalização"><input className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Local da verificação"/></Field>
          <Field label="Município"><select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"><option>Município seleccionado pelo utilizador</option></select></Field>
          <Field label="Posto administrativo"><select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"><option>Seleccionar posto</option></select></Field>
          <Field label="Localidade/Bairro"><select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"><option>Seleccionar localidade/bairro</option></select></Field>
          <Field label="Fiscal responsável"><input disabled value="Utilizador autenticado" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-500"/></Field>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><MapPin className="h-4 w-4"/>A localização administrativa será associada à fiscalização e validada pelo município.</div>

        <label className="mt-5 block text-sm font-medium">Observações<textarea className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3" placeholder="Descreva o resultado da verificação."/></label>

        <div className="mt-5 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold">Evidência</p>
          <p className="mt-1 text-xs text-slate-500">Opcional. Pode anexar fotografia ou documento relacionado com a ocorrência.</p>
          <button type="button" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"><Camera className="h-4 w-4"/>Adicionar evidência</button>
        </div>

        <label className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm"><input type="checkbox" className="h-4 w-4"/>Confirmo que realizei esta fiscalização e que os dados correspondem à verificação efectuada.</label>
        <div className="mt-6 flex flex-wrap justify-between gap-3"><Link to="/fiscalizacao" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold">Cancelar</Link><button className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">Registar fiscalização</button></div>
      </Card>
    </div>
  </MobiGestShell>;
}

function Field({label, children}:{label:string;children:React.ReactNode}) {
  return <label className="text-sm font-medium">{label}{children}</label>;
}
