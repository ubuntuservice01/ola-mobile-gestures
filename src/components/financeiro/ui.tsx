import type { ChargeStatus } from "@/lib/financeiro/types";
import { statusClass, statusLabel } from "@/lib/financeiro/types";

export function StatusBadge({ s }: { s: ChargeStatus }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[s]}`}>{statusLabel[s]}</span>;
}
export function DemoNotice({ text = "Dados de demonstração. Valores ilustrativos — não são taxas oficiais." }: { text?: string }) {
  return <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">{text}</div>;
}
export const fmtDate = (iso: string) => new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400";
