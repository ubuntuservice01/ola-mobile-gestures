import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  ClipboardCheck,
  FileBarChart,
  KeyRound,
  LockKeyhole,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import {
  SuperAdminShell,
  SuperCard,
} from "../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/configuracoes")({
  component: ConfiguracoesGlobais,
});

const items = [
  {
    Icon: Activity,
    title: "Saúde da plataforma",
    description:
      "Diagnóstico do Supabase, RLS, Storage, operações críticas e preparação técnica.",
    to: "/super-admin/saude",
  },
  {
    Icon: ShieldCheck,
    title: "Perfis e permissões",
    description:
      "Consultar o RBAC efectivo aplicado pelo servidor a cada perfil institucional.",
    to: "/super-admin/permissoes",
  },
  {
    Icon: KeyRound,
    title: "Licenças e módulos",
    description:
      "Planos, limites, módulos autorizados, suspensão, renovação e utilização.",
    to: "/super-admin/licencas",
  },
  {
    Icon: LockKeyhole,
    title: "Acesso municipal",
    description:
      "Abrir e acompanhar sessões controladas de consulta ou assistência a municípios.",
    to: "/super-admin/acesso-municipal",
  },
  {
    Icon: ClipboardCheck,
    title: "Auditoria global",
    description:
      "Consultar eventos imutáveis de toda a plataforma e exportar o histórico.",
    to: "/super-admin/auditoria",
  },
  {
    Icon: FileBarChart,
    title: "Relatórios globais",
    description:
      "Analisar dados consolidados reais por município e exportar CSV.",
    to: "/super-admin/relatorios",
  },
  {
    Icon: Bell,
    title: "Notificações",
    description:
      "Alertas persistentes dirigidos ao Super Administrador.",
    to: "/super-admin/notificacoes",
  },
];

function ConfiguracoesGlobais() {
  return (
    <SuperAdminShell
      title="Configurações"
      subtitle="Centro de controlo global do MobiGest."
    >
      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-sky-950">
              Administração global
            </h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-sky-900/70">
              Esta área funciona como centro de controlo. Cada cartão abaixo
              abre uma área operacional real; não existem atalhos que voltem
              silenciosamente para esta mesma página.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map(({ Icon, title, description, to }) => (
          <Link key={title} to={to}>
            <SuperCard className="h-full p-6 transition hover:border-sky-200 hover:bg-sky-50/20">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-sm font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
              <p className="mt-4 text-xs font-semibold text-sky-700">
                Abrir área →
              </p>
            </SuperCard>
          </Link>
        ))}
      </div>

      <SuperCard className="mt-6 p-6">
        <h3 className="font-semibold">
          Separação global × municipal
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Global
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Perfis e permissões, municípios, licenças, saúde da plataforma,
              auditoria global, relatórios globais, notificações e sessões de
              assistência.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Municipal
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Estrutura territorial, taxas, documentos exigidos, operação de
              veículos, registos, fiscalização, multas e financeiro do
              município autorizado.
            </p>
          </div>
        </div>
      </SuperCard>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500">
        A identidade visual principal do MobiGest continua controlada pelo
        código e pelos activos oficiais do produto. Esta página não apresenta
        campos de edição de marca enquanto essas alterações não estiverem
        ligadas a um mecanismo seguro e realmente consumido pela aplicação.
      </div>
    </SuperAdminShell>
  );
}
