import {
  AlertTriangle,
  Check,
  CircleAlert,
  Info,
  Loader2,
  SearchX,
} from "lucide-react";
import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Skeleton } from "../ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export type LoadingButtonState =
  | "idle"
  | "loading"
  | "success"
  | "error";

export function LoadingButton({
  state = "idle",
  idleLabel,
  loadingLabel = "A processar...",
  successLabel = "Concluído",
  errorLabel = "Tentar novamente",
  icon,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  state?: LoadingButtonState;
  idleLabel: string;
  loadingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  icon?: ReactNode;
}) {
  const busy = state === "loading";

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={disabled || busy}
      aria-busy={busy}
      className={
        "mobigest-button inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold " +
        className
      }
    >
      {state === "loading" ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : state === "success" ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : state === "error" ? (
        <CircleAlert className="h-4 w-4" aria-hidden="true" />
      ) : (
        icon
      )}
      <span>
        {state === "loading"
          ? loadingLabel
          : state === "success"
            ? successLabel
            : state === "error"
              ? errorLabel
              : idleLabel}
      </span>
    </button>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="mobigest-page-enter">{children}</div>;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="mt-5 h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-20" />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div
        className="grid gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-3 w-3/4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="grid gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: columns }).map((__, column) => (
            <Skeleton
              key={column}
              className={column === 0 ? "h-4 w-4/5" : "h-4 w-3/5"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        {icon ?? <SearchX className="h-5 w-5" />}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const statusStyles: Record<string, { label: string; className: string }> = {
  activa: {
    label: "Activa",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  activo: {
    label: "Activo",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  aprovada: {
    label: "Aprovada",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  pago: {
    label: "Pago",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  paga: {
    label: "Paga",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  isento: {
    label: "Isento",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  em_recurso: {
    label: "Em recurso",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  anulada: {
    label: "Anulada",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  reembolsado: {
    label: "Reembolsado",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  roubada: {
    label: "Roubada",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  rejeitada: {
    label: "Rejeitada",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  cancelada: {
    label: "Cancelada",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  cancelado: {
    label: "Cancelado",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  apreendida: {
    label: "Apreendida",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  pendente: {
    label: "Pendente",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  em_validacao: {
    label: "Em validação",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  em_confirmacao: {
    label: "Em confirmação",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  correccao: {
    label: "Correcção",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  a_venda: {
    label: "À venda",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  suspensa: {
    label: "Suspensa",
    className: "border-slate-300 bg-slate-100 text-slate-700",
  },
  suspenso: {
    label: "Suspenso",
    className: "border-slate-300 bg-slate-100 text-slate-700",
  },
  inactiva: {
    label: "Inactiva",
    className: "border-slate-300 bg-slate-100 text-slate-600",
  },
  inactivo: {
    label: "Inactivo",
    className: "border-slate-300 bg-slate-100 text-slate-600",
  },
  validado: {
    label: "Validado",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  rejeitado: {
    label: "Rejeitado",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  expirado: {
    label: "Expirado",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  nao_apresentado: {
    label: "Não apresentado",
    className: "border-slate-300 bg-slate-100 text-slate-600",
  },
  configuracao: {
    label: "Em configuração",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  em_configuracao: {
    label: "Em configuração",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const normalized = status.toLowerCase();
  const meta = statusStyles[normalized] ?? {
    label: label ?? humanize(status),
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <span
      className={
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold " +
        meta.className
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
        aria-hidden="true"
      />
      {label ?? meta.label}
    </span>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
  busy?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="mobigest-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="leading-6">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
            className={
              destructive
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-sky-600 text-white hover:bg-sky-700"
            }
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function IconTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AnimatedNumber({
  value,
  formatter = (current) =>
    new Intl.NumberFormat("pt-MZ").format(Math.round(current)),
  duration = 650,
}: {
  value: number;
  formatter?: (value: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      setDisplay(value);
      previous.current = value;
      return;
    }

    const startValue = previous.current;
    const difference = value - startValue;
    const started = performance.now();
    let frame = 0;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(startValue + difference * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        previous.current = value;
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);

  return <>{formatter(display)}</>;
}

export const notify = {
  success(message: string, description?: string) {
    toast.success(message, { description });
  },
  error(message: string, description?: string) {
    toast.error(message, { description });
  },
  warning(message: string, description?: string) {
    toast.warning(message, { description });
  },
  info(message: string, description?: string) {
    toast.info(message, { description });
  },
};

export function NetworkErrorState({
  message = "Não foi possível carregar os dados.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mobigest-button mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

export function InfoNotice({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function humanize(value: string) {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
