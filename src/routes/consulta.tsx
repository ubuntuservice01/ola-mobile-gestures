import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, QrCode, Search, ShieldCheck } from "lucide-react";
export const Route=createFileRoute("/consulta")({component:Consulta});
function Consulta(){
  return <main className="min-h-screen bg-slate-50">
    <header className="border-b bg-white"><div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5"><Link to="/"><img src="/mobigest-logo.svg" className="h-11 w-auto" alt="MobiGest"/></Link><Link to="/login" className="text-sm font-semibold text-slate-600">Área reservada</Link></div></header>
    <div className="mx-auto max-w-2xl px-5 py-14">
      <div className="text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600"><ShieldCheck className="h-7 w-7"/></div><h1 className="mt-5 text-3xl font-bold tracking-tight">Consulta pública</h1><p className="mt-3 text-slate-500">Confirme a situação de uma motorizada, carro ou bicicleta registada no MobiGest.</p></div>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="text-sm font-semibold">Número MobiGest</label>
        <div className="mt-2 flex gap-2"><div className="flex flex-1 items-center rounded-xl border border-slate-300 px-3"><Search className="h-4 w-4 text-slate-400"/><input placeholder="Ex.: MOBI-LIC-004821" className="h-12 flex-1 px-3 text-sm outline-none"/></div><button className="rounded-xl bg-slate-900 px-5 text-white" title="Ler QR Code"><QrCode className="h-5 w-5"/></button></div>
        <Link to="/consulta/$codigo" params={{codigo:"MOBI-LIC-004821"}} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white">Consultar veículo<ArrowRight className="h-4 w-4"/></Link>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 text-sm"><b>Informação pública</b><p className="mt-1 text-xs leading-5 text-slate-500">Número MobiGest, tipo, marca, modelo, cor, ano, município e estado do registo.</p></div>
        <div className="rounded-xl border bg-white p-4 text-sm"><b>Protecção de dados</b><p className="mt-1 text-xs leading-5 text-slate-500">Dados do proprietário, documentos, chassis, motor, contactos e localização detalhada ficam fora da consulta pública.</p></div>
      </div>
    </div>
  </main>
}