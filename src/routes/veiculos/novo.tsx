import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Bike, CarFront, CheckCircle2, MapPin } from "lucide-react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";

export const Route = createFileRoute("/veiculos/novo")({ component: NovoRegisto });

const tipos = [
  { id: "motorizada", name: "Motorizada", icon: Bike, desc: "Motorizadas e motociclos." },
  { id: "carro", name: "Carro", icon: CarFront, desc: "Automóveis ligeiros e outros veículos." },
  { id: "bicicleta", name: "Bicicleta", icon: Bike, desc: "Bicicletas e outros velocípedes." },
];

function NovoRegisto() {
  return <MobiGestShell title="Novo registo" subtitle="Início do processo de registo de um veículo.">
    <div className="mx-auto max-w-5xl">
      <Link to="/veiculos" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"><ArrowLeft className="h-4 w-4"/>Voltar aos veículos</Link>
      <h2 className="text-2xl font-bold">Que veículo pretende registar?</h2>
      <p className="mt-2 text-slate-500">O formulário seguinte será adaptado ao tipo seleccionado.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {tipos.map(({id,name,icon:Icon,desc}) => <Link key={id} to={"/veiculos/novo/$tipo" as any} params={{tipo:id}} className="group rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Icon className="h-7 w-7"/></div>
          <h3 className="mt-6 font-semibold">{name}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-600">Começar <ArrowRight className="h-4 w-4"/></span>
        </Link>)}
      </div>
    </div>
  </MobiGestShell>;
}