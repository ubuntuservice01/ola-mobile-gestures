import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../../components/MobiGestShell";
import { DemoNotice, inputCls } from "../../components/financeiro/ui";
import { currentMunicipalityId, municipalityName, saveFee, useFees } from "../../lib/financeiro/store";
import { mt, serviceLabel, vehicleLabel, type Fee, type ServiceType, type VehicleType } from "../../lib/financeiro/types";

export const Route = createFileRoute("/definicoes/taxas")({
  head: () => ({ meta: [{ title: "Taxas municipais — MobiGest" }, { name: "description", content: "Configure os serviços, valores e condições de cobrança do município." }, { property: "og:title", content: "Taxas municipais — MobiGest" }, { property: "og:description", content: "Configuração de taxas municipais." }] }),
  component: Taxas,
});

const blank = (): Fee => ({ id: `f${Date.now()}`, municipalityId: currentMunicipalityId, code: "", name: "", description: "", service: "outro", vehicleType: "todos", amount: 0, validFrom: new Date().toISOString().slice(0, 10), active: true, conditions: "", allowsExemption: false });

function Taxas() {
  const fees = useFees();
  const [edit, setEdit] = useState<Fee | null>(null);
  const set = (p: Partial<Fee>) => setEdit((e) => (e ? { ...e, ...p } : e));
  return (
    <MobiGestShell title="Taxas municipais">
      <Link to="/definicoes" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Definições</Link>
      <PageHeader title="Taxas municipais" description={`Taxas de ${municipalityName(currentMunicipalityId)}. Alterações não afectam cobranças já emitidas.`} />
      <DemoNotice text="Valores de exemplo para demonstração da interface — não são taxas oficiais. Cada município define as suas." />
      <div className="mb-4 flex justify-end"><button onClick={() => setEdit(blank())} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Nova taxa</button></div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Código", "Nome", "Serviço", "Veículo", "Valor", "Validade", "Isenção", "Estado", ""].map((x) => <th key={x} className="px-4 py-3 font-medium">{x}</th>)}</tr></thead>
          <tbody>{fees.map((f) => <tr key={f.id} className="border-t border-slate-100">
            <td className="px-4 py-3 font-semibold">{f.code}</td><td className="px-4 py-3">{f.name}<p className="text-xs text-slate-400">{f.description}</p></td>
            <td className="px-4 py-3">{serviceLabel[f.service]}</td><td className="px-4 py-3">{vehicleLabel[f.vehicleType]}</td>
            <td className="px-4 py-3 font-semibold">{mt(f.amount)}</td><td className="px-4 py-3 text-xs">{f.validFrom}{f.validTo ? ` → ${f.validTo}` : " → sem fim"}</td>
            <td className="px-4 py-3">{f.allowsExemption ? "Sim" : "Não"}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${f.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{f.active ? "Activa" : "Inactiva"}</span></td>
            <td className="px-4 py-3"><button onClick={() => setEdit({ ...f })} className="rounded-lg border border-slate-200 p-2 text-slate-500"><Pencil className="h-4 w-4" /></button></td>
          </tr>)}</tbody>
        </table>
      </Card>
      {edit && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setEdit(null)}>
        <Card className="max-h-[90vh] w-full max-w-xl overflow-y-auto p-6"><div onClick={(e) => e.stopPropagation()} className="grid gap-3 sm:grid-cols-2">
          <h3 className="font-semibold sm:col-span-2">{fees.some((f) => f.id === edit.id) ? "Editar taxa" : "Nova taxa"}</h3>
          <label className="text-sm">Código<input className={inputCls} value={edit.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} /></label>
          <label className="text-sm">Nome<input className={inputCls} value={edit.name} onChange={(e) => set({ name: e.target.value })} /></label>
          <label className="text-sm sm:col-span-2">Descrição<input className={inputCls} value={edit.description} onChange={(e) => set({ description: e.target.value })} /></label>
          <label className="text-sm">Serviço<select className={inputCls} value={edit.service} onChange={(e) => set({ service: e.target.value as ServiceType })}>{Object.entries(serviceLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-sm">Tipo de veículo<select className={inputCls} value={edit.vehicleType} onChange={(e) => set({ vehicleType: e.target.value as VehicleType })}>{Object.entries(vehicleLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-sm">Valor (MT)<input type="number" min={0} className={inputCls} value={edit.amount} onChange={(e) => set({ amount: Number(e.target.value) })} /></label>
          <label className="text-sm">Estado<select className={inputCls} value={edit.active ? "1" : "0"} onChange={(e) => set({ active: e.target.value === "1" })}><option value="1">Activa</option><option value="0">Inactiva</option></select></label>
          <label className="text-sm">Início de validade<input type="date" className={inputCls} value={edit.validFrom} onChange={(e) => set({ validFrom: e.target.value })} /></label>
          <label className="text-sm">Fim de validade<input type="date" className={inputCls} value={edit.validTo ?? ""} onChange={(e) => set({ validTo: e.target.value || undefined })} /></label>
          <label className="text-sm sm:col-span-2">Condições<textarea className={inputCls} value={edit.conditions} onChange={(e) => set({ conditions: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={edit.allowsExemption} onChange={(e) => set({ allowsExemption: e.target.checked })} />Permite isenção</label>
          <div className="flex justify-end gap-2 sm:col-span-2"><button onClick={() => setEdit(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Cancelar</button><button disabled={!edit.code || !edit.name} onClick={() => { saveFee(edit); setEdit(null); }} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Guardar</button></div>
        </div></Card>
      </div>}
    </MobiGestShell>
  );
}
