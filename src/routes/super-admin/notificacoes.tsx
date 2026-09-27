import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Bell, Check, CheckCircle2, Clock3, Filter, Info, Mail, Search, ShieldAlert, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/notificacoes")({ component: SuperAdminNotificacoes });

type Notification = {
  id: number;
  title: string;
  description: string;
  time: string;
  category: string;
  severity: "info" | "success" | "warning" | "critical";
  municipality?: string;
  read: boolean;
};

const initialNotifications: Notification[] = [
  { id: 1, title: "Licença próxima da renovação", description: "A licença do Município de Lichinga aproxima-se do período de renovação.", time: "Hoje, 08:15", category: "Licenças", severity: "warning", municipality: "Município de Lichinga", read: false },
  { id: 2, title: "Novo município em configuração", description: "O Município de Pemba encontra-se em fase de configuração inicial.", time: "Hoje, 07:40", category: "Municípios", severity: "info", municipality: "Município de Pemba", read: false },
  { id: 3, title: "Administrador Municipal preparado", description: "Foi preparado um novo perfil de Administrador Municipal para revisão.", time: "Ontem, 16:22", category: "Utilizadores", severity: "success", municipality: "Município de Lichinga", read: false },
  { id: 4, title: "Alteração crítica de permissões", description: "Foi registada uma alteração de permissões que requer acompanhamento.", time: "Ontem, 14:05", category: "Segurança", severity: "critical", read: true },
  { id: 5, title: "Auditoria disponível", description: "Existem novos eventos de auditoria global para consulta.", time: "26/09/2026, 17:30", category: "Auditoria", severity: "info", read: true },
];

function SuperAdminNotificacoes() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [onlyUnread, setOnlyUnread] = useState(false);

  const filtered = useMemo(() => notifications.filter((item) => {
    const matchesQuery = [item.title, item.description, item.municipality ?? ""].join(" ").toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "Todas" || item.category === category;
    const matchesRead = !onlyUnread || !item.read;
    return matchesQuery && matchesCategory && matchesRead;
  }), [notifications, query, category, onlyUnread]);

  const unread = notifications.filter((item) => !item.read).length;
  const markRead = (id: number) => setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  const markAllRead = () => setNotifications((current) => current.map((item) => ({ ...item, read: true })));

  return (
    <SuperAdminShell title="Notificações" subtitle="Alertas globais sobre municípios, licenças, utilizadores, segurança e actividade da plataforma.">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm text-slate-500">Centro de alertas do Super Administrador</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Notificações</h2></div>
        <div className="flex flex-wrap gap-2">
          <Link to="/super-admin/auditoria" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Ver auditoria</Link>
          {unread > 0 && <button type="button" onClick={markAllRead} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"><Check className="h-4 w-4" /> Marcar todas como lidas</button>}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Kpi icon={<Bell />} value={String(notifications.length)} label="Total" />
        <Kpi icon={<Mail />} value={String(unread)} label="Não lidas" />
        <Kpi icon={<ShieldAlert />} value={String(notifications.filter((item) => item.severity === "critical").length)} label="Segurança" />
      </section>

      <SuperCard className="mt-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar notificações" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-500" /></label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option>Todas</option><option>Municípios</option><option>Licenças</option><option>Utilizadores</option><option>Segurança</option><option>Auditoria</option></select>
          <button type="button" onClick={() => setOnlyUnread((value) => !value)} className={onlyUnread ? "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700" : "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"}><Filter className="h-4 w-4" /> Só não lidas</button>
        </div>
      </SuperCard>

      <SuperCard className="mt-4 overflow-hidden">
        {filtered.map((item) => (
          <article key={item.id} className={item.read ? "flex gap-4 border-b border-slate-100 px-5 py-5 last:border-0 md:px-6" : "flex gap-4 border-b border-slate-100 bg-sky-50/30 px-5 py-5 last:border-0 md:px-6"}>
            <div className={"mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full " + iconStyle(item.severity)}>{iconFor(item.severity)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col justify-between gap-1 sm:flex-row"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold">{item.title}</h3>{!item.read && <span className="h-2 w-2 rounded-full bg-sky-500" aria-label="Não lida" />}</div><span className="text-xs text-slate-400">{item.time}</span></div>
              <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{item.category}</span>{item.municipality && <span className="text-[11px] text-slate-400">{item.municipality}</span>}{!item.read && <button type="button" onClick={() => markRead(item.id)} className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700"><Check className="h-3.5 w-3.5" /> Marcar como lida</button>}</div>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <div className="p-12 text-center"><Bell className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold">Nenhuma notificação encontrada</p><p className="mt-1 text-xs text-slate-400">Ajuste os filtros para consultar outros alertas.</p></div>}
      </SuperCard>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <InfoBox title="O que gera uma notificação" text="Eventos importantes da plataforma, como alterações de licenças, novos municípios, segurança, utilizadores e situações que exigem acompanhamento." />
        <InfoBox title="Notificação não substitui auditoria" text="A notificação serve para chamar atenção. O registo completo da operação deve permanecer na auditoria, com utilizador, data, entidade e alterações realizadas." />
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500"><Clock3 className="mr-2 inline h-4 w-4 text-slate-400" />Nesta fase os alertas são demonstração de interface. Na integração com Supabase, serão persistidos por utilizador e poderão ser gerados automaticamente por eventos do sistema.</div>
    </SuperAdminShell>
  );
}

function Kpi({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <SuperCard className="p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">{icon}</div><p className="mt-4 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></SuperCard>;
}
function iconFor(severity: Notification["severity"]) {
  if (severity === "success") return <CheckCircle2 className="h-5 w-5" />;
  if (severity === "warning") return <AlertTriangle className="h-5 w-5" />;
  if (severity === "critical") return <XCircle className="h-5 w-5" />;
  return <Info className="h-5 w-5" />;
}
function iconStyle(severity: Notification["severity"]) {
  if (severity === "success") return "bg-emerald-50 text-emerald-600";
  if (severity === "warning") return "bg-amber-50 text-amber-600";
  if (severity === "critical") return "bg-rose-50 text-rose-600";
  return "bg-sky-50 text-sky-600";
}
function InfoBox({ title, text }: { title: string; text: string }) {
  return <SuperCard className="p-5"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></SuperCard>;
}
