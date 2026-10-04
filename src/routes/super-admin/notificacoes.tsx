import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Filter,
  Info,
  Mail,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  SuperAdminShell,
  SuperCard,
} from "../../components/SuperAdminShell";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/super-admin/notificacoes")({
  component: SuperAdminNotificacoes,
});

type Notification = {
  id: string;
  recipient_user_id: string;
  municipality_id: string | null;
  category: string;
  severity: "info" | "success" | "warning" | "critical";
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
  municipalityName: string | null;
};

function SuperAdminNotificacoes() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user) {
        setLoadError("Não foi possível identificar o utilizador autenticado.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, recipient_user_id, municipality_id, category, severity, title, message, entity_type, entity_id, read_at, created_at",
        )
        .eq("recipient_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar notificações:", error);
        setLoadError("Não foi possível carregar as notificações.");
        setLoading(false);
        return;
      }

      const base = (data ?? []) as Omit<
        Notification,
        "municipalityName"
      >[];
      const municipalityIds = [
        ...new Set(
          base
            .map((item) => item.municipality_id)
            .filter(Boolean) as string[],
        ),
      ];

      const municipalityResult = municipalityIds.length
        ? await supabase
            .from("municipalities")
            .select("id, name")
            .in("id", municipalityIds)
        : { data: [], error: null };

      if (!active) return;

      if (municipalityResult.error) {
        console.error(
          "Falha ao carregar municípios das notificações:",
          municipalityResult.error,
        );
        setLoadError(
          "As notificações foram encontradas, mas os municípios não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      const municipalityMap = new Map(
        (municipalityResult.data ?? []).map((item) => [
          item.id,
          item.name,
        ]),
      );

      setNotifications(
        base.map((item) => ({
          ...item,
          municipalityName: item.municipality_id
            ? municipalityMap.get(item.municipality_id) ?? "Município"
            : null,
        })),
      );
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () =>
      [...new Set(notifications.map((item) => item.category))]
        .filter(Boolean)
        .sort(),
    [notifications],
  );

  const filtered = useMemo(
    () =>
      notifications.filter((item) => {
        const haystack = [
          item.title,
          item.message,
          item.municipalityName ?? "",
          item.category,
        ]
          .join(" ")
          .toLowerCase();

        return (
          (!query.trim() ||
            haystack.includes(query.trim().toLowerCase())) &&
          (category === "todas" || item.category === category) &&
          (!onlyUnread || !item.read_at)
        );
      }),
    [notifications, query, category, onlyUnread],
  );

  const unread = notifications.filter((item) => !item.read_at).length;

  const markRead = async (id: string) => {
    setActionError(null);

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id);

    if (error) {
      console.error("Falha ao marcar notificação como lida:", error);
      setActionError("Não foi possível marcar a notificação como lida.");
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read_at: now } : item,
      ),
    );
  };

  const markAllRead = async () => {
    if (unread === 0 || markingAll) return;

    setMarkingAll(true);
    setActionError(null);

    const unreadIds = notifications
      .filter((item) => !item.read_at)
      .map((item) => item.id);

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .in("id", unreadIds);

    if (error) {
      console.error("Falha ao marcar notificações como lidas:", error);
      setActionError("Não foi possível marcar todas como lidas.");
      setMarkingAll(false);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        unreadIds.includes(item.id)
          ? { ...item, read_at: now }
          : item,
      ),
    );
    setMarkingAll(false);
  };

  return (
    <SuperAdminShell
      title="Notificações"
      subtitle="Alertas persistentes dirigidos ao Super Administrador."
    >
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500">
            Centro de alertas do Super Administrador
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Notificações
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/super-admin/auditoria"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            Ver auditoria
          </Link>

          {unread > 0 && (
            <button
              type="button"
              disabled={markingAll}
              onClick={markAllRead}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              {markingAll
                ? "A actualizar..."
                : "Marcar todas como lidas"}
            </button>
          )}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Kpi
          icon={<Bell />}
          value={loading ? "—" : String(notifications.length)}
          label="Total"
        />
        <Kpi
          icon={<Mail />}
          value={loading ? "—" : String(unread)}
          label="Não lidas"
        />
        <Kpi
          icon={<ShieldAlert />}
          value={
            loading
              ? "—"
              : String(
                  notifications.filter(
                    (item) => item.severity === "critical",
                  ).length,
                )
          }
          label="Críticas"
        />
      </section>

      <SuperCard className="mt-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar notificações"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="todas">Todas as categorias</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {categoryLabel(item)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOnlyUnread((value) => !value)}
            className={
              onlyUnread
                ? "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700"
                : "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
            }
          >
            <Filter className="h-4 w-4" />
            Só não lidas
          </button>
        </div>
      </SuperCard>

      {actionError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {actionError}
        </div>
      )}

      {loadError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      <SuperCard className="mt-4 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            A carregar notificações...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold">
              Nenhuma notificação encontrada
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {notifications.length === 0
                ? "Ainda não existem alertas persistidos para esta conta."
                : "Ajuste os filtros para consultar outros alertas."}
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <article
              key={item.id}
              className={
                item.read_at
                  ? "flex gap-4 border-b border-slate-100 px-5 py-5 last:border-0 md:px-6"
                  : "flex gap-4 border-b border-slate-100 bg-sky-50/30 px-5 py-5 last:border-0 md:px-6"
              }
            >
              <div
                className={
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full " +
                  iconStyle(item.severity)
                }
              >
                {iconFor(item.severity)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col justify-between gap-1 sm:flex-row">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">
                      {item.title}
                    </h3>
                    {!item.read_at && (
                      <span
                        className="h-2 w-2 rounded-full bg-sky-500"
                        aria-label="Não lida"
                      />
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(item.created_at).toLocaleString(
                      "pt-MZ",
                    )}
                  </span>
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {item.message}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {categoryLabel(item.category)}
                  </span>

                  {item.municipalityName && (
                    <span className="text-[11px] text-slate-400">
                      {item.municipalityName}
                    </span>
                  )}

                  {!item.read_at && (
                    <button
                      type="button"
                      onClick={() => markRead(item.id)}
                      className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Marcar como lida
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </SuperCard>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <InfoBox
          title="Alertas persistentes"
          text="O estado de leitura é guardado no Supabase por destinatário. Actualizar a página ou iniciar nova sessão já não repõe notificações lidas."
        />
        <InfoBox
          title="Notificação não substitui auditoria"
          text="A notificação chama atenção para um evento. O histórico completo da operação permanece na Auditoria."
        />
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500">
        <Clock3 className="mr-2 inline h-4 w-4 text-slate-400" />
        A geração automática de alertas por prazo e condição pode ser
        acrescentada depois; esta página já consome e actualiza os registos
        persistidos no sistema.
      </div>
    </SuperAdminShell>
  );
}

function Kpi({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <SuperCard className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        {icon}
      </div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </SuperCard>
  );
}

function iconFor(severity: Notification["severity"]) {
  if (severity === "success") {
    return <CheckCircle2 className="h-5 w-5" />;
  }
  if (severity === "warning") {
    return <AlertTriangle className="h-5 w-5" />;
  }
  if (severity === "critical") {
    return <XCircle className="h-5 w-5" />;
  }
  return <Info className="h-5 w-5" />;
}

function iconStyle(severity: Notification["severity"]) {
  if (severity === "success") {
    return "bg-emerald-50 text-emerald-600";
  }
  if (severity === "warning") {
    return "bg-amber-50 text-amber-600";
  }
  if (severity === "critical") {
    return "bg-rose-50 text-rose-600";
  }
  return "bg-sky-50 text-sky-600";
}

function categoryLabel(category: string) {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function InfoBox({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <SuperCard className="p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {text}
      </p>
    </SuperCard>
  );
}
