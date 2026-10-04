import { RouteIndexBoundary } from "../../../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  MapPin,
  Pencil,
  Power,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/super-admin/municipios/$id")({
  component: MunicipioGlobalRouteBoundary,
});

type MunicipalityDetail = {
  id: string;
  name: string;
  code: string;
  province: string;
  area: string | null;
  institutional_phone: string | null;
  institutional_email: string | null;
  address: string | null;
  status: string;
};

type MunicipalityCounts = {
  vehicles: number;
  users: number;
  posts: number;
  localities: number;
};

const EMPTY_COUNTS: MunicipalityCounts = {
  vehicles: 0,
  users: 0,
  posts: 0,
  localities: 0,
};

function MunicipioGlobal() {
  const { id } = Route.useParams();
  const [municipality, setMunicipality] = useState<MunicipalityDetail | null>(null);
  const [counts, setCounts] = useState<MunicipalityCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const municipalityResult = await supabase
        .from("municipalities")
        .select(
          "id, name, code, province, area, institutional_phone, institutional_email, address, status",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (municipalityResult.error || !municipalityResult.data) {
        console.error("Falha ao carregar município:", municipalityResult.error);
        setLoadError("Município não encontrado ou sem acesso autorizado.");
        setLoading(false);
        return;
      }

      const [vehiclesResult, usersResult, postsResult, localitiesResult] =
        await Promise.all([
          supabase
            .from("vehicles")
            .select("id", { count: "exact", head: true })
            .eq("municipality_id", id),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("municipality_id", id),
          supabase
            .from("administrative_posts")
            .select("id", { count: "exact", head: true })
            .eq("municipality_id", id),
          supabase
            .from("localities")
            .select("id", { count: "exact", head: true })
            .eq("municipality_id", id),
        ]);

      if (!active) return;

      const firstCountError =
        vehiclesResult.error ??
        usersResult.error ??
        postsResult.error ??
        localitiesResult.error;

      if (firstCountError) {
        console.error("Falha ao carregar estatísticas municipais:", firstCountError);
        setLoadError("O município existe, mas não foi possível carregar todas as estatísticas.");
        setLoading(false);
        return;
      }

      setMunicipality(municipalityResult.data as MunicipalityDetail);
      setCounts({
        vehicles: vehiclesResult.count ?? 0,
        users: usersResult.count ?? 0,
        posts: postsResult.count ?? 0,
        localities: localitiesResult.count ?? 0,
      });
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, refreshToken]);

  const requestStatusChange = (status: string) => {
    setPendingStatus(status);
    setReason("");
    setStatusError(null);
  };

  const changeStatus = async () => {
    if (!pendingStatus || !reason.trim() || !municipality) return;

    setChangingStatus(true);
    setStatusError(null);

    const { error } = await supabase.rpc("super_admin_set_municipality_status", {
      p_municipality_id: municipality.id,
      p_status: pendingStatus,
      p_reason: reason.trim(),
    });

    if (error) {
      console.error("Falha ao alterar estado municipal:", error);
      setStatusError(
        error.message || "Não foi possível alterar o estado do município.",
      );
      setChangingStatus(false);
      return;
    }

    setPendingStatus(null);
    setReason("");
    setChangingStatus(false);
    setRefreshToken((value) => value + 1);
  };

  return (
    <SuperAdminShell
      title="Município"
      subtitle="Administração global e configuração da entidade municipal."
    >
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Link
          to="/super-admin/municipios"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" /> Municípios
        </Link>

        {municipality && (
          <div className="flex flex-wrap gap-2">
            <Link
              to="/super-admin/municipios/$id/editar"
              params={{ id }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" /> Editar
            </Link>

            {municipality.status !== "activo" && (
              <button
                type="button"
                onClick={() => requestStatusChange("activo")}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <Power className="h-4 w-4" /> Activar
              </button>
            )}

            {municipality.status !== "suspenso" && municipality.status !== "inactivo" && (
              <button
                type="button"
                onClick={() => requestStatusChange("suspenso")}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50"
              >
                <ShieldOff className="h-4 w-4" /> Suspender / bloquear
              </button>
            )}

            {municipality.status !== "inactivo" && (
              <button
                type="button"
                onClick={() => requestStatusChange("inactivo")}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                <Ban className="h-4 w-4" /> Inactivar
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <SuperCard className="p-8 text-sm text-slate-500">
          A carregar município...
        </SuperCard>
      ) : loadError || !municipality ? (
        <SuperCard className="p-8">
          <p className="text-sm font-semibold text-red-700">
            {loadError ?? "Município não encontrado."}
          </p>
          <Link
            to="/super-admin/municipios"
            className="mt-4 inline-flex text-sm font-semibold text-sky-700"
          >
            Voltar à lista de municípios
          </Link>
        </SuperCard>
      ) : (
        <>
          {pendingStatus && (
            <SuperCard className="mb-6 border-amber-200 p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <h3 className="font-semibold">
                    Confirmar alteração para {statusLabel(pendingStatus)}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Esta é uma operação administrativa crítica. O motivo será guardado na auditoria.
                  </p>

                  <label className="mt-4 block text-sm font-medium">
                    Motivo da alteração *
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={3}
                      placeholder="Explique o motivo da alteração de estado..."
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                    />
                  </label>

                  {statusError && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {statusError}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={!reason.trim() || changingStatus}
                      onClick={changeStatus}
                      className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {changingStatus ? "A processar..." : "Confirmar alteração"}
                    </button>
                    <button
                      type="button"
                      disabled={changingStatus}
                      onClick={() => {
                        setPendingStatus(null);
                        setReason("");
                        setStatusError(null);
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </SuperCard>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <SuperCard className="p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <Building2 />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Município
                    </p>
                    <h2 className="text-2xl font-bold">{municipality.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Código MobiGest: {municipality.code}
                    </p>
                  </div>
                </div>
                <StatusBadge status={municipality.status} />
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  icon={<Building2 />}
                  value={counts.vehicles.toLocaleString("pt-MZ")}
                  label="Veículos"
                />
                <Metric
                  icon={<Users />}
                  value={counts.users.toLocaleString("pt-MZ")}
                  label="Utilizadores"
                />
                <Metric
                  icon={<MapPin />}
                  value={counts.posts.toLocaleString("pt-MZ")}
                  label="Postos"
                />
                <Metric
                  icon={<MapPin />}
                  value={counts.localities.toLocaleString("pt-MZ")}
                  label="Localidades / bairros"
                />
              </div>

              <h3 className="mt-8 font-semibold">Dados institucionais</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="Província" value={municipality.province} />
                <Info label="Área administrativa" value={municipality.area || "—"} />
                <Info
                  label="Contacto"
                  value={municipality.institutional_phone || "—"}
                />
                <Info
                  label="Email"
                  value={municipality.institutional_email || "—"}
                />
                <div className="sm:col-span-2">
                  <Info label="Endereço" value={municipality.address || "—"} />
                </div>
              </div>
            </SuperCard>

            <div className="space-y-4">
              <SuperCard className="p-6">
                <h3 className="font-semibold">Gestão do município</h3>
                <div className="mt-4 space-y-2">
                  <Link
                    to="/super-admin/acesso-municipal/$id"
                    params={{ id }}
                    className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                  >
                    <LockKeyhole className="h-4 w-4" /> Preparar acesso à área municipal
                  </Link>
                  <Link
                    to="/super-admin/municipios/$id/administrador/novo"
                    params={{ id }}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:bg-slate-50"
                  >
                    <UserPlus className="h-4 w-4 text-sky-600" /> Criar Administrador Municipal
                  </Link>
                  <Link
                    to="/super-admin/utilizadores"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:bg-slate-50"
                  >
                    <Users className="h-4 w-4 text-sky-600" /> Gerir utilizadores
                  </Link>
                  <Link
                    to="/super-admin/licencas"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:bg-slate-50"
                  >
                    <KeyRound className="h-4 w-4 text-sky-600" /> Gerir licenças
                  </Link>
                </div>
              </SuperCard>

              <SuperCard className="p-6">
                <h3 className="font-semibold">Estado institucional</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <State label="Ambiente municipal" value={statusLabel(municipality.status)} />
                  <State
                    label="Configuração inicial"
                    value={municipality.status === "configuracao" ? "Em curso" : "Registada"}
                  />
                  <State label="Isolamento de dados" value="RLS activo" />
                  <State label="Alterações críticas" value="Auditadas" />
                </div>
              </SuperCard>
            </div>
          </div>
        </>
      )}
    </SuperAdminShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "activo"
      ? "bg-emerald-50 text-emerald-700"
      : status === "suspenso"
        ? "bg-amber-50 text-amber-700"
        : status === "inactivo"
          ? "bg-rose-50 text-rose-700"
          : "bg-sky-50 text-sky-700";

  return (
    <span className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold " + classes}>
      <CheckCircle2 className="h-3.5 w-3.5" />
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    configuracao: "Configuração",
    activo: "Activo",
    suspenso: "Suspenso",
    inactivo: "Inactivo",
  };
  return labels[status] ?? status;
}

function State({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <span className="text-slate-400">{icon}</span>
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="h-full rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}


function MunicipioGlobalRouteBoundary() {
  return <RouteIndexBoundary pattern="/super-admin/municipios/$id"><MunicipioGlobal /></RouteIndexBoundary>;
}
