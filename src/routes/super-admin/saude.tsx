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
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SuperAdminShell,
  SuperCard,
} from "../../components/SuperAdminShell";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/super-admin/saude")({
  component: SaudePlataforma,
});

type RuntimeHealth = {
  checked_at: string;
  database: {
    required_tables: number;
    present_tables: number;
    ok: boolean;
  };
  rls: {
    required_tables: number;
    enabled_tables: number;
    policy_count: number;
    ok: boolean;
  };
  storage: {
    bucket: string;
    private_bucket_exists: boolean;
    ok: boolean;
  };
  features: {
    finance: boolean;
    licenses: boolean;
    drivers_and_fines: boolean;
    documents: boolean;
    audit: boolean;
  };
};

type Status = "ok" | "attention" | "external";

type HealthItem = {
  name: string;
  description: string;
  status: Status;
  detail: string;
  icon: React.ReactNode;
};

function SaudePlataforma() {
  const [health, setHealth] = useState<RuntimeHealth | null>(null);
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setChecking(true);
    setErrorMessage(null);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    setSessionOk(Boolean(session) && !sessionError);

    const { data, error } = await supabase.rpc(
      "super_admin_platform_health",
    );

    if (error) {
      console.error("Falha no diagnóstico da plataforma:", error);
      setHealth(null);
      setErrorMessage(
        "O diagnóstico remoto ainda não está disponível. Isto normalmente significa que a migration de saúde ainda não foi aplicada no Supabase remoto ou que a sessão não é de Super Administrador.",
      );
      setChecking(false);
      return;
    }

    setHealth(data as RuntimeHealth);
    setChecking(false);
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const items = useMemo<HealthItem[]>(() => {
    const runtimeUnavailable = health === null;

    return [
      {
        name: "Aplicação web",
        description:
          "Interface React/TanStack Router, rotas internas e build da aplicação.",
        status: "ok",
        detail:
          "O repositório possui workflow de validação com auditoria de rotas, TypeScript e build.",
        icon: <Activity />,
      },
      {
        name: "Supabase e autenticação",
        description:
          "Cliente Supabase, sessão autenticada e perfis institucionais.",
        status:
          sessionOk === true
            ? "ok"
            : sessionOk === false
              ? "attention"
              : "external",
        detail:
          sessionOk === true
            ? "Sessão autenticada detectada neste navegador."
            : "Não foi possível confirmar uma sessão autenticada activa.",
        icon: <KeyRound />,
      },
      {
        name: "Base de dados crítica",
        description:
          "Tabelas essenciais para municípios, perfis, veículos, registos, fiscalização, financeiro e licenças.",
        status:
          health?.database.ok
            ? "ok"
            : runtimeUnavailable
              ? "external"
              : "attention",
        detail: health
          ? health.database.present_tables +
            " de " +
            health.database.required_tables +
            " tabelas críticas detectadas."
          : "Aguardando diagnóstico do Supabase remoto.",
        icon: <Database />,
      },
      {
        name: "RLS e isolamento",
        description:
          "Row Level Security e políticas de acesso por perfil e município.",
        status:
          health?.rls.ok
            ? "ok"
            : runtimeUnavailable
              ? "external"
              : "attention",
        detail: health
          ? health.rls.enabled_tables +
            " de " +
            health.rls.required_tables +
            " tabelas críticas com RLS activo · " +
            health.rls.policy_count +
            " políticas detectadas."
          : "Aguardando diagnóstico do Supabase remoto.",
        icon: <ShieldCheck />,
      },
      {
        name: "Storage de documentos",
        description:
          "Bucket privado para documentos e evidências institucionais.",
        status:
          health?.storage.ok
            ? "ok"
            : runtimeUnavailable
              ? "external"
              : "attention",
        detail: health
          ? health.storage.private_bucket_exists
            ? "Bucket privado " + health.storage.bucket + " detectado."
            : "Bucket privado não encontrado no ambiente remoto."
          : "A migration de Storage existe no repositório; o remoto ainda precisa ser confirmado.",
        icon: <HardDrive />,
      },
      {
        name: "Operações financeiras",
        description:
          "Cobranças, pagamentos, recibos, isenções e reembolsos transaccionais.",
        status:
          health?.features.finance
            ? "ok"
            : runtimeUnavailable
              ? "external"
              : "attention",
        detail: health?.features.finance
          ? "RPCs financeiras críticas detectadas."
          : "As RPCs estão no repositório, mas o ambiente remoto ainda precisa ser confirmado.",
        icon: <Database />,
      },
      {
        name: "Licenciamento",
        description:
          "Planos, limites, módulos, suspensão, renovação e enforcement no servidor.",
        status:
          health?.features.licenses
            ? "ok"
            : runtimeUnavailable
              ? "external"
              : "attention",
        detail: health?.features.licenses
          ? "Operações e enforcement de licenças detectados."
          : "A camada de licenças está no repositório, mas o remoto ainda precisa ser confirmado.",
        icon: <ShieldCheck />,
      },
      {
        name: "Taxistas, condutores e multas",
        description:
          "Numeração, registo de condutores e emissão transaccional de multas.",
        status:
          health?.features.drivers_and_fines
            ? "ok"
            : runtimeUnavailable
              ? "external"
              : "attention",
        detail: health?.features.drivers_and_fines
          ? "RPCs de condutores e multas detectadas."
          : "A camada está implementada no repositório; falta confirmar o remoto.",
        icon: <Activity />,
      },
      {
        name: "Documentos e validação",
        description:
          "Metadados auditados, validação e armazenamento privado.",
        status:
          health?.features.documents
            ? "ok"
            : runtimeUnavailable
              ? "external"
              : "attention",
        detail: health?.features.documents
          ? "Storage e RPCs documentais detectados."
          : "A camada documental existe no repositório; falta confirmar o remoto.",
        icon: <HardDrive />,
      },
      {
        name: "Auditoria persistente",
        description:
          "Histórico municipal e global com consulta e exportação.",
        status:
          health?.features.audit
            ? "ok"
            : runtimeUnavailable
              ? "external"
              : "attention",
        detail: health?.features.audit
          ? "RPCs municipal e global de auditoria detectadas."
          : "A auditoria está implementada no código; falta confirmar o remoto.",
        icon: <FileCode2 />,
      },
      {
        name: "CI e validação automática",
        description:
          "Auditoria de rotas, type-check, Edge Functions e build no GitHub Actions.",
        status: "ok",
        detail:
          "Workflow de validação presente no repositório e utilizado nos commits desta auditoria.",
        icon: <FileCode2 />,
      },
      {
        name: "Testes de base de dados",
        description:
          "Estrutura pgTAP para validação de RLS e permissões.",
        status: "attention",
        detail:
          "Existe uma suíte estrutural inicial. Ainda faltam ampliar os testes de comportamento multi-tenant e fluxos críticos.",
        icon: <AlertTriangle />,
      },
      {
        name: "Integrações externas",
        description:
          "Pagamentos externos, serviços fiscais e outros provedores.",
        status: "external",
        detail:
          "Dependem de fornecedores e credenciais externas e não são verificáveis apenas pelo frontend.",
        icon: <Wifi />,
      },
    ];
  }, [health, sessionOk]);

  const counts = useMemo(
    () => ({
      ok: items.filter((item) => item.status === "ok").length,
      attention: items.filter((item) => item.status === "attention")
        .length,
      external: items.filter((item) => item.status === "external")
        .length,
    }),
    [items],
  );

  return (
    <SuperAdminShell
      title="Saúde da plataforma"
      subtitle="Diagnóstico técnico do ambiente MobiGest e do estado de preparação institucional."
    >
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500">
            Centro de controlo técnico
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Saúde da plataforma
          </h2>
        </div>

        <button
          type="button"
          disabled={checking}
          onClick={() => void runCheck()}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw
            className={
              "h-4 w-4 " + (checking ? "animate-spin" : "")
            }
          />
          {checking ? "A verificar..." : "Actualizar verificação"}
        </button>
      </div>

      <div
        className={
          "rounded-2xl border p-5 " +
          (health
            ? "border-emerald-100 bg-emerald-50"
            : "border-amber-100 bg-amber-50")
        }
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600">
            <HeartPulse className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-semibold text-slate-950">
              {health
                ? "Diagnóstico remoto concluído"
                : "Diagnóstico remoto ainda não confirmado"}
            </h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-700">
              {health
                ? "Os indicadores abaixo combinam verificações executadas no Supabase remoto com componentes confirmados no repositório."
                : "O código já contém as camadas de diagnóstico, mas esta sessão ainda não conseguiu executá-las no Supabase remoto. Nenhum estado remoto será presumido como concluído."}
            </p>

            {health?.checked_at && (
              <p className="mt-2 text-xs text-slate-500">
                Última verificação:{" "}
                {new Date(health.checked_at).toLocaleString("pt-MZ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          {errorMessage}
        </div>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Kpi
          icon={<CheckCircle2 />}
          value={String(counts.ok)}
          label="Verificados / implementados"
          tone="success"
        />
        <Kpi
          icon={<AlertTriangle />}
          value={String(counts.attention)}
          label="Requerem atenção"
          tone="warning"
        />
        <Kpi
          icon={<XCircle />}
          value={String(counts.external)}
          label="Externos / não confirmados"
          tone="neutral"
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <SuperCard className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="font-semibold">
              Componentes e verificações
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Estado real quando verificável; estado do repositório
              quando depende de aplicação de migrations.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div
                key={item.name}
                className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  {item.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold">
                      {item.name}
                    </h4>
                    <StatusBadge status={item.status} />
                  </div>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {item.description}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SuperCard>

        <div className="space-y-6">
          <SuperCard className="p-6">
            <h3 className="font-semibold">
              Checklist de produção
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              O estado só aparece como concluído quando há evidência
              suficiente nesta sessão ou no repositório.
            </p>

            <div className="mt-5 space-y-3">
              <CheckItem
                text="Cliente Supabase no frontend"
                done
              />
              <CheckItem
                text="Auth + perfis institucionais"
                done={sessionOk === true}
              />
              <CheckItem
                text="Modelo de dados crítico"
                done={health?.database.ok === true}
              />
              <CheckItem
                text="RLS nas tabelas críticas"
                done={health?.rls.ok === true}
              />
              <CheckItem
                text="Storage privado de documentos"
                done={health?.storage.ok === true}
              />
              <CheckItem
                text="Auditoria persistente"
                done={health?.features.audit === true}
              />
              <CheckItem
                text="Financeiro transaccional"
                done={health?.features.finance === true}
              />
              <CheckItem
                text="Licenciamento com enforcement"
                done={health?.features.licenses === true}
              />
              <CheckItem
                text="CI de frontend e Edge Functions"
                done
              />
              <CheckItem
                text="Testes multi-tenant completos"
                done={false}
              />
              <CheckItem
                text="Backup e restauração testados"
                done={false}
              />
            </div>
          </SuperCard>

          <SuperCard className="p-6">
            <h3 className="font-semibold">Atalhos técnicos</h3>
            <div className="mt-4 space-y-2">
              <Link
                to="/super-admin/auditoria"
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm font-medium hover:bg-slate-100"
              >
                Auditoria global
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/super-admin/licencas"
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm font-medium hover:bg-slate-100"
              >
                Licenças
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/super-admin/permissoes"
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm font-medium hover:bg-slate-100"
              >
                Perfis e permissões
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/super-admin/relatorios"
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm font-medium hover:bg-slate-100"
              >
                Relatórios globais
                <ExternalLink className="h-4 w-4 text-slate-400" />
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
            <h3 className="font-semibold">
              O que ainda impede chamar o produto de totalmente pronto
              para produção
            </h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">
              A aplicação já possui RLS, Storage privado, auditoria,
              operações transaccionais e CI no repositório. Ainda
              precisamos confirmar e aplicar todas as migrations no
              Supabase remoto, ampliar testes de comportamento
              multi-tenant e testar um procedimento real de backup e
              restauração. Integrações externas também devem ser
              validadas separadamente quando forem activadas.
            </p>
          </div>
        </div>
      </SuperCard>
    </SuperAdminShell>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "ok") {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        Verificado
      </span>
    );
  }

  if (status === "attention") {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
        Atenção
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
      Não confirmado
    </span>
  );
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
  tone: "success" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "warning"
        ? "bg-amber-50 text-amber-600"
        : "bg-slate-100 text-slate-600";

  return (
    <SuperCard className="p-5">
      <div
        className={
          "flex h-10 w-10 items-center justify-center rounded-xl " +
          toneClass
        }
      >
        {icon}
      </div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </SuperCard>
  );
}

function CheckItem({
  text,
  done,
}: {
  text: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
      <span
        className={
          done ? "text-emerald-500" : "text-slate-300"
        }
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <span className="block h-4 w-4 rounded-full border-2 border-current" />
        )}
      </span>
      <span
        className={
          done
            ? "text-sm text-slate-700"
            : "text-sm text-slate-500"
        }
      >
        {text}
      </span>
    </div>
  );
}
