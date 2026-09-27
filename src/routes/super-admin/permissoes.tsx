import { createFileRoute } from "@tanstack/react-router";
import { Check, ShieldCheck } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/permissoes")({
  component: PermissoesGlobais,
});

const profiles = [
  ["Super Administrador", "Plataforma inteira", "Todas as áreas e municípios"],
  ["Administrador Municipal", "Município atribuído", "Gestão operacional do município"],
  ["Técnico", "Município / posto", "Registos, documentos e validação"],
  ["Fiscal", "Município / posto", "Consulta e fiscalização"],
  ["Financeiro", "Município", "Taxas, cobranças e pagamentos"],
];

const permissions = [
  ["Municípios", "Gerir", "Consultar", "—", "—", "—"],
  ["Utilizadores", "Gerir", "Gerir no município", "—", "—", "—"],
  ["Veículos", "Gerir", "Gerir no município", "Editar", "Consultar", "Consultar"],
  ["Registos", "Gerir", "Gerir", "Editar", "Consultar", "Consultar"],
  ["Fiscalização", "Gerir", "Consultar", "Registar", "Registar", "Consultar"],
  ["Financeiro", "Gerir", "Consultar", "—", "—", "Gerir"],
  ["Relatórios", "Gerir", "Gerir no município", "Consultar", "Consultar", "Consultar"],
  ["Auditoria", "Gerir", "Consultar no município", "Consultar", "Consultar", "Consultar"],
  ["Configurações", "Gerir", "Gerir no município", "—", "—", "—"],
];

function PermissoesGlobais() {
  return (
    <SuperAdminShell title="Perfis e permissões" subtitle="Modelo global de autorização que será aplicado ao MobiGest.">
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {profiles.map(([name, scope, description]) => (
          <SuperCard key={name} className="p-5">
            <ShieldCheck className="h-5 w-5 text-sky-600" />
            <h3 className="mt-3 text-sm font-bold">{name}</h3>
            <p className="mt-2 text-xs font-semibold text-slate-500">{scope}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          </SuperCard>
        ))}
      </div>

      <SuperCard className="overflow-x-auto">
        <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Módulo</th>
              {profiles.map(([name]) => <th key={name} className="px-5 py-4">{name}</th>)}
            </tr>
          </thead>
          <tbody>
            {permissions.map(([module, ...values]) => (
              <tr key={module} className="border-t border-slate-100">
                <td className="px-5 py-4 font-semibold">{module}</td>
                {values.map((value, index) => (
                  <td key={index} className="px-5 py-4">
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
      </SuperCard>

      <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <b>Segurança:</b> esta matriz define a regra funcional. A aplicação real deverá combinar Supabase Auth, funções/RBAC e RLS para impedir acesso fora do âmbito autorizado.
      </div>
    </SuperAdminShell>
  );
}
