export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-MZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  const datePart = new Intl.DateTimeFormat("pt-MZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("pt-MZ", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return datePart + " • " + timePart;
}

export function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-MZ").format(Number(value || 0));
}

export function formatMt(value: number | string | null | undefined) {
  return (
    new Intl.NumberFormat("pt-MZ", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(Number(value || 0)) + " MT"
  );
}
