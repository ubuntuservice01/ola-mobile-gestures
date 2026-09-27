import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ReceiptText, Printer } from "lucide-react";
import { useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { DemoNotice, StatusBadge, fmtDate, inputCls } from "../../components/financeiro/ui";
import { applyExemption, changeStatus, municipalityName, useCharges, useFees } from "../../lib/financeiro/store";
import { methodLabel, mt, serviceLabel, statusLabel, vehicleLabel, type ChargeStatus, type PaymentMethod } from "../../lib/financeiro/types";

export const Route = createFileRoute("/financeiro/$id")({
  head: () => ({ meta: [{ title: "Detalhe da cobrança — MobiGest" }, { name: "description", content: "Pagamento, isenção e histórico da cobrança." }] }),
  component: Detalhe,
});

function Detalhe() {
  const { id } = Route.useParams();
  const c = useCharges().find((x) => x.id === id);
  const fee = useFees().find((f) => f.id === c?.feeId);
  const [to, setTo] = useState<ChargeStatus>("pago");
  const [method, setMethod] = useState<PaymentMethod>("numerario");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  if (!c) return <MobiGestShell title="Cobrança"><Card className="p-10 text-center text-sm text-slate-500">Cobrança não encontrada neste município. <Link to="/financeiro" className="text-sky-600">Voltar</Link></Card></MobiGestShell>;
  const open = c.status === "pendente" || c.status === "em_confirmacao";
  const targets: ChargeStatus[] = open ? ["em_confirmacao", "pago", "cancelado"].filter((s) => s !== c.status) as ChargeStatus[] : c.status === "pago" ? ["reembolsado"] : [];
  return (
    <MobiGestShell title="Detalhe da cobrança">
      <Link to="/financeiro" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Financeiro</Link>
      <DemoNotice />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-7">
          <div className="flex items-center gap-4"><ReceiptText className="h-7 w-7 text-sky-600" /><div className="flex-1"><h2 className="text-xl font-bold">{c.reference}</h2><p className="text-sm text-slate-500">{municipalityName(c.municipalityId)}</p></div><StatusBadge s={c.status} /></div>
          <div className="mt-7 space-y-3">
            <Info l="Proprietário" v={c.ownerName} /><Info l="Veículo" v={`${c.vehicle} (${vehicleLabel[c.vehicleType]})`} />
            <Info l="Serviço" v={serviceLabel[c.service]} /><Info l="Taxa aplicada" v={c.feeCode} />
            <Info l="Valor aplicado" v={mt(c.appliedAmount)} />
            {fee && fee.amount !== c.appliedAmount && <p className="text-xs text-amber-700">A taxa actual é {mt(fee.amount)}; esta cobrança mantém o valor original.</p>}
            <Info l="Data da cobrança" v={fmtDate(c.createdAt)} /><Info l="Criada por" v={c.createdBy} />
            {c.note && <Info l="Observação" v={c.note} />}
            {c.payment && <><Info l="Método" v={methodLabel[c.payment.method]} /><Info l="Ref. pagamento" v={c.payment.reference || "—"} /><Info l="Pago em" v={fmtDate(c.payment.paidAt)} /><Info l="Responsável" v={c.payment.userName} /></>}
            {c.exemption && <><Info l="Isenção" v={c.exemption.reason} /><Info l="Isento por" v={`${c.exemption.userName} · ${fmtDate(c.exemption.date)}`} /></>}
          </div>
          {c.status === "pago" && <Link to="/financeiro/recibo/$id" params={{ id: c.id }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"><Printer className="h-4 w-4" />Ver / imprimir recibo</Link>}
        </Card>
        <div className="space-y-6">
          {targets.length > 0 && <Card className="space-y-3 p-6">
            <h3 className="font-semibold">Registar pagamento / alterar estado</h3>
            <select className={inputCls} value={targets.includes(to) ? to : targets[0]} onChange={(e) => setTo(e.target.value as ChargeStatus)}>{targets.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}</select>
            {(targets.includes(to) ? to : targets[0]) === "pago" && <><select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>{Object.entries(methodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><input className={inputCls} placeholder="Referência do pagamento" value={ref} onChange={(e) => setRef(e.target.value)} /></>}
            <textarea className={inputCls} placeholder="Observação" value={note} onChange={(e) => setNote(e.target.value)} />
            <p className="text-xs text-slate-500">Responsável: Administrador</p>
            <button onClick={() => { changeStatus(c.id, targets.includes(to) ? to : targets[0], { method, reference: ref, note }); setNote(""); setRef(""); }} className="w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white">Confirmar</button>
          </Card>}
          {open && fee?.allowsExemption && <Card className="space-y-3 p-6">
            <h3 className="font-semibold">Aplicar isenção</h3>
            <input className={inputCls} placeholder="Motivo da isenção (obrigatório)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <textarea className={inputCls} placeholder="Observação" value={note} onChange={(e) => setNote(e.target.value)} />
            <button disabled={!reason.trim()} onClick={() => { applyExemption(c.id, reason.trim(), note); setReason(""); setNote(""); }} className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold disabled:opacity-40">Aplicar isenção</button>
          </Card>}
          <Card className="p-6">
            <h3 className="mb-4 font-semibold">Histórico</h3>
            <ol className="space-y-4">{[...c.history].reverse().map((e, i) => <li key={i} className="border-l-2 border-sky-200 pl-4 text-sm"><p className="font-semibold">{e.action}</p><p className="text-xs text-slate-500">{fmtDate(e.at)} · {e.userName}{e.fromStatus && ` · ${statusLabel[e.fromStatus]} → ${statusLabel[e.toStatus!]}`}</p>{e.note && <p className="mt-1 text-xs text-slate-600">{e.note}</p>}</li>)}</ol>
          </Card>
        </div>
      </div>
    </MobiGestShell>
  );
}
function Info({ l, v }: { l: string; v: string }) { return <div className="flex justify-between gap-4 border-b border-slate-100 pb-3 text-sm"><span className="text-slate-500">{l}</span><b className="text-right">{v}</b></div>; }
