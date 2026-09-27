// Dados de DEMONSTRAÇÃO centralizados (em memória). Serão substituídos por consultas Supabase com RLS por município.
import { useSyncExternalStore } from "react";
import type { Charge, ChargeStatus, Fee, Municipality, PaymentMethod } from "./types";

export const DEMO_USER = "Administrador";
export const municipalities: Municipality[] = [
  { id: "m-lic", code: "LIC", name: "Município de Lichinga", province: "Niassa" },
  { id: "m-cua", code: "CUA", name: "Município de Cuamba", province: "Niassa" },
];
export const currentMunicipalityId = "m-lic";

let fees: Fee[] = [
  { id: "f1", municipalityId: "m-lic", code: "REG-001", name: "Registo inicial", description: "Registo de veículo no MobiGest", service: "registo", vehicleType: "todos", amount: 1000, validFrom: "2026-01-01", active: true, conditions: "Aplicável a novos registos", allowsExemption: true },
  { id: "f2", municipalityId: "m-lic", code: "REN-001", name: "Renovação", description: "Renovação do registo", service: "renovacao", vehicleType: "todos", amount: 500, validFrom: "2026-01-01", active: true, conditions: "", allowsExemption: false },
  { id: "f3", municipalityId: "m-lic", code: "TRA-001", name: "Transferência de propriedade", description: "Mudança de titular", service: "transferencia", vehicleType: "todos", amount: 750, validFrom: "2026-01-01", active: true, conditions: "", allowsExemption: false },
  { id: "f4", municipalityId: "m-lic", code: "DOC-001", name: "2.ª via", description: "Substituição de documento", service: "segunda_via", vehicleType: "todos", amount: 300, validFrom: "2026-01-01", active: true, conditions: "", allowsExemption: true },
  { id: "f5", municipalityId: "m-lic", code: "QR-001", name: "Identificação / QR Code", description: "Emissão de etiqueta QR", service: "qr", vehicleType: "todos", amount: 200, validFrom: "2026-01-01", active: true, conditions: "", allowsExemption: true },
];

const h = (at: string, action: string, toStatus?: ChargeStatus) => ({ at, action, toStatus, userName: DEMO_USER });
let charges: Charge[] = [
  { id: "c3", reference: "COB-LIC-000003", municipalityId: "m-lic", ownerName: "Joaquim Ernesto", vehicle: "Bicicleta Phoenix · MOBI-LIC-000003", vehicleType: "bicicleta", service: "registo", feeId: "f1", feeCode: "REG-001", appliedAmount: 1000, createdAt: "2026-09-25T10:12:00", status: "pendente", createdBy: DEMO_USER, history: [h("2026-09-25T10:12:00", "Cobrança criada", "pendente")] },
  { id: "c2", reference: "COB-LIC-000002", municipalityId: "m-lic", ownerName: "Maria José", vehicle: "Toyota Hilux · MOBI-LIC-000002", vehicleType: "carro", service: "transferencia", feeId: "f3", feeCode: "TRA-001", appliedAmount: 750, createdAt: "2026-09-24T09:00:00", status: "pago", createdBy: DEMO_USER, payment: { method: "pos", reference: "POS-88213", paidAt: "2026-09-24T09:20:00", userName: DEMO_USER }, history: [h("2026-09-24T09:00:00", "Cobrança criada", "pendente"), h("2026-09-24T09:20:00", "Pagamento registado", "pago")] },
  { id: "c1", reference: "COB-LIC-000001", municipalityId: "m-lic", ownerName: "Alberto Manuel", vehicle: "Honda CG 125 · MOBI-LIC-000001", vehicleType: "motorizada", service: "registo", feeId: "f1", feeCode: "REG-001", appliedAmount: 1000, createdAt: "2026-09-22T14:30:00", status: "pago", createdBy: DEMO_USER, payment: { method: "numerario", reference: "CX-0041", paidAt: "2026-09-22T14:45:00", userName: DEMO_USER }, history: [h("2026-09-22T14:30:00", "Cobrança criada", "pendente"), h("2026-09-22T14:45:00", "Pagamento registado", "pago")] },
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const now = () => new Date().toISOString().slice(0, 19);

// Isolamento: só devolve dados do município actual (futuro RLS).
export function useFees() { return useSyncExternalStore(subscribe, () => fees, () => fees).filter((f) => f.municipalityId === currentMunicipalityId); }
export function useCharges() { return useSyncExternalStore(subscribe, () => charges, () => charges).filter((c) => c.municipalityId === currentMunicipalityId); }
export const municipalityName = (id: string) => municipalities.find((m) => m.id === id)?.name ?? "—";

export function saveFee(fee: Fee) { fees = fees.some((f) => f.id === fee.id) ? fees.map((f) => (f.id === fee.id ? fee : f)) : [...fees, fee]; emit(); }

export function createCharge(input: { ownerName: string; vehicle: string; vehicleType: Charge["vehicleType"]; feeId: string; note?: string }) {
  const fee = fees.find((f) => f.id === input.feeId)!;
  const muni = municipalities.find((m) => m.id === currentMunicipalityId)!;
  const seq = charges.filter((c) => c.municipalityId === muni.id).length + 1;
  const c: Charge = { id: `c${Date.now()}`, reference: `COB-${muni.code}-${String(seq).padStart(6, "0")}`, municipalityId: muni.id, ownerName: input.ownerName, vehicle: input.vehicle, vehicleType: input.vehicleType, service: fee.service, feeId: fee.id, feeCode: fee.code, appliedAmount: fee.amount, createdAt: now(), status: "pendente", createdBy: DEMO_USER, note: input.note, history: [{ at: now(), action: `Cobrança criada (taxa ${fee.code}, valor copiado)`, toStatus: "pendente", userName: DEMO_USER }] };
  charges = [c, ...charges]; emit(); return c;
}

function update(id: string, fn: (c: Charge) => Charge) { charges = charges.map((c) => (c.id === id ? fn(c) : c)); emit(); }

export function changeStatus(id: string, to: ChargeStatus, opts: { note?: string; method?: PaymentMethod; reference?: string }) {
  update(id, (c) => ({
    ...c, status: to,
    payment: to === "pago" ? { method: opts.method ?? "numerario", reference: opts.reference ?? "", paidAt: now(), userName: DEMO_USER, note: opts.note } : c.payment,
    history: [...c.history, { at: now(), action: to === "pago" ? "Pagamento registado" : to === "reembolsado" ? "Reembolso" : "Alteração de estado", fromStatus: c.status, toStatus: to, userName: DEMO_USER, note: opts.note }],
  }));
}

export function applyExemption(id: string, reason: string, note?: string) {
  update(id, (c) => ({ ...c, status: "isento", exemption: { reason, note, userName: DEMO_USER, date: now() }, history: [...c.history, { at: now(), action: `Isenção aplicada: ${reason}`, fromStatus: c.status, toStatus: "isento", userName: DEMO_USER, note }] }));
}
