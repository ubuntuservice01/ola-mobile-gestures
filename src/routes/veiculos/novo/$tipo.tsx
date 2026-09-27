import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, MapPin, UserRound, Bike, CarFront, Plus, Trash2 } from "lucide-react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";

export const Route = createFileRoute("/veiculos/novo/$tipo")({ component: RegistoVeiculo });

const labels: Record<string,string> = { motorizada:"Motorizada", carro:"Carro", bicicleta:"Bicicleta" };

function RegistoVeiculo() {
  const { tipo } = Route.useParams();
  const nome = labels[tipo] ?? "Veículo";
  const Icon = tipo === "carro" ? CarFront : Bike;
  const [contactos, setContactos] = useState([{ id: 1 }]);

  return <MobiGestShell title={`Registar ${nome}`} subtitle="Processo de registo municipal">
    <div className="mx-auto max-w-5xl">
      <Link to="/veiculos/novo" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Alterar tipo</Link>

      <div className="mb-8 flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Icon className="h-6 w-6"/></span>
        <div><h2 className="text-2xl font-bold">Novo registo de {nome.toLowerCase()}</h2><p className="mt-1 text-sm text-slate-500">Preencha as etapas. O número MobiGest será atribuído após a confirmação.</p></div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-2">
        {["Proprietário","Veículo","Localização","Confirmação"].map((step,i)=><div key={step} className="rounded-xl border border-slate-200 bg-white p-3"><div className={`text-xs font-bold ${i===0?"text-sky-600":"text-slate-400"}`}>0{i+1}</div><div className="mt-1 text-xs font-semibold text-slate-700">{step}</div></div>)}
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <Section icon={<UserRound/>} title="1. Proprietário" text="Identificação do proprietário responsável pelo veículo."/>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Nome completo" placeholder="Nome do proprietário" required/><Field label="Tipo de documento" placeholder="BI / DIRE / Passaporte" required/>
            <Field label="Número do documento" placeholder="Número do documento" required/><Field label="Telefone" placeholder="+258 ..." required/>
            <Field label="NUIT" placeholder="Opcional"/><Field label="Morada" placeholder="Bairro, avenida ou localidade" required/>
          </div>
        </Card>

        <div className="mt-7 border-t border-slate-100 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-800">Contactos adicionais</h3>
              <p className="mt-1 text-sm text-slate-500">Pessoas que podem ser contactadas sobre este registo. Não são proprietários.</p>
            </div>
            <button type="button" onClick={() => setContactos(items => [...items, { id: Date.now() }])} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-600">
              <Plus className="h-4 w-4"/> Adicionar contacto
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {contactos.map((contacto, index) => (
              <div key={contacto.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Contacto {index + 1}</p>
                  {contactos.length > 1 && (
                    <button type="button" onClick={() => setContactos(items => items.filter(item => item.id !== contacto.id))} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5"/> Remover
                    </button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome completo" placeholder="Nome da pessoa de contacto"/>
                  <Field label="Relação com o proprietário" placeholder="Cônjuge, familiar, representante, condutor..."/>
                  <Field label="Contacto principal" placeholder="+258 ..."/>
                  <Field label="Contacto alternativo" placeholder="+258 ... (opcional)"/>
                  <div className="md:col-span-2"><Field label="Observação" placeholder="Informação adicional sobre este contacto"/></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

        <Card className="p-6">
          <Section icon={<Icon/>} title={`2. Dados da ${nome.toLowerCase()}`} text="Dados técnicos e de identificação."/>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Marca" placeholder="Marca" required/><Field label="Modelo" placeholder="Modelo" required/>
            <Field label="Ano de fabrico" placeholder="AAAA"/><Field label="Cor" placeholder="Cor" required/>
            <Field label={tipo==="bicicleta" ? "Número do quadro" : "Número de chassis"} placeholder="Número de identificação" required/>
            {tipo !== "bicicleta" && <Field label="Número do motor" placeholder="Número do motor"/>}
            {tipo !== "bicicleta" && <Field label="Matrícula" placeholder="Se aplicável"/>}
            <Field label="Observações" placeholder="Informação adicional"/>
          </div>
        </Card>

        <Card className="p-6">
          <Section icon={<MapPin/>} title="3. Localização administrativa" text="Indique onde o veículo está registado."/>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Município" placeholder="Seleccionar município" required/><Field label="Posto administrativo" placeholder="Seleccionar posto" required/>
            <Field label="Localidade/Bairro" placeholder="Localidade ou bairro"/>
          </div>
        </Card>

        <Card className="p-6">
          <Section icon={<FileText/>} title="4. Documentação" text="Documentos associados ao registo."/>
          <div className="mt-5 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <FileText className="mx-auto h-7 w-7 text-slate-400"/><p className="mt-3 text-sm font-medium">Adicionar documentos</p>
            <p className="mt-1 text-xs text-slate-400">Documento de identificação, documento do veículo, fotografia e outros comprovativos.</p>
            <button type="button" className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Seleccionar ficheiros</button>
          </div>
        </Card>

        <Card className="border-sky-100 bg-sky-50/40 p-6">
          <Section icon={<CheckCircle2/>} title="5. Confirmação" text="Depois da confirmação, o sistema poderá atribuir o número MobiGest e preparar o QR Code."/>
          <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600"><strong>Estado inicial:</strong> Pendente de validação.</div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">Guardar registo <ArrowRight className="h-4 w-4"/></button>
            <Link to="/veiculos" className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700">Cancelar</Link>
          </div>
        </Card>
      </div>
    </div>
  </MobiGestShell>;
}

function Section({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</span><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-500">{text}</p></div></div>}
function Field({label,placeholder,required}:{label:string;placeholder:string;required?:boolean}){return <label className="text-sm font-medium text-slate-700">{label}{required&&<span className="ml-1 text-sky-600">*</span>}<input placeholder={placeholder} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"/></label>}
