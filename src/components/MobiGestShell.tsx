import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Bike,
  Building2,
  ClipboardList,
  Clock3,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
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
import { clearAllFormDrafts } from "../hooks/use-session-draft";
import {
  loadMunicipalityIdentity,
  municipalityLogoUrl,
} from "../lib/municipality-settings";
import {
  IconTooltip,
  PageTransition,
} from "./mobigest/Experience";
import {
  loadRbac,
  permissionCodeSet,
  type RoleCode,
} from "../lib/permissions";

const items = [
  ["/dashboard", "Dashboard", LayoutDashboard, "dashboard.view"],
  ["/veiculos", "Veículos", Bike, "vehicles.view"],
  ["/proprietarios", "Proprietários", Users, "owners.view"],
  ["/taxistas", "Taxistas", UserRoundCheck, "drivers.view"],
  ["/fiscalizacao", "Fiscalização", ShieldCheck, "fiscalization.view"],
  ["/multas", "Multas", ReceiptText, "fines.view"],
  ["/registos", "Registos", ClipboardList, "registrations.view"],
  ["/financeiro", "Financeiro", Wallet, "finance.view"],
  ["/relatorios", "Relatórios", FileBarChart, "reports.view"],
  ["/utilizadores", "Utilizadores", Users, "users.view"],
  ["/meu-municipio", "Meu Município", Building2, "settings.view"],
  ["/postos-administrativos", "Postos administrativos", Building2, "settings.view"],
  ["/localidades", "Localidades / bairros", MapPin, "settings.view"],
  ["/definicoes", "Definições", Settings, "settings.view"],
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
  const [profileName, setProfileName] = useState("Utilizador");
  const [profileRole, setProfileRole] = useState("Utilizador");
  const [profileMunicipality, setProfileMunicipality] = useState("Área municipal");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [allowedPermissions, setAllowedPermissions] = useState<Set<string>>(
    new Set(),
  );
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [municipalBrandName, setMunicipalBrandName] = useState("Área municipal");
  const [municipalLogoUrl, setMunicipalLogoUrl] = useState<string | null>(null);
  const [municipalPrimaryColor, setMunicipalPrimaryColor] = useState("#0284C7");

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

  useEffect(() => {
    let active = true;

    const loadIdentity = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) return;

      const [profileResult, notificationsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, role, municipality_id")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("recipient_user_id", user.id)
          .is("read_at", null),
      ]);

      if (!active) return;

      if (notificationsResult.error) {
        console.error(
          "Falha ao contar notificações não lidas:",
          notificationsResult.error,
        );
      } else {
        setUnreadNotifications(notificationsResult.count ?? 0);
      }

      if (profileResult.error || !profileResult.data) {
        console.error(
          "Falha ao carregar identidade municipal:",
          profileResult.error,
        );
        return;
      }

      setProfileName(profileResult.data.full_name || "Utilizador");
      setProfileRole(roleLabel(profileResult.data.role));

      try {
        const municipalIdentity = await loadMunicipalityIdentity();
        if (active && municipalIdentity) {
          setMunicipalBrandName(
            municipalIdentity.display_name || municipalIdentity.name,
          );
          setMunicipalLogoUrl(
            municipalityLogoUrl(municipalIdentity.logo_path),
          );
          setMunicipalPrimaryColor(
            municipalIdentity.primary_color || "#0284C7",
          );
          setProfileMunicipality(
            municipalIdentity.display_name || municipalIdentity.name,
          );
        }
      } catch (error) {
        console.error("Falha ao carregar identidade visual municipal:", error);
      }

      if (isRoleCode(profileResult.data.role)) {
        try {
          const rbac = await loadRbac();
          if (!active) return;
          setAllowedPermissions(
            permissionCodeSet(
              rbac.permissions,
              rbac.rolePermissions,
              profileResult.data.role,
            ),
          );
        } catch (error) {
          console.error("Falha ao carregar permissões do menu:", error);
        } finally {
          if (active) setPermissionsLoaded(true);
        }
      } else {
        setPermissionsLoaded(true);
      }

      if (profileResult.data.municipality_id) {
        const municipalityResult = await supabase
          .from("municipalities")
          .select("name")
          .eq("id", profileResult.data.municipality_id)
          .maybeSingle();

        if (!active) return;

        if (!municipalityResult.error && municipalityResult.data?.name) {
          setProfileMunicipality(municipalityResult.data.name);
        }
      }
    };

    void loadIdentity();

    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    clearAllFormDrafts();
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
    <div
      className="min-h-screen bg-[#f7f9fc] text-slate-950"
      style={{
        "--municipal-primary": municipalPrimaryColor,
      } as CSSProperties}
    >
      <aside
        className={
          "fixed inset-y-0 left-0 z-50 w-[min(88vw,320px)] border-r border-white/10 bg-[#07101f] text-white shadow-2xl shadow-slate-950/20 transition-transform duration-[220ms] ease-[cubic-bezier(0.2,0,0,1)] will-change-transform " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <Link
                to="/meu-municipio"
                onClick={() => setOpen(false)}
                className="mobigest-interactive flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 hover:bg-white/[0.06]"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm"
                  style={{ border: "2px solid " + municipalPrimaryColor }}
                >
                  {municipalLogoUrl ? (
                    <img
                      src={municipalLogoUrl}
                      alt={"Logótipo de " + municipalBrandName}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <Building2
                      className="h-6 w-6"
                      style={{ color: municipalPrimaryColor }}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Município
                  </p>
                  <p className="truncate text-sm font-semibold text-white">
                    {municipalBrandName}
                  </p>
                </div>
              </Link>

              <button
                type="button"
                className="mobigest-interactive rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <nav className="mobigest-sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3 py-3">
            {items
              .filter(([, , , permission]) =>
                canShowMenuItem(
                  permission,
                  allowedPermissions,
                  permissionsLoaded,
                ),
              )
              .map(([to, label, Icon]) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: to === "/dashboard" }}
                activeProps={{
                  className:
                    "bg-[var(--municipal-primary)] text-white shadow-lg shadow-slate-950/15 ring-1 ring-white/10 before:absolute before:-left-1 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-white",
                  "data-status": "active",
                }}
                className="mobigest-sidebar-link group relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white"
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span>{label}</span>
              </Link>
            ))}

            <div className="my-3 border-t border-white/10 pt-3">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Sistema
              </p>
              {canShowMenuItem(
                "users.view",
                allowedPermissions,
                permissionsLoaded,
              ) && (
                <Link
                  to="/permissoes"
                  onClick={() => setOpen(false)}
                  activeProps={{
                  className:
                    "bg-[var(--municipal-primary)] text-white shadow-lg shadow-slate-950/15 ring-1 ring-white/10 before:absolute before:-left-1 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-white",
                  "data-status": "active",
                }}
                  className="mobigest-sidebar-link group relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white"
                >
                  <ShieldCheck className="h-[18px] w-[18px] shrink-0" />
                  <span>Permissões</span>
                </Link>
              )}
              {canShowMenuItem(
                "audit.view",
                allowedPermissions,
                permissionsLoaded,
              ) && (
                <Link
                  to="/auditoria"
                  onClick={() => setOpen(false)}
                  activeProps={{
                  className:
                    "bg-[var(--municipal-primary)] text-white shadow-lg shadow-slate-950/15 ring-1 ring-white/10 before:absolute before:-left-1 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-white",
                  "data-status": "active",
                }}
                  className="mobigest-sidebar-link group relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white"
                >
                  <FileText className="h-[18px] w-[18px] shrink-0" />
                  <span>Auditoria</span>
                </Link>
              )}
            </div>
          </nav>

          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-transparent bg-white/[0.045] p-2 hover:border-white/10">
              <Link
                to="/perfil"
                onClick={() => setOpen(false)}
                className="mobigest-interactive flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 hover:bg-white/[0.06]"
                aria-label="Abrir meu perfil"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: municipalPrimaryColor }}
                >
                  {isSuperAdminAccess ? "SA" : initials(profileName)}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold">
                    {isSuperAdminAccess ? "Super Administrador" : profileName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {isSuperAdminAccess
                      ? accessSession?.municipality_name
                      : profileRole + " · " + profileMunicipality}
                  </p>
                </div>
              </Link>

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

      <button
        type="button"
        aria-label="Fechar menu"
        onClick={() => setOpen(false)}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        className={
          "mobigest-drawer-backdrop fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] " +
          (open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0")
        }
      />

      <div>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 shadow-[0_1px_0_rgba(15,23,42,0.02)] backdrop-blur-xl md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="mobigest-interactive inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:-translate-y-px hover:bg-slate-50 hover:text-slate-900 hover:shadow-md"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={open}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm"
              style={{ border: "1px solid " + municipalPrimaryColor }}
            >
              {municipalLogoUrl ? (
                <img
                  src={municipalLogoUrl}
                  alt={"Logótipo de " + municipalBrandName}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <Building2
                  className="h-5 w-5"
                  style={{ color: municipalPrimaryColor }}
                />
              )}
            </div>

            <div className="min-w-0">
              <p className="max-w-[48vw] truncate text-[11px] font-semibold tracking-wide text-slate-500 sm:max-w-none">
                {isSuperAdminAccess
                  ? accessSession?.municipality_name ?? municipalBrandName
                  : municipalBrandName}
              </p>
              <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-950">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <IconTooltip label="Notificações">
              <Link
                to="/notificacoes"
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
            <Link
              to="/perfil"
              className="hidden items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50 sm:flex"
              aria-label="Abrir meu perfil"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: municipalPrimaryColor }}
              >
                {isSuperAdminAccess ? "SA" : initials(profileName)}
              </span>
              <span className="hidden min-w-0 flex-col text-left lg:flex">
                <span className="max-w-44 truncate text-sm font-semibold text-slate-800">
                  {isSuperAdminAccess ? "Super Administrador" : profileName}
                </span>
                <span className="max-w-44 truncate text-[11px] text-slate-400">
                  {isSuperAdminAccess ? accessSession?.municipality_name : profileRole}
                </span>
              </span>
            </Link>
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

        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 md:py-7 lg:px-8">
          {title !== "Dashboard" && (
            <MobiGestBreadcrumbs
              currentTitle={title}
              rootLabel={municipalBrandName}
            />
          )}

          <PageTransition>
            {subtitle && (
              <p className="mb-5 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>
            )}
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

function isRoleCode(role: string): role is RoleCode {
  return [
    "super_admin",
    "admin_municipal",
    "tecnico",
    "fiscal",
    "financeiro",
  ].includes(role);
}

function canShowMenuItem(
  permission: string,
  allowedPermissions: Set<string>,
  loaded: boolean,
) {
  if (!loaded) return permission === "dashboard.view";
  return allowedPermissions.has(permission);
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    super_admin: "Super Administrador",
    admin_municipal: "Administrador Municipal",
    tecnico: "Técnico",
    fiscal: "Fiscal",
    financeiro: "Financeiro",
  };

  return labels[role] ?? role;
}

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.length
    ? parts.map((part) => part[0]?.toUpperCase() ?? "").join("")
    : "US";
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
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="max-w-3xl">
        <h2 className="text-[22px] font-bold tracking-[-0.025em] text-slate-950">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
        )}
      </div>
      {action && actionTo && (
        <Link
          to={actionTo}
          className="mobigest-button inline-flex w-fit items-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
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
    <section className={"mobigest-card rounded-xl border border-slate-200/80 bg-white " + className}>
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


const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  veiculos: "Veículos",
  novo: "Novo",
  proprietarios: "Proprietários",
  taxistas: "Taxistas / Condutores",
  fiscalizacao: "Fiscalização",
  historico: "Histórico",
  multas: "Multas",
  tipos: "Tipos de multa",
  registos: "Registos",
  financeiro: "Financeiro",
  relatorios: "Relatórios",
  utilizadores: "Utilizadores",
  "meu-municipio": "Meu Município",
  "postos-administrativos": "Postos administrativos",
  localidades: "Localidades / bairros",
  definicoes: "Definições",
  taxas: "Taxas",
  documentos: "Documentos",
  numeracao: "Numeração",
  permissoes: "Permissões",
  auditoria: "Auditoria",
  notificacoes: "Notificações",
  perfil: "Meu Perfil",
  imprimir: "Imprimir",
  qr: "QR Code",
  transferencia: "Transferência",
};

function MobiGestBreadcrumbs({
  currentTitle,
  rootLabel,
}: {
  currentTitle: string;
  rootLabel: string;
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-400"
    >
      <Link
        to="/dashboard"
        className="mobigest-interactive rounded px-1 py-0.5 hover:text-sky-700"
      >
        {rootLabel}
      </Link>

      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const path = "/" + segments.slice(0, index + 1).join("/");
        const looksLikeId =
          /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(segment) ||
          /^[A-Za-z0-9_-]{20,}$/.test(segment);
        const label = isLast
          ? BREADCRUMB_LABELS[segment] ??
            (looksLikeId ? currentTitle : humanizeBreadcrumb(segment))
          : BREADCRUMB_LABELS[segment] ??
            (looksLikeId ? "Detalhe" : humanizeBreadcrumb(segment));

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

function humanizeBreadcrumb(value: string) {
  return decodeURIComponent(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
