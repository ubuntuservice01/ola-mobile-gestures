import { ReactNode, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Bike,
  Building2,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  Menu,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  UserRoundCheck,
  Wallet,
  X,
} from "lucide-react";
import {
  endMunicipalAccess,
  loadCurrentMunicipalAccess,
  remainingSessionSeconds,
  type MunicipalAccessSession,
} from "../lib/municipal-access";
import { supabase } from "../lib/supabase";

const items = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/veiculos", "Veículos", Bike],
  ["/proprietarios", "Proprietários", Users],
  ["/taxistas", "Taxistas", UserRoundCheck],
  ["/fiscalizacao", "Fiscalização", ShieldCheck],
  ["/multas", "Multas", ReceiptText],
  ["/registos", "Registos", ClipboardList],
  ["/financeiro", "Financeiro", Wallet],
  ["/relatorios", "Relatórios", FileBarChart],
  ["/utilizadores", "Utilizadores", Users],
  ["/municipios", "Municípios", Building2],
  ["/postos-administrativos", "Postos administrativos", Building2],
  ["/localidades", "Localidades / bairros", MapPin],
  ["/definicoes", "Definições", Settings],
] as const;

export function MobiGestShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [accessSession, setAccessSession] = useState<MunicipalAccessSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [endingAccess, setEndingAccess] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const loadAccess = async () => {
      const session = await loadCurrentMunicipalAccess();
      if (!active || !session) return;

      setAccessSession(session);
      setRemainingSeconds(remainingSessionSeconds(session.expires_at));

      timer = setInterval(() => {
        const remaining = remainingSessionSeconds(session.expires_at);
        setRemainingSeconds(remaining);

        if (remaining <= 0) {
          if (timer) clearInterval(timer);
          void loadCurrentMunicipalAccess().finally(() => {
            window.location.replace("/super-admin");
          });
        }
      }, 1000);
    };

    void loadAccess();

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut({ scope: "local" });
    window.location.replace("/login");
  };

  const handleEndAccess = async () => {
    if (!accessSession || endingAccess) return;

    setEndingAccess(true);
    try {
      await endMunicipalAccess(accessSession.session_id);
      window.location.replace("/super-admin");
    } catch (error) {
      console.error("Falha ao terminar acesso municipal:", error);
      setEndingAccess(false);
    }
  };

  const isSuperAdminAccess = Boolean(accessSession);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside
        className={
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-white transition-transform lg:translate-x-0 " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
            <img
              src="/mobigest-logo.svg"
              alt="MobiGest"
              className="h-11 w-auto brightness-0 invert"
            />
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {items.map(([to, label, Icon]) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: to === "/dashboard" }}
                activeProps={{ className: "bg-sky-600 text-white" }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}

            <div className="my-4 border-t border-white/10 pt-4">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Sistema
              </p>
              <Link
                to="/permissoes"
                onClick={() => setOpen(false)}
                activeProps={{ className: "bg-sky-600 text-white" }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <ShieldCheck className="h-4 w-4" />
                Permissões
              </Link>
              <Link
                to="/auditoria"
                onClick={() => setOpen(false)}
                activeProps={{ className: "bg-sky-600 text-white" }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <FileText className="h-4 w-4" />
                Auditoria
              </Link>
            </div>
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-xs font-bold">
                {isSuperAdminAccess ? "SA" : "AD"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {isSuperAdminAccess ? "Super Administrador" : "Administrador"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {isSuperAdminAccess
                    ? accessSession?.municipality_name
                    : "Área municipal"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                aria-label="Sair"
                className="text-slate-500 hover:text-white disabled:opacity-50"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs text-slate-400">
                {isSuperAdminAccess
                  ? "MobiGest · Acesso municipal do Super Admin"
                  : "MobiGest"}
              </p>
              <h1 className="font-semibold">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/notificacoes"
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-sky-500" />
            </Link>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {isSuperAdminAccess ? "SA" : "AD"}
              </span>
              <span className="text-sm font-medium">
                {isSuperAdminAccess ? "Super Administrador" : "Administrador"}
              </span>
            </div>
          </div>
        </header>

        {accessSession && (
          <div
            className={
              "border-b px-5 py-3 md:px-8 " +
              (accessSession.access_mode === "consulta"
                ? "border-amber-200 bg-amber-50"
                : "border-sky-200 bg-sky-50")
            }
          >
            <div className="mx-auto flex max-w-[1500px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">
                    Acesso Super Admin · {accessSession.municipality_name}
                  </p>
                  <p className="mt-0.5 text-xs">
                    {accessSession.access_mode === "consulta"
                      ? "Consulta — somente leitura"
                      : "Assistência — operações municipais autorizadas"}{" "}
                    · Motivo: {accessSession.reason}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-sm">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatRemaining(remainingSeconds)}
                </span>
                <button
                  type="button"
                  onClick={handleEndAccess}
                  disabled={endingAccess}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  {endingAccess ? "A terminar..." : "Terminar acesso"}
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="mx-auto max-w-[1500px] px-5 py-7 md:px-8 md:py-8">
          {subtitle && <p className="mb-6 text-sm text-slate-500">{subtitle}</p>}
          {children}
        </main>
      </div>
    </div>
  );
}

function formatRemaining(seconds: number | null) {
  if (seconds === null) return "A calcular";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return String(minutes).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
}

export function PageHeader({
  title,
  description,
  action,
  actionTo,
}: {
  title: string;
  description?: string;
  action?: string;
  actionTo?: string;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      </div>
      {action && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex w-fit items-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          {action}
        </Link>
      )}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"rounded-2xl border border-slate-200 bg-white " + className}>
      {children}
    </section>
  );
}

export function EmptyTable({
  message = "Ainda não existem registos para apresentar.",
}: {
  message?: string;
}) {
  return <div className="py-16 text-center text-sm text-slate-400">{message}</div>;
}
