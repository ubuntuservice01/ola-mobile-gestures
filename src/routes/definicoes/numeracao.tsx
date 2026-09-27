import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Hash, LockKeyhole, ShieldCheck } from "lucide-react";
import { MobiGestShell, PageHeader, Card } from "../../components/MobiGestShell";

export const Route = createFileRoute("/definicoes/numeracao")({ component: Numeracao });

function Numeracao() {
  return (
    <MobiGestShell title="Numeração" subtitle="Regra de geração dos números únicos MobiGest.">
      <PageHeader title="Numeração MobiGest" description="Formato e regras funcionais que serão implementados no Supabase." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6"><Hash className="h-5 w-5 text-sky-600" /><p className="mt-4 text-xs uppercase tracking-wide text-slate-400">Formato</p><p className="mt-1 text-2xl font-bold">MOBI-LIC-000001</p><p className="mt-2 text-sm text-slate-500">Prefixo + código do município + sequência.</p></Card>
        <Card className="p-6"><ShieldCheck className="h-5 w-5 text-emerald-600" /><p className="mt-4 text-xs uppercase tracking-wide text-slate-400">Âmbito</p><p className="mt-1 text-2xl font-bold">Por município</p><p className="mt-2 text-sm text-slate-500">Cada município mantém a sua própria sequência.</p></Card>
        <Card className="p-6"><LockKeyhole className="h-5 w-5 text-amber-600" /><p className="mt-4 text-xs uppercase tracking-wide text-slate-400">Atribuição</p><p className="mt-1 text-2xl font-bold">Após aprovação</p><p className="mt-2 text-sm text-slate-500">O número não é reservado no início do formulário.</p></Card>
      </div>
      <Card className="mt-6 p-6">
        <h3 className="font-bold">Regras definitivas</h3>
        <div className="mt-5 space-y-4">{[
          "O formato será MOBI-{CÓDIGO_MUNICÍPIO}-{SEQUÊNCIA_DE_6_DÍGITOS}.",
          "A sequência começa em 000001 para cada município.",
          "A sequência é única por município e não depende do tipo de veículo.",
          "O número só é atribuído quando o processo de registo é aprovado.",
          "Depois de atribuído, o número MobiGest é permanente e não muda por transferência, alteração de estado ou actualização de dados.",
          "Um número cancelado não volta a ser utilizado.",
          "A sequência nunca deve ser reiniciada anualmente.",
          "O código do município deve ser único no sistema e mantido em maiúsculas.",
          "A geração definitiva deverá ser atómica no servidor para impedir números duplicados quando existirem registos simultâneos.",
          "A base de dados terá uma restrição de unicidade para o número MobiGest."
        ].map(item=><div key={item} className="flex gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"/><span>{item}</span></div>)}</div>
      </Card>
      <Card className="mt-6 p-6">
        <h3 className="font-bold">Exemplo</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3"><Info label="1.º registo de LIC" value="MOBI-LIC-000001"/><Info label="1284.º registo de LIC" value="MOBI-LIC-001284"/><Info label="1.º registo de outro município" value="MOBI-XXX-000001"/></div>
        <p className="mt-4 text-xs leading-5 text-slate-500">O código LIC é apenas um exemplo de código municipal no protótipo. Na produção, cada município terá o seu código definido na configuração administrativa.</p>
      </Card>
    </MobiGestShell>
  );
}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-white border border-slate-200 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-800">{value}</p></div>}
