import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { DemoNotice, inputCls } from "../../components/financeiro/ui";
import { createCharge, useFees } from "../../lib/financeiro/store";
import { mt, vehicleLabel, type Charge } from "../../lib/financeiro/types";

export const Route = createFileRoute("/financeiro/nova")({
  head: () => ({ meta: [{ title: "Nova cobrança — MobiGest" }, { name: "description", content: "Gerar cobrança com base numa taxa municipal." }] }),
  component: Nova,
});

function Nova() {
  const fees = useFees().filter((f) => f.active);
  const nav = useNavigate();
  const [f, setF] = useState({ ownerName: "", vehicle: "", vehicleType: "motorizada" as Charge["vehicleType"], feeId: fees[0]?.id ?? "", note: "" });
  const avail = fees.filter((x) => x.vehicleType === "todos" || x.vehicleType === f.vehicleType);
  const fee = avail.find((x) => x.id === f.feeId);
  const ok = f.ownerName && f.vehicle && fee;
  return (
    <MobiGestShell title="Nova cobrança">
      <Link to="/financeiro" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Financeiro</Link>
      <Card className="mx-auto max-w-2xl p-7">
        <h2 className="text-xl font-bold">Gerar cobrança</h2>
        <p className="mt-1 mb-5 text-sm text-slate-500">O valor da taxa é copiado para a cobrança e não muda se a taxa for alterada depois.</p>
        <DemoNotice />
        <div className="grid gap-4">
          <label className="text-sm">Proprietário<input className={inputCls} value={f.ownerName} onChange={(e) => setF({ ...f, ownerName: e.target.value })} /></label>
          <label className="text-sm">Veículo (descrição / número MobiGest)<input className={inputCls} value={f.vehicle} onChange={(e) => setF({ ...f, vehicle: e.target.value })} /></label>
          <label className="text-sm">Tipo de veículo<select className={inputCls} value={f.vehicleType} onChange={(e) => setF({ ...f, vehicleType: e.target.value as Charge["vehicleType"] })}>{(["motorizada", "carro", "bicicleta"] as const).map((v) => <option key={v} value={v}>{vehicleLabel[v]}</option>)}</select></label>
          <label className="text-sm">Taxa aplicável<select className={inputCls} value={f.feeId} onChange={(e) => setF({ ...f, feeId: e.target.value })}>{avail.map((x) => <option key={x.id} value={x.id}>{x.code} — {x.name} ({mt(x.amount)})</option>)}</select></label>
          <label className="text-sm">Observação<textarea className={inputCls} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 text-sm"><span className="text-slate-500">Valor a aplicar</span><b>{fee ? mt(fee.amount) : "—"}</b></div>
          <button disabled={!ok} onClick={() => { const c = createCharge({ ...f, feeId: fee!.id }); nav({ to: "/financeiro/$id", params: { id: c.id } }); }} className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Criar cobrança</button>
        </div>
      </Card>
    </MobiGestShell>
  );
}
