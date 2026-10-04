import { createFileRoute } from "@tanstack/react-router";
import { Check, Globe2, ShieldCheck } from "lucide-react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";

export const Route = createFileRoute("/permissoes")({ component: Permissoes });

const rows = [
  ["Dashboard", "consultar", "consultar", "consultar", "consultar", "consultar"],
  ["Veículos", "gerir", "gerir", "consultar/editar", "consultar", "consultar"],
  ["Proprietários", "gerir", "gerir", "consultar", "consultar", "consultar"],
  ["Registos", "gerir", "gerir", "consultar/editar", "consultar", "consultar"],
  ["Validação", "gerir", "validar", "—", "—", "—"],
  ["Documentos", "gerir", "gerir", "consultar/validar", "consultar", "consultar"],
  ["Fiscalização", "gerir", "consultar", "registar/editar", "consultar", "consultar"],
  ["Multas", "gerir", "gerir tipos/consultar", "registar/consultar", "gerir pagamentos", "consultar"],
  ["Transferências", "gerir", "aprovar", "consultar", "—", "consultar"],
  ["Financeiro", "gerir", "consultar", "—", "gerir", "consultar"],
  ["Relatórios", "gerir", "gerir", "consultar", "consultar", "consultar"],
  ["Utilizadores", "gerir", "gerir no município", "—", "—", "—"],
  ["Municípios", "gerir", "consultar o próprio", "consultar", "—", "—"],
  ["Postos administrativos", "gerir", "gerir no município", "consultar", "consultar", "consultar"],
  ["Definições", "gerir", "gerir no município", "—", "—", "—"],
  ["Auditoria", "consultar/gerir", "consultar no município", "consultar", "consultar", "consultar"],
];

const profiles = ["Super Administrador", "Administrador Municipal", "Técnico", "Fiscal", "Financeiro"];

function Permissoes() {
  return (
    <MobiGestShell title="Permissões" subtitle="Perfis, âmbito de acesso e operações autorizadas no MobiGest.">
      <PageHeader title="Perfis e permissões" description="As permissões serão aplicadas por perfil e limitadas ao município do utilizador quando aplicável." />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Super Administrador", "Acesso global ao MobiGest e à configuração de municípios."],
          ["Administrador Municipal", "Gere a operação do seu município e os utilizadores desse município."],
          ["Técnico", "Regista, actualiza e valida processos dentro do âmbito autorizado."],
          ["Fiscal", "Consulta veículos e regista actos de fiscalização."],
          ["Financeiro", "Gere taxas, pagamentos e informação financeira."],
        ].map(([name, description]) => (
          <Card key={name} className="p-5">
            <ShieldCheck className="h-5 w-5 text-sky-600" />
            <h3 className="mt-3 text-sm font-bold">{name}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Módulo / operação</th>
              {profiles.map((profile) => <th key={profile} className="px-5 py-4">{profile}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([module, ...values]) => (
              <tr className="border-t border-slate-100" key={module}>
                <td className="px-5 py-4 font-semibold text-slate-700">{module}</td>
                {values.map((value, index) => (
                  <td key={index} className="px-5 py-4 align-top">
                    {value === "—" ? <span className="text-slate-300">—</span> : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <Check className="h-4 w-4 text-emerald-500" />{value}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800">
          <Globe2 className="mr-2 inline h-4 w-4" />
          <b>Âmbito:</b> o Super Administrador trabalha globalmente. Os restantes perfis ficam limitados ao município e, quando definido, ao posto administrativo atribuído.
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          <ShieldCheck className="mr-2 inline h-4 w-4" />
          <b>Segurança:</b> a matriz visual é a referência funcional. No Supabase, o controlo efectivo será feito com Auth, RLS e regras de autorização no servidor.
        </div>
      </div>
    </MobiGestShell>
  );
}
