import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Building2, CheckCircle2, Clock3, Eye, LockKeyhole, ShieldCheck } from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";

export const Route = createFileRoute("/super-admin/acesso-municipal/$id")({ component: PrepararAcesso });

const data: Record<string, { name: string; code: string; province: string; users: number; vehicles: string; status: string }> = {
  lichinga: { name: "Município de Lichinga", code: "LIC", province: "Niassa", users: 18, vehicles: "2 562", status: "Activo" },
  pemba: { name: "Município de Pemba", code: "PEM", province: "Cabo Delgado", users: 11, vehicles: "1 184", status: "Configuração" },
};

function PrepararAcesso() {
  const { id } = Route.useParams();
  const municipality = data[id] ?? data.lichinga;
  const [mode, setMode] = useState("consulta");
  const [duration, setDuration] = useState("30");
  const [reason, setReason] = useState("");

  return (
    <SuperAdminShell title="Preparar acesso municipal" subtitle="Defina o contexto antes de entrar na área operacional.">
      <div className="mb-6">
        <Link to="/super-admin/acesso-municipal" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600">
          <ArrowLeft className="h-4 w-4" /> Seleccionar município
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.8fr]">
        <SuperCard className="p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Building2 /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Município seleccionado</p>
              <h2 className="mt-1 text-2xl font-bold">{municipality.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{municipality.province} · Código {municipality.code}</p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <Info label="Estado" value={municipality.status} />
            <Info label="Utilizadores" value={String(municipality.users)} />
            <Info label="Veículos" value={municipality.vehicles} />
          </div>

          <div className="mt-8">
            <label className="text-sm font-semibold">Modo de acesso</label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ModeCard active={mode === "consulta"} onClick={() => setMode("consulta")} icon={<Eye />} title="Consulta" text="Apenas acompanhamento e leitura." />
              <ModeCard active={mode === "assistencia"} onClick={() => setMode("assistencia")} icon={<ShieldCheck />} title="Assistência" text="Apoio operacional, sujeito a permissões." />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Duração da sessão
              <select value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-500">
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="120">2 horas</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Motivo do acesso
              <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: suporte técnico" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-500" />
            </label>
          </div>

          <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Confirmação necessária.</strong> Na versão operacional, iniciar este acesso criará uma sessão temporária associada ao Super Administrador, município, âmbito, motivo e duração escolhidos.
          </div>

          <button type="button" disabled={!reason.trim()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <LockKeyhole className="h-4 w-4" /> Iniciar acesso municipal
          </button>
        </SuperCard>

        <div className="space-y-5">
          <SuperCard className="p-6">
            <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><h3 className="font-semibold">Contexto preparado</h3></div>
            <div className="mt-5 space-y-3">
              <Summary label="Município" value={municipality.name} />
              <Summary label="Código" value={municipality.code} />
              <Summary label="Modo" value={mode === "consulta" ? "Consulta" : "Assistência"} />
              <Summary label="Duração" value={duration + " minutos"} />
              <Summary label="Auditoria" value="Obrigatória" />
            </div>
          </SuperCard>

          <SuperCard className="p-6">
            <div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-sky-600" /><h3 className="font-semibold">Princípios</h3></div>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-500">
              <li>• Acesso temporário, não permanente.</li>
              <li>• Município definido antes da entrada.</li>
              <li>• Motivo obrigatório para rastreabilidade.</li>
              <li>• Registo de início e fim da sessão.</li>
              <li>• Operações realizadas ficam na auditoria.</li>
            </ul>
          </SuperCard>
        </div>
      </div>
    </SuperAdminShell>
  );
}

function ModeCard({ active, onClick, icon, title, text }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; text: string }) {
  return <button type="button" onClick={onClick} className={active ? "rounded-xl border-2 border-sky-500 bg-sky-50 p-4 text-left" : "rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-sky-200"}>
    <div className="flex items-center gap-2 text-sky-600">{icon}<span className="text-sm font-semibold text-slate-900">{title}</span></div>
    <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
  </button>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}
function Summary({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-semibold">{value}</span></div>;
}
