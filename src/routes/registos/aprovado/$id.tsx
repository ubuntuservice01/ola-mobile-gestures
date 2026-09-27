import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, Printer, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";

export const Route = createFileRoute("/registos/aprovado/$id")({ component: RegistoAprovado });

function RegistoAprovado() {
  const { id } = Route.useParams();
  const municipioCodigo = "LIC"; // código municipal usado apenas no protótipo
  const sequencia = id.replace(/\D/g, "").padStart(6, "0");
  const codigo = "MOBI-" + municipioCodigo + "-" + sequencia;
  const consulta = "/consulta/" + codigo;
  const qrValue = typeof window !== "undefined" ? window.location.origin + "/q/" + codigo : "/q/" + codigo;

  return (
    <MobiGestShell title="Registo MobiGest" subtitle="Registo aprovado e pronto para identificação do veículo">
      <Link to="/registos" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600">
        <ArrowLeft className="h-4 w-4" /> Voltar aos registos
      </Link>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-5 w-5" /><span className="text-sm font-semibold">Registo aprovado</span></div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{codigo}</h2>
                <p className="mt-1 text-sm text-slate-500">Número único de identificação MobiGest · município LIC</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Activo</span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[["Tipo de veículo","Motorizada"],["Proprietário","João Manuel"],["Marca / modelo","Honda CG 125"],["Chassis / quadro","CHS-••••••••"],["Município","Município"],["Data de emissão","26/09/2026"]].map(([label,value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/imprimir/qr/$id" params={{ id }} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700"><Printer className="h-4 w-4" /> Imprimir QR Code</Link>
              <Link to="/imprimir/veiculo/$id" params={{ id }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"><Printer className="h-4 w-4" /> Imprimir registo</Link>
              <Link to="/consulta/$codigo" params={{ codigo }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"><ExternalLink className="h-4 w-4" /> Consulta pública</Link>
            </div>
          </Card>

          <Card className="p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><QrCode className="h-5 w-5" /></div>
              <div><h3 className="font-bold">QR Code do veículo</h3><p className="text-sm text-slate-500">O código deverá abrir a consulta pública deste registo.</p></div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
              <div className="flex aspect-square items-center justify-center rounded-2xl border-2 border-slate-200 bg-white p-5">
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({length:49},(_,i)=><span key={i} className={`h-4 w-4 rounded-[2px] ${(i*17+i%5)%7<3 ? "bg-slate-900" : "bg-white"}`}/>)}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Código</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{codigo}</p>
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="flex-1 break-all">{consulta}</span>
                  <button className="rounded-lg p-2 hover:bg-white" title="Copiar"><Copy className="h-4 w-4" /></button>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">O QR Code abre directamente a consulta pública deste registo. A página pública apresenta apenas os dados necessários para confirmar a autenticidade do registo.</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-bold">Fluxo concluído</h3>
            <div className="mt-5 space-y-4">
              {["Veículo registado","Documentos apresentados","Documentos validados","Registo aprovado","Número MobiGest atribuído","QR Code associado"].map((item,i)=><div key={item} className="flex items-center gap-3"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-4 w-4"/></div><div><p className="text-sm font-semibold">{item}</p><p className="text-xs text-slate-400">{i<3?"Concluído":"Gerado no processo de aprovação"}</p></div></div>)}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold">Consulta pública</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Qualquer pessoa poderá confirmar a autenticidade do registo através do QR Code ou do número MobiGest, sem expor dados pessoais desnecessários.</p>
            <Link to="/consulta/$codigo" params={{ codigo }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700">Abrir consulta <ExternalLink className="h-4 w-4"/></Link>
          </Card>
        </div>
      </div>
    </MobiGestShell>
  );
}
