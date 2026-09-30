import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, FileCheck2, QrCode, XCircle } from "lucide-react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";

export const Route = createFileRoute("/registos/validacao")({ component: ValidacaoRegisto });

const documentos = [
  ["Documento de identificação do proprietário", "Apresentado", true],
  ["Documento/título do veículo ou comprovativo de propriedade", "Apresentado", true],
  ["Fotografia do veículo", "Apresentada", true],
  ["Comprovativo de aquisição/propriedade", "Pendente", false],
] as const;

function ValidacaoRegisto() {
  return (
    <MobiGestShell title="Validação de registo" subtitle="Verificar os documentos antes da emissão do registo MobiGest">
      <Link to="/registos" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600">
        <ArrowLeft className="h-4 w-4" /> Voltar aos registos
      </Link>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Registo em análise</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">REG-2026-001284</h2>
                <p className="mt-1 text-sm text-slate-500">Motorizada · Proprietário: João Manuel</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">Pendente de validação</span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ["Tipo", "Motorizada"],
                ["Município", "Município"],
                ["Posto administrativo", "Posto administrativo"],
                ["Data de submissão", "26/09/2026"],
                ["Marca / modelo", "Honda · CG 125"],
                ["Chassis / quadro", "CHS-••••••••"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><FileCheck2 className="h-5 w-5" /></div>
              <div>
                <h3 className="font-bold text-slate-900">Documentos apresentados</h3>
                <p className="text-sm text-slate-500">Confirme cada documento antes de concluir a validação.</p>
              </div>
            </div>
            <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {documentos.map(([nome, estado, valido]) => (
                <div key={nome} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-semibold">{nome}</p>
                    <p className="text-xs text-slate-500">{estado}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> {valido ? "Verificado" : "Pendente"}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold">Decisão da validação</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Link to="/registos/aprovado/$id" params={{ id: "1284" }} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left hover:border-emerald-400">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="mt-2 text-sm font-semibold">Aprovar</p>
                <p className="mt-1 text-xs text-slate-500">Permitir a emissão do registo MobiGest.</p>
              </Link>
              <Link to="/registos/correcao/$id" params={{ id: "1284" }} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left hover:border-amber-400">
                <FileCheck2 className="h-5 w-5 text-amber-600" />
                <p className="mt-2 text-sm font-semibold">Solicitar correcção</p>
                <p className="mt-1 text-xs text-slate-500">Devolver o processo para completar informação.</p>
              </Link>
              <Link to="/registos/rejeitado/$id" params={{ id: "1284" }} className="rounded-xl border border-red-200 bg-red-50 p-4 text-left hover:border-red-400">
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="mt-2 text-sm font-semibold">Rejeitar</p>
                <p className="mt-1 text-xs text-slate-500">Registar a razão da rejeição.</p>
              </Link>
            </div>
            <label className="mt-5 block text-sm font-medium">Observação da decisão
              <textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-sky-500" placeholder="Registe a fundamentação ou observação..." />
            </label>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><QrCode className="h-5 w-5" /></div>
            <h3 className="mt-4 font-bold">Após aprovação</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">O sistema deverá gerar automaticamente o número MobiGest e associar o QR Code ao registo aprovado.</p>
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
              <p className="text-xs text-slate-400">Exemplo</p>
              <p className="mt-1 font-bold text-slate-800">MOBI-000001</p>
              <p className="mt-1 text-xs text-slate-500">QR Code associado ao registo</p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold">Histórico da validação</h3>
            <div className="mt-5 space-y-4 text-sm">
              <div className="border-l-2 border-sky-200 pl-4"><p className="font-semibold">Processo submetido</p><p className="text-xs text-slate-500">26/09/2026 · Sistema</p></div>
              <div className="border-l-2 border-slate-200 pl-4"><p className="font-semibold">Aguardando validação</p><p className="text-xs text-slate-500">Estado actual</p></div>
            </div>
          </Card>
        </div>
      </div>
    </MobiGestShell>
  );
}
