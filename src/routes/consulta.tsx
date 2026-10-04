import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bike,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { FormEvent, useState } from "react";

export const Route = createFileRoute("/consulta")({
  component: ConsultaRouteBoundary,
});

function Consulta() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"veiculo" | "condutor">("veiculo");
  const [code, setCode] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    if (mode === "condutor") {
      await navigate({
        to: "/consulta/condutor/$codigo",
        params: { codigo: normalized },
      });
      return;
    }

    await navigate({
      to: "/consulta/$codigo",
      params: { codigo: normalized },
    });
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5">
          <Link to="/">
            <img
              src="/mobigest-logo.svg"
              className="h-11 w-auto"
              alt="MobiGest"
            />
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-600"
          >
            Área reservada
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-14">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">
            Consulta pública
          </h1>
          <p className="mt-3 text-slate-500">
            Confirme um veículo ou a identificação profissional de um
            taxista/condutor registado no MobiGest.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("veiculo");
                setCode("");
              }}
              className={
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold " +
                (mode === "veiculo"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-500")
              }
            >
              <Bike className="h-4 w-4" />
              Veículo
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("condutor");
                setCode("");
              }}
              className={
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold " +
                (mode === "condutor"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-500")
              }
            >
              <UserRoundCheck className="h-4 w-4" />
              Taxista / Condutor
            </button>
          </div>

          <label className="mt-5 block text-sm font-semibold">
            {mode === "veiculo" ? "Número MobiGest" : "Referência MTX / CDT"}
          </label>

          <div className="mt-2 flex items-center rounded-xl border border-slate-300 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder={
                mode === "veiculo"
                  ? "Ex.: MZ-LIC-000001"
                  : "Ex.: MTX-LIC-000001"
              }
              className="h-12 flex-1 px-3 text-sm outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!code.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mode === "veiculo"
              ? "Consultar veículo"
              : "Consultar taxista / condutor"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-slate-400">
            Ao digitalizar um QR MobiGest com a câmara do telemóvel, a página de
            verificação abre directamente.
          </p>
        </form>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-white p-4 text-sm">
            <b>Informação pública mínima</b>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Estado, tipo, identificação MobiGest e dados institucionais
              necessários à confirmação do registo.
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-sm">
            <b>Protecção de dados</b>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              BI/NUIT, contactos, morada, chassis, motor, documentos, pagamentos
              e localização detalhada não são expostos.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function ConsultaRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/consulta">
      <Consulta />
    </RouteIndexBoundary>
  );
}
