import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Mail, Phone, Send } from "lucide-react";
import { PageHero, PublicLayout } from "../components/public/PublicSite";
import { company } from "../config/company";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/contacto")({
  head: () => ({ meta:[{title:"Contacto | MobiGest"},{name:"description",content:"Solicite uma demonstração do MobiGest ou fale com a equipa responsável pela plataforma."}] }),
  component: ContactPage,
});

const subjects=["Solicitar demonstração","Solicitar proposta","Implementação municipal","Suporte","Parceria","Outro"] as const;

function ContactPage(){
 const [form,setForm]=useState({full_name:"",institution:"",role_title:"",phone:"",email:"",subject:"Solicitar demonstração",message:"",website:""});
 const [status,setStatus]=useState<"idle"|"loading"|"success"|"error">("idle");
 const [feedback,setFeedback]=useState("");

 useEffect(()=>{
  const param=new URLSearchParams(window.location.search).get("assunto");
  if(param==="demonstracao") setForm(v=>({...v,subject:"Solicitar demonstração"}));
 },[]);

 const update=(key:keyof typeof form,value:string)=>setForm(v=>({...v,[key]:value}));

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(status==="loading") return;
  setFeedback("");
  if(form.full_name.trim().length<2||form.institution.trim().length<2||form.phone.trim().length<7||form.subject.trim().length<2||form.message.trim().length<10){
   setStatus("error"); setFeedback("Preencha os campos obrigatórios e escreva uma mensagem com pelo menos 10 caracteres."); return;
  }
  setStatus("loading");
  const {data,error}=await supabase.functions.invoke("public-contact",{body:form});
  if(error||!data?.received){
   setStatus("error"); setFeedback("Não foi possível enviar a mensagem neste momento. Pode contactar-nos directamente por telefone ou email."); return;
  }
  setStatus("success");
  setFeedback(data.emailSent ? "Mensagem enviada com sucesso. A equipa do MobiGest recebeu o seu pedido." : "Mensagem recebida e registada com sucesso. A equipa do MobiGest dará seguimento ao seu pedido.");
  setForm(v=>({...v,full_name:"",institution:"",role_title:"",phone:"",email:"",message:"",website:""}));
 }

 return <PublicLayout><main>
  <PageHero title="Vamos conversar sobre a mobilidade do seu município?">Solicite uma demonstração, apresente as necessidades da sua instituição ou fale diretamente com a equipa responsável pelo MobiGest.</PageHero>
  <section className="mx-auto grid max-w-7xl gap-8 px-6 py-20 lg:grid-cols-[.72fr_1.28fr] lg:px-10">
   <aside className="space-y-4">
    <ContactCard icon={<Phone className="h-5 w-5"/>} label="Telefone" value={company.phone} href={company.phoneHref}/>
    <ContactCard icon={<Mail className="h-5 w-5"/>} label="Email" value={company.email} href={"mailto:"+company.email}/>
    <div className="rounded-2xl border border-slate-200 bg-[#0B172A] p-7 text-white">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Demonstração institucional</p>
      <h2 className="font-display mt-3 text-2xl font-bold">Veja o MobiGest aplicado ao fluxo do seu município.</h2>
      <p className="mt-4 text-sm leading-7 text-slate-300">Apresente-nos a estrutura, os processos actuais e as prioridades da sua instituição. A demonstração pode ser orientada para os módulos mais relevantes.</p>
    </div>
   </aside>

   <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
    <div className="mb-8"><h2 className="font-display text-2xl font-bold">Enviar mensagem</h2><p className="mt-2 text-sm leading-6 text-slate-500">Os campos com * são obrigatórios.</p></div>
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <Field label="Nome completo *"><input required value={form.full_name} onChange={e=>update("full_name",e.target.value)} className="public-input" autoComplete="name"/></Field>
      <Field label="Instituição / Município *"><input required value={form.institution} onChange={e=>update("institution",e.target.value)} className="public-input"/></Field>
      <Field label="Cargo / Função"><input value={form.role_title} onChange={e=>update("role_title",e.target.value)} className="public-input"/></Field>
      <Field label="Telefone *"><input required value={form.phone} onChange={e=>update("phone",e.target.value)} className="public-input" inputMode="tel" autoComplete="tel"/></Field>
      <Field label="Email"><input type="email" value={form.email} onChange={e=>update("email",e.target.value)} className="public-input" autoComplete="email"/></Field>
      <Field label="Assunto *"><select required value={form.subject} onChange={e=>update("subject",e.target.value)} className="public-input">{subjects.map(s=><option key={s}>{s}</option>)}</select></Field>
      <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>update("website",e.target.value)}/></label></div>
      <div className="sm:col-span-2"><Field label="Mensagem *"><textarea required rows={6} minLength={10} maxLength={4000} value={form.message} onChange={e=>update("message",e.target.value)} className="public-input min-h-36 resize-y"/></Field></div>
      {feedback&&<div className={"sm:col-span-2 rounded-xl border p-4 text-sm font-medium "+(status==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-rose-200 bg-rose-50 text-rose-700")}>{status==="success"&&<CheckCircle2 className="mr-2 inline h-4 w-4"/>}{feedback}</div>}
      <div className="sm:col-span-2"><button type="submit" disabled={status==="loading"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#147D92] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#106a7c] disabled:cursor-not-allowed disabled:opacity-60">{status==="loading"?"A enviar...":<>Enviar mensagem <Send className="h-4 w-4"/></>}</button></div>
    </form>
   </div>
  </section>
 </main></PublicLayout>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>}
function ContactCard({icon,label,value,href}:{icon:React.ReactNode;label:string;value:string;href:string}){return <a href={href} className="public-card flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[#147D92]">{icon}</span><span><span className="block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span><span className="mt-1 block font-semibold text-slate-900">{value}</span></span></a>}
