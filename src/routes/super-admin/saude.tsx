import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  FileCode2,
  HardDrive,
  HeartPulse,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Wifi,
  XCircle,
} from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/saude")({
  component: SaudePlataforma,
});

type Status = "configurado" | "pendente" | "nao-configurado";

const services: {
  name: string;
  description: string;
  status: Status;
  icon: React.ReactNode;
  action?: string;
}[] = [
  {
    name: "Aplicação web",
    description: "Interface principal do MobiGest.",
    status: "configurado",
    icon: <Activity />,
  },
  {
    name: "Supabase",
    description: "Cliente do projecto MobiGest configurado.",
    status: "configurado",
    icon: <Database />,
  },
  {
    name: "Autenticação",
    description: "Supabase Auth está preparado para login e sessões.",
    status: "configurado",
    icon: <KeyRound />,
  },
  {
    name: "RLS e isolamento",
    description: "Políticas reais por município ainda não foram implementadas.",
    status: "pendente",
    icon: <ShieldCheck />,
    action: "Implementar",
  },
  {
    name: "Base de dados",
    description: "Modelo funcional definido; persistência das entidades ainda pendente.",
    status: "pendente",
    icon: <Database />,
    action: "Configurar",
  },
  {
    name: "Armazenamento de documentos",
    description: "Storage para documentos e evidências ainda não configurado.",
    status: "pendente",
    icon: <HardDrive />,
    action: "Configurar",
  },
  {
    name: "Integrações externas",
    description: "Integrações de pagamento e outros serviços ainda não activadas.",
    status: "nao-configurado",
    icon: <Wifi />,
  },
  {
    name: "CI / testes automáticos",
    description: "Ainda não existe uma rotina de validação automática no repositório.",
    status: "nao-configurado",
    icon: <FileCode2 />,
    action: "Configurar",
  },
];

function SaudePlataforma() {
  const configured = services.filter((item) => item.status === "configurado").length;
  const pending = services.filter((item) => item.status === "pendente").length;
  const notConfigured = services.filter((item) => item.status === "nao-configurado").length;

  return (
    <SuperAdminShell
      title="Saúde da plataforma"
      subtitle="Visão técnica e operacional dos componentes necessários para colocar o MobiGest em produção."
    >
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500">Centro de controlo técnico</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Saúde da plataforma</h2>
        </div>
        <button
          type="button"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar verificação
        </button>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sky-950">Estado actual: fase de preparação</h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-sky-900/70">
              Esta página acompanha a preparação técnica do produto. Os estados abaixo representam o estado conhecido do projecto e não uma medição de disponibilidade em tempo real. A monitorização real será activada depois da ligação ao backend.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Kpi icon={<CheckCircle2 />} value={String(configured)} label="Configurados" tone="success" />
        <Kpi icon={<AlertTriangle />} value={String(pending)} label="Pendentes" tone="warning" />
        <Kpi icon={<XCircle />} value={String(notConfigured)} label="Não configurados" tone="danger" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <SuperCard className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="font-semibold">Componentes</h3>
            <p className="mt-1 text-sm text-slate-500">Estado conhecido de cada camada do MobiGest.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {services.map((service) => (
              <div key={service.name} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  {service.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold">{service.name}</h4>
                    <StatusBadge status={service.status} />
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{service.description}</p>
                </div>
                {service.action && (
                  <span className="text-xs font-semibold text-sky-700">{service.action}</span>
                )}
              </div>
            ))}
          </div>
        </SuperCard>

        <div className="space-y-6">
          <SuperCard className="p-6">
            <h3 className="font-semibold">Checklist de produção</h3>
            <p className="mt-1 text-sm text-slate-500">Itens que devem estar concluídos antes da operação real.</p>
            <div className="mt-5 space-y-3">
              <CheckItem text="Supabase dedicado ao MobiGest" done />
              <CheckItem text="Cliente Supabase no frontend" done />
              <CheckItem text="Modelo de dados e relações" />
              <CheckItem text="Auth + perfis funcionais" />
              <CheckItem text="RLS por município e perfil" />
              <CheckItem text="Storage de documentos" />
              <CheckItem text="Numeração atómica" />
              <CheckItem text="Auditoria persistente" />
              <CheckItem text="Testes de segurança e RLS" />
            </div>
          </SuperCard>

          <SuperCard className="p-6">
            <h3 className="font-semibold">Atalhos técnicos</h3>
            <div className="mt-4 space-y-2">
              <Link to="/super-admin/auditoria" className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm font-medium hover:bg-slate-100">
                Auditoria global <ExternalLink className="h-4 w-4 text-slate-400" />
              </Link>
              <Link to="/super-admin/configuracoes" className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm font-medium hover:bg-slate-100">
                Configurações da plataforma <ExternalLink className="h-4 w-4 text-slate-400" />
              </Link>
              <Link to="/super-admin/permissoes" className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm font-medium hover:bg-slate-100">
                Perfis e permissões <ExternalLink className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </SuperCard>
        </div>
      </section>

      <SuperCard className="mt-6 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Importante antes da produção</h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">
              O MobiGest já tem a arquitectura funcional e as principais interfaces desenhadas, mas ainda existem componentes críticos que dependem do Supabase: dados reais, autorização, RLS, Storage, numeração atómica e auditoria persistente. Estes itens devem ser tratados antes de considerar a plataforma operacional.
            </p>
          </div>
        </div>
      </SuperCard>
    </SuperAdminShell>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "configurado") {
    return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Configurado</span>;
  }
  if (status === "pendente") {
    return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Pendente</span>;
  }
  return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Não configurado</span>;
}

function Kpi({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone: "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "warning"
        ? "bg-amber-50 text-amber-600"
        : "bg-rose-50 text-rose-600";

  return (
    <SuperCard className="p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>{icon}</div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </SuperCard>
  );
}

function CheckItem({ text, done = false }: { text: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
      <span className={done ? "text-emerald-500" : "text-slate-300"}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="block h-4 w-4 rounded-full border-2 border-current" />}
      </span>
      <span className={done ? "text-sm text-slate-700" : "text-sm text-slate-500"}>{text}</span>
    </div>
  );
}
