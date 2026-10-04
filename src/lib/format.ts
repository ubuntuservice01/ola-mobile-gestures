const dateFormatter = new Intl.DateTimeFormat("pt-MZ", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-MZ", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const numberFormatter = new Intl.NumberFormat("pt-MZ", {
  maximumFractionDigits: 0,
});

const moneyFormatter = new Intl.NumberFormat("pt-MZ", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date).replace(",", " •");
}

export function formatNumber(value: number | string | null | undefined) {
  return numberFormatter.format(Number(value || 0));
}

export function formatMoneyMt(value: number | string | null | undefined) {
  return moneyFormatter.format(Number(value || 0)).replace(/\u00a0/g, " ") + " MT";
}
