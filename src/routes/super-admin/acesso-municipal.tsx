import { RouteIndexBoundary } from "../../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, CarFront, LockKeyhole, Search, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../components/SuperAdminShell";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/super-admin/acesso-municipal")({
  component: AcessoMunicipalRouteBoundary,
});

type MunicipalityAccessRow = {
  id: string;
  name: string;
  code: string;
  province: string;
  status: string;
  users: number;
  vehicles: number;
};

function AcessoMunicipal() {
  const [query, setQuery] = useState("");
  const [municipalities, setMunicipalities] = useState<MunicipalityAccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("municipalities")
        .select("id, name, code, province, status")
        .order("name", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar municípios para acesso:", error);
        setLoadError("Não foi possível carregar os municípios.");
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        (data ?? []).map(async (municipality) => {
          const [usersResult, vehiclesResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .eq("municipality_id", municipality.id),
            supabase
              .from("vehicles")
              .select("id", { count: "exact", head: true })
              .eq("municipality_id", municipality.id),
          ]);

          if (usersResult.error) throw usersResult.error;
          if (vehiclesResult.error) throw vehiclesResult.error;

          return {
            ...municipality,
            users: usersResult.count ?? 0,
            vehicles: vehiclesResult.count ?? 0,
          } as MunicipalityAccessRow;
        }),
      ).catch((countError) => {
        console.error("Falha ao carregar estatísticas municipais:", countError);
        return null;
      });

      if (!active) return;

      if (!enriched) {
        setLoadError("Os municípios foram encontrados, mas as estatísticas não puderam ser carregadas.");
        setLoading(false);
        return;
      }

      setMunicipalities(enriched);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      municipalities.filter((item) =>
        (item.name + " " + item.code + " " + item.province)
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [municipalities, query],
  );

  return (
    <SuperAdminShell
      title="Acesso à área municipal"
      subtitle="Entrada controlada para acompanhar ou apoiar a operação de um município."
    >
      <div className="mb-7">
        <p className="text-sm text-slate-500">Operação assistida</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">Seleccionar município</h2>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-950">Acesso controlado</h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-amber-900/75">
              O Super Administrador só entra na área operacional através de uma sessão temporária,
              auditada e vinculada a um município real.
            </p>
          </div>
        </div>
      </div>

      <SuperCard className="mt-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar município, código ou província"
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-500"
          />
        </div>
      </SuperCard>

      {loadError && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      {loading ? (
        <SuperCard className="mt-6 p-8 text-sm text-slate-500">A carregar municípios...</SuperCard>
      ) : filtered.length === 0 ? (
        <SuperCard className="mt-6 p-8 text-sm text-slate-500">
          {municipalities.length === 0
            ? "Ainda não existem municípios registados."
            : "Nenhum município corresponde à pesquisa."}
        </SuperCard>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {filtered.map((municipality) => (
            <SuperCard key={municipality.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{municipality.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {municipality.code}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{municipality.province}</p>
                </div>
                <StatusBadge status={municipality.status} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Info icon={<Users />} label="Utilizadores" value={String(municipality.users)} />
                <Info
                  icon={<CarFront />}
                  label="Veículos"
                  value={municipality.vehicles.toLocaleString("pt-MZ")}
                />
              </div>

              <Link
                to="/super-admin/acesso-municipal/$id"
                params={{ id: municipality.id }}
                className="mt-5 flex items-center justify-between rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Preparar acesso <ArrowRight className="h-4 w-4" />
              </Link>
            </SuperCard>
          ))}
        </div>
      )}

      <SuperCard className="mt-6 p-6">
        <div className="flex items-start gap-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <div>
            <h3 className="font-semibold">Regra de segurança</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Consulta é somente leitura. Assistência permite operações municipais autorizadas
              durante a sessão. Ambas têm duração limitada e ficam registadas em auditoria.
            </p>
          </div>
        </div>
      </SuperCard>
    </SuperAdminShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    activo: "Activo",
    configuracao: "Configuração",
    suspenso: "Suspenso",
    inactivo: "Inactivo",
  };

  const classes =
    status === "activo"
      ? "bg-emerald-50 text-emerald-700"
      : status === "suspenso"
        ? "bg-amber-50 text-amber-700"
        : status === "inactivo"
          ? "bg-rose-50 text-rose-700"
          : "bg-sky-50 text-sky-700";

  return (
    <span className={"rounded-full px-3 py-1 text-[11px] font-semibold " + classes}>
      {labels[status] ?? status}
    </span>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function AcessoMunicipalRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/super-admin/acesso-municipal">
      <AcessoMunicipal />
    </RouteIndexBoundary>
  );
}
