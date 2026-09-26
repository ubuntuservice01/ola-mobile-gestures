import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CarFront, Edit3, FileText, History, MapPin, Printer, QrCode, ShieldAlert, UserRound } from "lucide-react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";

export const Route = createFileRoute("/veiculos/$id")({ component: Detalhe });

function Detalhe() {
  const { id } = Route.useParams();
  return <MobiGestShell title="Detalhes do veículo" subtitle="Ficha completa e situação actual">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Link to="/veiculos" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Voltar aos veículos</Link>
      <div className="flex flex-wrap gap-2"><Link to="/veiculos/$id/estado" params={{id}} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700">Alterar estado</Link><Link to="/imprimir/veiculo/$id" params={{id}} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"><Printer className="h-4 w-4"/>Imprimir ficha</Link><button className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"><Edit3 className="h-4 w-4"/>Editar</button></div>
    </div>

    <Card className="overflow-hidden">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
        <div><p className="text-sm text-slate-400">Número MobiGest</p><h2 className="mt-1 text-3xl font-bold text-sky-700">{id}</h2><p className="mt-1 text-sm text-slate-500">Motorizada · Município de Lichinga</p></div>
        <div className="flex flex-wrap gap-2"><span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">Activa</span><span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">Registo válido</span></div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px]">
        <div>
          <SectionTitle title="Dados do veículo" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{[
            ["Tipo","Motorizada"],["Marca","Honda"],["Modelo","CB 125"],["Ano","2025"],["Cor","Preta"],["Chassis","HND-125-45821"],["Motor","CB125-88421"],["Matrícula","LIC-MC-25-18"]
          ].map(([a,b])=><Info key={a} label={a} value={b}/>)}</div>

          <SectionTitle title="Localização administrativa" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><Info label="Município" value="Lichinga"/><Info label="Posto administrativo" value="Chiuaula"/><Info label="Localidade/Bairro" value="Centro"/><Info label="Data de registo" value="26 Setembro 2026"/></div>

          <SectionTitle title="Proprietário" />
          <Link to="/proprietarios/$id" params={{id:"Alberto Manuel"}} className="mt-4 flex items-center gap-4 rounded-xl border border-slate-200 p-4 hover:border-sky-200"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-600"><UserRound/></div><div><p className="font-semibold">Alberto Manuel</p><p className="text-sm text-slate-500">BI 11020345LA · +258 84 000 0000</p></div></Link>

          <SectionTitle title="Documentação" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{["Documento de identificação","Documento do veículo","Fotografia do veículo"].map(x=><div key={x} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><FileText className="h-5 w-5 text-slate-400"/><span className="text-sm font-medium">{x}</span><span className="ml-auto text-xs font-semibold text-emerald-600">Disponível</span></div>)}</div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-6 text-center"><QrCode className="mx-auto h-36 w-36 text-slate-800"/><p className="mt-4 font-bold">{id}</p><p className="mt-1 text-xs text-slate-500">QR Code de identificação pública</p><Link to="/imprimir/qr/$id" params={{id}} className="mt-5 block rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Imprimir QR Code</Link></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><ShieldAlert className="h-5 w-5 shrink-0 text-amber-600"/><div><p className="text-sm font-semibold text-amber-900">Situação actual</p><p className="mt-1 text-xs leading-5 text-amber-800">Este veículo está activo. Alterações de estado ficam registadas no histórico.</p></div></div></div>
          <Link to="/fiscalizacao/nova" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-sky-200"><MapPin className="h-5 w-5 text-sky-600"/><span><b className="block text-sm">Fiscalização</b><small className="text-xs text-slate-400">Registar ocorrência</small></span></Link>
        </aside>
      </div>

      <div className="border-t border-slate-100 p-6"><div className="flex flex-wrap gap-5"><Link to="/veiculos/$id/historico" params={{id}} className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700"><History className="h-4 w-4"/>Histórico de estados</Link><Link to="/veiculos/$id/transferir" params={{id}} className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700"><UserRound className="h-4 w-4"/>Transferir propriedade</Link></div></div>
    </Card>
  </MobiGestShell>;
}
function SectionTitle({title}:{title:string}){return <h3 className="mt-8 font-semibold first:mt-0">{title}</h3>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-700">{value}</p></div>}
