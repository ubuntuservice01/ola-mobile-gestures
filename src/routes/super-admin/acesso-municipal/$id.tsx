import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";
import {
  startMunicipalAccess,
  type MunicipalAccessMode,
} from "../../../lib/municipal-access";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/super-admin/acesso-municipal/$id")({
  component: PrepararAcesso,
});

type MunicipalityDetail = {
  id: string;
  name: string;
  code: string;
  province: string;
  status: string;
  users: number;
  vehicles: number;
};

function PrepararAcesso() {
  const { id } = Route.useParams();
  const [municipality, setMunicipality] = useState<MunicipalityDetail | null>(null);
  const [mode, setMode] = useState<MunicipalAccessMode>("consulta");
  const [duration, setDuration] = useState("30");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const municipalityResult = await supabase
        .from("municipalities")
        .select("id, name, code, province, status")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (municipalityResult.error || !municipalityResult.data) {
        console.error("Falha ao carregar município para acesso:", municipalityResult.error);
        setLoadError("Município não encontrado ou sem acesso autorizado.");
        setLoading(false);
        return;
      }

      const [usersResult, vehiclesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("municipality_id", id),
        supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("municipality_id", id),
      ]);

      if (!active) return;

      const countError = usersResult.error ?? vehiclesResult.error;
      if (countError) {
        console.error("Falha ao carregar estatísticas do município:", countError);
        setLoadError("O município foi encontrado, mas as estatísticas não puderam ser carregadas.");
        setLoading(false);
        return;
      }

      setMunicipality({
        ...municipalityResult.data,
        users: usersResult.count ?? 0,
        vehicles: vehiclesResult.count ?? 0,
      });
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  const startAccess = async () => {
    if (!municipality || !reason.trim() || starting) return;

    setStarting(true);
    setStartError(null);

    try {
      await startMunicipalAccess({
        municipalityId: municipality.id,
        mode,
        reason: reason.trim(),
        durationMinutes: Number(duration),
      });

      window.location.replace("/dashboard");
    } catch (error) {
      console.error("Falha ao iniciar acesso municipal:", error);
      setStartError(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a sessão municipal.",
      );
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <SuperAdminShell title="Preparar acesso municipal" subtitle="A carregar contexto municipal...">
        <SuperCard className="p-8 text-sm text-slate-500">A carregar município...</SuperCard>
      </SuperAdminShell>
    );
  }

  if (loadError || !municipality) {
    return (
      <SuperAdminShell title="Preparar acesso municipal" subtitle="Não foi possível preparar o contexto.">
        <SuperCard className="p-8">
          <p className="text-sm font-semibold text-red-700">
            {loadError ?? "Município não encontrado."}
          </p>
          <Link
            to="/super-admin/acesso-municipal"
            className="mt-4 inline-flex text-sm font-semibold text-sky-700"
          >
            Voltar à selecção de município
          </Link>
        </SuperCard>
      </SuperAdminShell>
    );
  }

  const assistanceAllowed =
    municipality.status === "activo" || municipality.status === "configuracao";

  return (
    <SuperAdminShell
      title="Preparar acesso municipal"
      subtitle="Defina o contexto antes de entrar na área operacional."
    >
      <div className="mb-6">
        <Link
          to="/super-admin/acesso-municipal"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" /> Seleccionar município
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.8fr]">
        <SuperCard className="p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Building2 />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Município seleccionado
              </p>
              <h2 className="mt-1 text-2xl font-bold">{municipality.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {municipality.province} · Código {municipality.code}
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <Info label="Estado" value={statusLabel(municipality.status)} />
            <Info label="Utilizadores" value={String(municipality.users)} />
            <Info label="Veículos" value={municipality.vehicles.toLocaleString("pt-MZ")} />
          </div>

          <div className="mt-8">
            <label className="text-sm font-semibold">Modo de acesso</label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ModeCard
                active={mode === "consulta"}
                onClick={() => setMode("consulta")}
                icon={<Eye />}
                title="Consulta"
                text="Apenas acompanhamento e leitura."
              />
              <ModeCard
                active={mode === "assistencia"}
                onClick={() => assistanceAllowed && setMode("assistencia")}
                icon={<ShieldCheck />}
                title="Assistência"
                text={
                  assistanceAllowed
                    ? "Apoio operacional com escrita limitada ao município."
                    : "Indisponível no estado actual do município."
                }
                disabled={!assistanceAllowed}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Duração da sessão
              <select
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-500"
              >
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="120">2 horas</option>
              </select>
            </label>

            <label className="text-sm font-semibold">
              Motivo do acesso
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ex.: suporte técnico solicitado pelo município"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-500"
              />
            </label>
          </div>

          <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Confirmação necessária.</strong> O início criará uma sessão temporária,
            registará município, modo, motivo, início e expiração na auditoria e limitará
            o contexto operacional a este município.
          </div>

          {startError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {startError}
            </div>
          )}

          <button
            type="button"
            disabled={!reason.trim() || starting}
            onClick={startAccess}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LockKeyhole className="h-4 w-4" />
            {starting ? "A iniciar..." : "Iniciar acesso municipal"}
          </button>
        </SuperCard>

        <div className="space-y-5">
          <SuperCard className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold">Contexto preparado</h3>
            </div>
            <div className="mt-5 space-y-3">
              <Summary label="Município" value={municipality.name} />
              <Summary label="Código" value={municipality.code} />
              <Summary label="Modo" value={mode === "consulta" ? "Consulta" : "Assistência"} />
              <Summary label="Duração" value={duration + " minutos"} />
              <Summary label="Auditoria" value="Obrigatória" />
            </div>
          </SuperCard>

          <SuperCard className="p-6">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-sky-600" />
              <h3 className="font-semibold">Princípios</h3>
            </div>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-500">
              <li>• Acesso temporário, não permanente.</li>
              <li>• Município definido antes da entrada.</li>
              <li>• Motivo obrigatório para rastreabilidade.</li>
              <li>• Consulta bloqueia escrita no banco.</li>
              <li>• Assistência permite escrita apenas neste município.</li>
              <li>• Início e fim ficam registados na auditoria.</li>
            </ul>
          </SuperCard>
        </div>
      </div>
    </SuperAdminShell>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  text,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  text: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        active
          ? "rounded-xl border-2 border-sky-500 bg-sky-50 p-4 text-left"
          : "rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
      }
    >
      <div className="flex items-center gap-2 text-sky-600">
        {icon}
        <span className="text-sm font-semibold text-slate-900">{title}</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
    </button>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    activo: "Activo",
    configuracao: "Configuração",
    suspenso: "Suspenso",
    inactivo: "Inactivo",
  };

  return labels[status] ?? status;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
