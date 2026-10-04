import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  ClipboardCheck,
  FileText,
  Hash,
  MapPinned,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  MobiGestShell,
  PageHeader,
  Card,
} from "../components/MobiGestShell";

export const Route = createFileRoute("/definicoes")({
  component: DefRouteBoundary,
});

const items = [
  {
    Icon: Hash,
    title: "Numeração",
    desc: "Estado e regra real da sequência MobiGest do município.",
    to: "/definicoes/numeracao",
  },
  {
    Icon: Wallet,
    title: "Taxas municipais",
    desc: "Serviços, valores, vigência e regras de isenção.",
    to: "/definicoes/taxas",
  },
  {
    Icon: FileText,
    title: "Requisitos documentais",
    desc: "Documentos obrigatórios e configuráveis por tipo de veículo.",
    to: "/definicoes/documentos",
  },
  {
    Icon: MapPinned,
    title: "Estrutura territorial",
    desc: "Postos administrativos e localidades do município.",
    to: "/postos-administrativos",
  },
  {
    Icon: Bell,
    title: "Notificações",
    desc: "Alertas persistentes da sua conta e acontecimentos operacionais.",
    to: "/notificacoes",
  },
  {
    Icon: ShieldCheck,
    title: "Perfis e permissões",
    desc: "Consultar a matriz RBAC efectiva aplicada pelo servidor.",
    to: "/permissoes",
  },
  {
    Icon: ClipboardCheck,
    title: "Auditoria municipal",
    desc: "Histórico imutável das acções realizadas no município.",
    to: "/auditoria",
  },
];

function Def() {
  return (
    <MobiGestShell title="Definições">
      <PageHeader
        title="Definições"
        description="Configuração e controlo do funcionamento municipal do MobiGest."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {items.map(({ Icon, title, desc, to }) => (
          <Link to={to} key={title}>
            <Card className="flex h-full items-center gap-4 p-5 transition hover:border-sky-200 hover:bg-sky-50/30">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {desc}
                </p>
                <p className="mt-2 text-xs font-semibold text-sky-700">
                  Abrir →
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500">
        As definições globais da plataforma são exclusivas do Super
        Administrador. Esta área contém apenas configuração e
        informação do município actual.
      </div>
    </MobiGestShell>
  );
}

function DefRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/definicoes">
      <Def />
    </RouteIndexBoundary>
  );
}
