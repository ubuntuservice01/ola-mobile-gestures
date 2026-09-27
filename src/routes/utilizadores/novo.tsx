import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Save, ShieldCheck } from "lucide-react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";

export const Route = createFileRoute("/utilizadores/novo")({ component: NovoUtilizador });

const profiles = [
  ["Super Administrador", "Acesso global ao sistema."],
  ["Administrador Municipal", "Gestão completa do município atribuído."],
  ["Técnico", "Registo, actualização e validação de processos."],
  ["Fiscal", "Consulta e fiscalização de veículos."],
  ["Financeiro", "Taxas, pagamentos e informação financeira."],
];

function NovoUtilizador() {
  return (
    <MobiGestShell title="Novo utilizador" subtitle="Criar uma conta e definir o âmbito de acesso.">
      <Link to="/utilizadores" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600">
        <ArrowLeft className="h-4 w-4" /> Utilizadores
      </Link>

      <Card className="mx-auto max-w-4xl p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><ShieldCheck /></div>
          <div>
            <h2 className="text-xl font-bold">Criar utilizador</h2>
            <p className="mt-1 text-sm text-slate-500">O perfil determina as operações que poderá executar no MobiGest.</p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {["Nome completo", "Email", "Telefone"].map((label) => (
            <label className="text-sm font-medium" key={label}>
              {label}
              <input className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500" />
            </label>
          ))}

          <label className="text-sm font-medium">
            Perfil
            <select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500">
              {profiles.map(([name]) => <option key={name}>{name}</option>)}
            </select>
          </label>

          <label className="text-sm font-medium">
            Município
            <select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500">
              <option>Seleccione o município</option>
              <option>Município</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Posto administrativo
            <select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500">
              <option>Todos / não definido</option>
              <option>Chiuaula</option>
              <option>Massenger</option>
              <option>Meponda</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Estado
            <select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500">
              <option>Activo</option>
              <option>Suspenso</option>
            </select>
          </label>
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          <b>Regra de âmbito:</b> o Super Administrador não fica limitado a um município. Os outros perfis devem ter município atribuído; o posto administrativo pode restringir ainda mais o acesso quando essa regra for aplicável.
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <Link to="/utilizadores" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold">Cancelar</Link>
          <button className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">
            <Save className="h-4 w-4" /> Criar utilizador
          </button>
        </div>
      </Card>
    </MobiGestShell>
  );
}
