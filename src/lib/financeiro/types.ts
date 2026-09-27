// Tipos do módulo financeiro — preparados para futuras tabelas Supabase (com municipality_id para RLS).
export type VehicleType = "todos" | "motorizada" | "carro" | "bicicleta";
export type ServiceType = "registo" | "renovacao" | "transferencia" | "segunda_via" | "qr" | "outro";
export type ChargeStatus = "pendente" | "em_confirmacao" | "pago" | "cancelado" | "reembolsado" | "isento";
export type PaymentMethod = "numerario" | "pos" | "transferencia" | "movel" | "outro";

export interface Municipality { id: string; code: string; name: string; province: string }

export interface Fee {
  id: string; municipalityId: string; code: string; name: string; description: string;
  service: ServiceType; vehicleType: VehicleType; amount: number;
  validFrom: string; validTo?: string; active: boolean; conditions: string; allowsExemption: boolean;
}

export interface Payment { method: PaymentMethod; reference: string; paidAt: string; userName: string; note?: string }
export interface FeeExemption { reason: string; userName: string; date: string; note?: string }
export interface FinancialTransaction { at: string; action: string; fromStatus?: ChargeStatus; toStatus?: ChargeStatus; userName: string; note?: string }

export interface Charge {
  id: string; reference: string; municipalityId: string; ownerName: string; vehicle: string;
  vehicleType: Exclude<VehicleType, "todos">; service: ServiceType;
  feeId: string; feeCode: string; appliedAmount: number; // valor copiado no momento da cobrança
  createdAt: string; status: ChargeStatus; createdBy: string; note?: string;
  payment?: Payment; exemption?: FeeExemption; history: FinancialTransaction[];
}

export interface Receipt { chargeId: string; municipalityName: string; reference: string; issuedAt: string }

export const statusLabel: Record<ChargeStatus, string> = { pendente: "Pendente", em_confirmacao: "Em confirmação", pago: "Pago", cancelado: "Cancelado", reembolsado: "Reembolsado", isento: "Isento" };
export const statusClass: Record<ChargeStatus, string> = { pendente: "bg-amber-50 text-amber-700", em_confirmacao: "bg-sky-50 text-sky-700", pago: "bg-emerald-50 text-emerald-700", cancelado: "bg-slate-100 text-slate-600", reembolsado: "bg-violet-50 text-violet-700", isento: "bg-teal-50 text-teal-700" };
export const methodLabel: Record<PaymentMethod, string> = { numerario: "Numerário", pos: "POS", transferencia: "Transferência bancária", movel: "Pagamento móvel", outro: "Outro meio autorizado" };
export const serviceLabel: Record<ServiceType, string> = { registo: "Registo inicial", renovacao: "Renovação", transferencia: "Transferência de propriedade", segunda_via: "2.ª via / substituição", qr: "Identificação / QR Code", outro: "Outros serviços municipais" };
export const vehicleLabel: Record<VehicleType, string> = { todos: "Todos", motorizada: "Motorizada", carro: "Carro", bicicleta: "Bicicleta" };
export const mt = (v: number) => `${v.toLocaleString("pt-PT").replace(/\./g, " ")} MT`;
