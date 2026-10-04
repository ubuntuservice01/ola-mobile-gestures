import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Filter,
  Info,
  Mail,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  MobiGestShell,
  PageHeader,
  Card,
} from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/notificacoes")({
  component: Notificacoes,
});

type NotificationRow = {
  id: string;
  category: string;
  severity: "info" | "success" | "warning" | "critical";
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

function Notificacoes() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
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
          "id, category, severity, title, message, entity_type, entity_id, read_at, created_at",
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

      setRows((data ?? []) as NotificationRow[]);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () =>
      [...new Set(rows.map((row) => row.category))]
        .filter(Boolean)
        .sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return rows.filter((row) => {
      const haystack = [
        row.title,
        row.message,
        row.category,
        row.entity_type ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalized || haystack.includes(normalized)) &&
        (category === "todas" || row.category === category) &&
        (!onlyUnread || !row.read_at)
      );
    });
  }, [rows, query, category, onlyUnread]);

  const unread = rows.filter((row) => !row.read_at).length;

  const markRead = async (id: string) => {
    setActionError(null);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id);

    if (error) {
      console.error("Falha ao marcar notificação:", error);
      setActionError("Não foi possível marcar a notificação como lida.");
      return;
    }

    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, read_at: now } : row,
      ),
    );
  };

  const markAllRead = async () => {
    if (unread === 0 || markingAll) return;

    const ids = rows.filter((row) => !row.read_at).map((row) => row.id);
    const now = new Date().toISOString();

    setMarkingAll(true);
    setActionError(null);

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .in("id", ids);

    if (error) {
      console.error("Falha ao marcar todas as notificações:", error);
      setActionError("Não foi possível marcar todas como lidas.");
      setMarkingAll(false);
      return;
    }

    setRows((current) =>
      current.map((row) =>
        ids.includes(row.id) ? { ...row, read_at: now } : row,
      ),
    );
    setMarkingAll(false);
  };

  return (
    <MobiGestShell
      title="Notificações"
      subtitle="Alertas persistentes da operação municipal."
    >
      <PageHeader
        title="Notificações"
        description="Acontecimentos e alertas dirigidos à sua conta."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Metric
          icon={<Bell />}
          label="Total"
          value={loading ? "—" : String(rows.length)}
        />
        <Metric
          icon={<Mail />}
          label="Não lidas"
          value={loading ? "—" : String(unread)}
        />
        <Metric
          icon={<AlertTriangle />}
          label="Críticas"
          value={
            loading
              ? "—"
              : String(
                  rows.filter((row) => row.severity === "critical")
                    .length,
                )
          }
        />
      </div>

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar notificações..."
              className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="todas">Todas as categorias</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {labelize(item)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOnlyUnread((value) => !value)}
            className={
              onlyUnread
                ? "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700"
                : "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
            }
          >
            <Filter className="h-4 w-4" />
            Só não lidas
          </button>

          {unread > 0 && (
            <button
              type="button"
              disabled={markingAll}
              onClick={markAllRead}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              {markingAll ? "A actualizar..." : "Marcar todas"}
            </button>
          )}
        </div>
      </Card>

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {actionError}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            A carregar notificações...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold">
              Nenhuma notificação encontrada
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {rows.length === 0
                ? "Ainda não existem alertas persistidos para a sua conta."
                : "Ajuste os filtros para consultar outros alertas."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <div
                key={row.id}
                className={
                  "flex gap-4 p-5 " +
                  (!row.read_at ? "bg-sky-50/30" : "")
                }
              >
                <div
                  className={
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full " +
                    severityClass(row.severity)
                  }
                >
                  {severityIcon(row.severity)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-1 sm:flex-row">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">
                        {row.title}
                      </p>
                      {!row.read_at && (
                        <span className="h-2 w-2 rounded-full bg-sky-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(row.created_at).toLocaleString("pt-MZ")}
                    </p>
                  </div>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {row.message}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {labelize(row.category)}
                    </span>

                    {row.entity_type && (
                      <span className="text-[11px] text-slate-400">
                        {labelize(row.entity_type)}
                      </span>
                    )}

                    {!row.read_at && (
                      <button
                        type="button"
                        onClick={() => void markRead(row.id)}
                        className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Marcar como lida
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </MobiGestShell>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        {icon}
      </div>
      <p className="mt-3 text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function severityIcon(severity: NotificationRow["severity"]) {
  if (severity === "success") return <CheckCircle2 className="h-5 w-5" />;
  if (severity === "warning") return <AlertTriangle className="h-5 w-5" />;
  if (severity === "critical") return <XCircle className="h-5 w-5" />;
  return <Info className="h-5 w-5" />;
}

function severityClass(severity: NotificationRow["severity"]) {
  if (severity === "success") return "bg-emerald-50 text-emerald-600";
  if (severity === "warning") return "bg-amber-50 text-amber-600";
  if (severity === "critical") return "bg-rose-50 text-rose-600";
  return "bg-sky-50 text-sky-600";
}

function labelize(value: string) {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
