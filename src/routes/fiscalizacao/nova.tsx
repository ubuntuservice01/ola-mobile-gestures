import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Camera, CheckCircle2, QrCode } from "lucide-react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";

export const Route = createFileRoute("/fiscalizacao/nova")({ component: NovaFiscalizacao });

function NovaFiscalizacao() {
  return <MobiGestShell title="Nova fiscalização" subtitle="Registar uma verificação de campo">
    <Link to="/fiscalizacao" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Voltar à fiscalização</Link>
    <div className="mx-auto max-w-4xl">
      <Card className="p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><QrCode/></div>
          <div><h2 className="text-xl font-bold">Verificar veículo</h2><p className="mt-1 text-sm text-slate-500">Pesquise pelo número MobiGest ou use o QR Code.</p></div>
        </div>
        <div className="mt-6 flex gap-2"><input placeholder="MZ-LIC-000000" className="h-12 flex-1 rounded-xl border border-slate-300 px-4 outline-none focus:border-sky-500"/><button className="rounded-xl border border-slate-300 px-4"><QrCode className="h-5 w-5"/></button><button className="rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white">Verificar</button></div>
        <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600"/><div><p className="font-semibold text-emerald-900">Veículo encontrado</p><p className="mt-1 text-sm text-emerald-800">MZ-LIC-004821 · Motorizada · Honda CB 125 · Estado: Activa</p><p className="mt-1 text-xs text-emerald-700">Os dados apresentados dependem das permissões do agente.</p></div></div>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Resultado da fiscalização<select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"><option>Regular</option><option>Com observação</option><option>Infração</option><option>Necessita de apreensão</option></select></label>
          <label className="text-sm font-medium">Local<input className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Local da verificação"/></label>
        </div>
        <label className="mt-4 block text-sm font-medium">Observações<textarea className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3" placeholder="Descreva o resultado da verificação."/></label>
        <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm"><input type="checkbox" className="h-4 w-4"/>Confirmo que realizei esta fiscalização e que os dados acima correspondem à verificação efectuada.</label>
        <div className="mt-6 flex flex-wrap justify-between gap-3"><Link to="/fiscalizacao" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold">Cancelar</Link><button className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"><Camera className="h-4 w-4"/>Registar fiscalização</button></div>
      </Card>
    </div>
  </MobiGestShell>;
}
