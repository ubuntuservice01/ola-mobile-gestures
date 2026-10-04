import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  KeyRound,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/super-admin/utilizadores/$id")({
  component: UtilizadorGlobal,
});

type UserDetail = {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  status: string;
  municipality_id: string | null;
  administrative_post_id: string | null;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrador",
  admin_municipal: "Administrador Municipal",
  tecnico: "Técnico",
  fiscal: "Fiscal",
  financeiro: "Financeiro",
};

const STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  suspenso: "Suspenso",
  inactivo: "Inactivo",
};

function UtilizadorGlobal() {
  const { id } = Route.useParams();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [municipality, setMunicipality] = useState("Administração global");
  const [post, setPost] = useState("Todos / não aplicável");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, phone, role, status, municipality_id, administrative_post_id, created_at",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        console.error("Falha ao carregar perfil:", error);
        setLoadError("Utilizador não encontrado ou sem acesso autorizado.");
        setLoading(false);
        return;
      }

      const profile = data as UserDetail;

      const [municipalityResult, postResult] = await Promise.all([
        profile.municipality_id
          ? supabase
              .from("municipalities")
              .select("name")
              .eq("id", profile.municipality_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        profile.administrative_post_id
          ? supabase
              .from("administrative_posts")
              .select("name")
              .eq("id", profile.administrative_post_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!active) return;

      if (municipalityResult.error || postResult.error) {
        console.error(
          "Falha ao carregar âmbito do utilizador:",
          municipalityResult.error ?? postResult.error,
        );
        setLoadError("O perfil foi encontrado, mas o âmbito institucional não pôde ser carregado.");
        setLoading(false);
        return;
      }

      setUser(profile);
      setMunicipality(
        profile.municipality_id
          ? municipalityResult.data?.name ?? "Município não encontrado"
          : "Administração global",
      );
      setPost(
        profile.administrative_post_id
          ? postResult.data?.name ?? "Posto não encontrado"
          : profile.municipality_id
            ? "Todos os postos autorizados pelo perfil"
            : "Não aplicável",
      );
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <SuperAdminShell
      title="Detalhe do utilizador"
      subtitle="Conta, vínculo institucional e âmbito de acesso."
    >
      <div className="mb-6">
        <Link
          to="/super-admin/utilizadores"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" /> Utilizadores
        </Link>
      </div>

      {loading ? (
        <SuperCard className="p-8 text-sm text-slate-500">
          A carregar utilizador...
        </SuperCard>
      ) : loadError || !user ? (
        <SuperCard className="p-8">
          <p className="text-sm font-semibold text-red-700">
            {loadError ?? "Utilizador não encontrado."}
          </p>
        </SuperCard>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <SuperCard className="p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <UserRound className="h-7 w-7 text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Utilizador
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">{user.full_name}</h2>
                  <p className="mt-1 break-all text-xs text-slate-400">ID: {user.id}</p>
                </div>
                <StatusBadge status={user.status} />
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <Info
                  icon={<Phone />}
                  label="Contacto"
                  value={user.phone || "Não registado"}
                />
                <Info
                  icon={<ShieldCheck />}
                  label="Perfil"
                  value={ROLE_LABELS[user.role] ?? user.role}
                />
                <Info icon={<MapPin />} label="Município" value={municipality} />
                <Info icon={<MapPin />} label="Posto administrativo" value={post} />
                <Info
                  icon={<CalendarDays />}
                  label="Perfil criado"
                  value={new Date(user.created_at).toLocaleString("pt-MZ")}
                />
                <Info
                  icon={<KeyRound />}
                  label="Autenticação"
                  value="Supabase Auth"
                />
              </div>
            </SuperCard>

            <SuperCard className="p-6">
              <h3 className="font-semibold">Âmbito de acesso</h3>
              <div className="mt-4 space-y-2">
                <State label="Perfil" value={ROLE_LABELS[user.role] ?? user.role} />
                <State label="Município" value={municipality} />
                <State label="Posto" value={post} />
                <State label="Estado" value={STATUS_LABELS[user.status] ?? user.status} />
              </div>

              <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-xs leading-5 text-sky-900">
                <b>RBAC + RLS:</b> o perfil define as operações permitidas e o âmbito
                territorial limita os dados acessíveis.
              </div>
            </SuperCard>
          </div>

          <SuperCard className="mt-6 p-6">
            <h3 className="font-semibold">Segurança da conta</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Esta página apresenta apenas dados persistidos no MobiGest. Alterações de
              função, município, estado e credenciais serão disponibilizadas somente por
              operações administrativas auditadas; não existem botões inertes nesta ficha.
            </p>
          </SuperCard>
        </>
      )}
    </SuperAdminShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "activo"
      ? "bg-emerald-50 text-emerald-700"
      : status === "suspenso"
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";

  return (
    <span className={"w-fit rounded-full px-3 py-1 text-xs font-semibold " + className}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function State({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      {icon && <span className="text-slate-500">{icon}</span>}
      <p className="mt-1 text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}
