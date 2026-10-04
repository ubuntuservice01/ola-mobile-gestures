import { ReactNode, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  LockKeyhole,
  LogOut,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { IconTooltip, PageTransition } from "./mobigest/Experience";

const items = [
  ["/super-admin", "Dashboard", LayoutDashboard],
  ["/super-admin/municipios", "Municípios", Building2],
  ["/super-admin/utilizadores", "Utilizadores", Users],
  ["/super-admin/licencas", "Licenças", KeyRound],
  ["/super-admin/permissoes", "Perfis e permissões", ShieldCheck],
  ["/super-admin/auditoria", "Auditoria", Activity],
  ["/super-admin/saude", "Saúde da plataforma", HeartPulse],
  ["/super-admin/configuracoes", "Configurações", Settings],
] as const;

export function SuperAdminShell({
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let active = true;

    const loadUnreadNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) return;

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", user.id)
        .is("read_at", null);

      if (!active) return;

      if (error) {
        console.error("Falha ao contar notificações não lidas:", error);
        return;
      }

      setUnreadNotifications(count ?? 0);
    };

    void loadUnreadNotifications();

    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut({ scope: "local" });
    window.location.replace("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 text-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
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

          <div className="border-b border-white/10 px-5 py-4">
            <div className="rounded-xl bg-sky-500/10 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-400">
                Administração global
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                Super Administrador
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Gestão de toda a plataforma MobiGest
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Plataforma
            </p>

            {items.slice(0, 4).map(([to, label, Icon]) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: to === "/super-admin" }}
                activeProps={{ className: "bg-sky-600 text-white", "data-status": "active" }}
                className="mobigest-sidebar-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}

            <p className="mt-7 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Controlo
            </p>

            <Link
              to="/super-admin/relatorios"
              onClick={() => setOpen(false)}
              activeProps={{ className: "bg-sky-600 text-white", "data-status": "active" }}
              className="mobigest-sidebar-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
            >
              <BarChart3 className="h-4 w-4" />
              Relatórios globais
            </Link>

            <Link
              to="/super-admin/notificacoes"
              onClick={() => setOpen(false)}
              activeProps={{ className: "bg-sky-600 text-white", "data-status": "active" }}
              className="mobigest-sidebar-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
            >
              <Bell className="h-4 w-4" />
              Notificações
            </Link>

            {items.slice(4).map(([to, label, Icon]) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
              activeProps={{ className: "bg-sky-600 text-white", "data-status": "active" }}
                className="mobigest-sidebar-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}

            <div className="my-4 border-t border-white/10 pt-4">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Operação
              </p>
              <Link
                to="/super-admin/acesso-municipal"
                onClick={() => setOpen(false)}
                className="mobigest-sidebar-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <LockKeyhole className="h-4 w-4" />
                Acesso à área municipal
              </Link>
            </div>
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-xs font-bold">
                SA
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Super Administrador</p>
                <p className="truncate text-xs text-slate-500">Acesso global</p>
              </div>
              <IconTooltip label="Terminar sessão">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  aria-label="Terminar sessão"
                  className="mobigest-interactive rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </IconTooltip>
            </div>
          </div>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="mobigest-drawer-backdrop fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <div className="lg:pl-72">
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
              <p className="text-xs text-slate-400">MobiGest · Administração global</p>
              <h1 className="font-semibold">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <IconTooltip label="Notificações">
              <Link
                to="/super-admin/notificacoes"
                className="mobigest-interactive relative rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Notificações"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[9px] font-bold text-white">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </Link>
            </IconTooltip>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                SA
              </div>
              <div>
                <p className="text-sm font-medium">Super Administrador</p>
                <p className="text-[11px] text-slate-400">Acesso global</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-5 py-7 md:px-8 md:py-8">
          {title !== "Dashboard" && (
            <SuperAdminBreadcrumbs currentTitle={title} />
          )}

          <PageTransition>
            {subtitle && (
              <p className="mb-6 text-sm text-slate-500">{subtitle}</p>
            )}
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

const SUPER_BREADCRUMB_LABELS: Record<string, string> = {
  "super-admin": "Administração global",
  municipios: "Municípios",
  utilizadores: "Utilizadores",
  licencas: "Licenças",
  planos: "Planos",
  permissoes: "Perfis e permissões",
  auditoria: "Auditoria",
  saude: "Saúde da plataforma",
  configuracoes: "Configurações",
  relatorios: "Relatórios globais",
  notificacoes: "Notificações",
  "acesso-municipal": "Acesso municipal",
  novo: "Novo",
  administrador: "Administrador Municipal",
};

function SuperAdminBreadcrumbs({
  currentTitle,
}: {
  currentTitle: string;
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-400"
    >
      {segments.map((segment, index) => {
        const isFirst = index === 0;
        const isLast = index === segments.length - 1;
        const path = "/" + segments.slice(0, index + 1).join("/");
        const looksLikeId =
          /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(segment) ||
          /^[A-Za-z0-9_-]{20,}$/.test(segment);
        const label = isLast
          ? SUPER_BREADCRUMB_LABELS[segment] ??
            (looksLikeId ? currentTitle : humanizeSuperBreadcrumb(segment))
          : SUPER_BREADCRUMB_LABELS[segment] ??
            (looksLikeId ? "Detalhe" : humanizeSuperBreadcrumb(segment));

        if (isFirst) {
          return (
            <Link
              key={path}
              to="/super-admin"
              className="mobigest-interactive rounded px-1 py-0.5 hover:text-sky-700"
            >
              Administração global
            </Link>
          );
        }

        return (
          <span key={path} className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            {isLast || looksLikeId ? (
              <span className="font-medium text-slate-600">{label}</span>
            ) : (
              <Link
                to={path as never}
                className="mobigest-interactive rounded px-1 py-0.5 hover:text-sky-700"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function humanizeSuperBreadcrumb(value: string) {
  return decodeURIComponent(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SuperCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mobigest-card rounded-2xl border border-slate-200 bg-white ${className}`}>
      {children}
    </section>
  );
}
