import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, FileText, Globe2, Lock, Settings2, ShieldCheck } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/configuracoes")({
  component: ConfiguracoesGlobais,
});

const items = [
  [Globe2, "Identidade da plataforma", "Nome, logótipo, contactos institucionais e parâmetros gerais.", "/super-admin/configuracoes"],
  [ShieldCheck, "Segurança e acesso", "Sessões, autenticação, políticas de acesso e requisitos de segurança.", "/super-admin/configuracoes"],
  [Database, "Dados e integração", "Estado da ligação ao Supabase, integrações e serviços externos.", "/super-admin/configuracoes"],
  [FileText, "Documentos e modelos", "Modelos globais de documentos, etiquetas e elementos de impressão.", "/definicoes/documentos"],
  [Lock, "Políticas do sistema", "Regras globais que não devem ser alteradas a nível municipal.", "/super-admin/configuracoes"],
  [Settings2, "Parâmetros avançados", "Configurações técnicas e operacionais da plataforma.", "/super-admin/configuracoes"],
];

function ConfiguracoesGlobais() {
  return (
    <SuperAdminShell title="Configurações" subtitle="Parâmetros globais do MobiGest, separados das configurações de cada município.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map(([Icon, title, description, to]) => (
          <Link key={title as string} to={to as string}>
            <SuperCard className="h-full p-6 transition hover:border-sky-200 hover:bg-sky-50/20">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-sm font-bold">{title as string}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description as string}</p>
            </SuperCard>
          </Link>
        ))}
      </div>

      <SuperCard className="mt-6 p-6">
        <h3 className="font-semibold">Separação global × municipal</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Global</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Identidade MobiGest, segurança, perfis, integrações, políticas e regras comuns.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Municipal</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Numeração, taxas, estrutura territorial, documentos exigidos e parâmetros operacionais.
            </p>
          </div>
        </div>
      </SuperCard>
    </SuperAdminShell>
  );
}
