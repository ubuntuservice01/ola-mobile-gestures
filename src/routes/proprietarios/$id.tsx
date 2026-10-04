import { RouteIndexBoundary } from "../../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bike, Edit3, FileText, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { supabase } from "../../lib/supabase";
import {
  EmptyState,
  NetworkErrorState,
  SkeletonCard,
  StatusBadge,
} from "../../components/mobigest/Experience";
import { formatNumber } from "../../lib/format";

export const Route = createFileRoute("/proprietarios/$id")({
  component: PerfilRouteBoundary,
});

type Owner = {
  id: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
  nuit: string | null;
  phone: string | null;
  alternate_phone: string | null;
  email: string | null;
  address: string | null;
  administrative_post_id: string | null;
  locality_id: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

type Vehicle = {
  id: string;
  mobigest_number: string | null;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  status: string;
  commercial_status: string;
};

function Perfil() {
  const { id } = Route.useParams();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [postName, setPostName] = useState("—");
  const [localityName, setLocalityName] = useState("—");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const ownerResult = await supabase
        .from("owners")
        .select(
          "id, full_name, document_type, document_number, nuit, phone, alternate_phone, email, address, administrative_post_id, locality_id, notes, status, created_at",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (ownerResult.error || !ownerResult.data) {
        console.error("Falha ao carregar proprietário:", ownerResult.error);
        setLoadError("Proprietário não encontrado ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      const current = ownerResult.data as Owner;

      const [postResult, localityResult, vehiclesResult] = await Promise.all([
        current.administrative_post_id
          ? supabase
              .from("administrative_posts")
              .select("name")
              .eq("id", current.administrative_post_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        current.locality_id
          ? supabase
              .from("localities")
              .select("name")
              .eq("id", current.locality_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("vehicles")
          .select(
            "id, mobigest_number, vehicle_type, make, model, status, commercial_status",
          )
          .eq("current_owner_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      const error = postResult.error ?? localityResult.error ?? vehiclesResult.error;
      if (error) {
        console.error("Falha ao carregar relações do proprietário:", error);
        setLoadError("O proprietário foi encontrado, mas os dados relacionados não puderam ser carregados.");
        setLoading(false);
        return;
      }

      setOwner(current);
      setPostName(postResult.data?.name ?? "—");
      setLocalityName(localityResult.data?.name ?? "—");
      setVehicles((vehiclesResult.data ?? []) as Vehicle[]);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  return (
    <MobiGestShell
      title="Perfil do proprietário"
      subtitle="Dados cadastrais e veículos associados."
    >
      <Link
        to="/proprietarios"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Proprietários
      </Link>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : loadError || !owner ? (
        <NetworkErrorState
          message={loadError ?? "Proprietário não encontrado."}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <UserRound className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold">{owner.full_name}</h2>
                <div className="mt-2">
                  <StatusBadge status={owner.status} />
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Info
                label="Documento"
                value={
                  owner.document_number
                    ? [owner.document_type, owner.document_number]
                        .filter(Boolean)
                        .join(" · ")
                    : "—"
                }
              />
              <Info label="NUIT" value={owner.nuit || "—"} />
              <Info label="Telefone" value={owner.phone || "—"} />
              <Info label="Telefone alternativo" value={owner.alternate_phone || "—"} />
              <Info label="Email" value={owner.email || "—"} />
              <Info label="Morada" value={owner.address || "—"} />
              <Info label="Posto" value={postName} />
              <Info label="Localidade / bairro" value={localityName} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/proprietarios/$id/editar"
                params={{ id }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
              >
                <Edit3 className="h-4 w-4" /> Editar
              </Link>

              {owner.phone && (
                <a
                  href={"tel:" + owner.phone.replace(/\s+/g, "")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                >
                  <Phone className="h-4 w-4" /> Contactar
                </a>
              )}

              <Link
                to="/proprietarios/$id/documentos"
                params={{ id }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
              >
                <FileText className="h-4 w-4" /> Documentos
              </Link>
            </div>

            {owner.notes && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Observações</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{owner.notes}</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Veículos associados</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Veículos actualmente ligados a este proprietário.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                {formatNumber(vehicles.length)} veículo(s)
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {vehicles.length === 0 ? (
                <EmptyState
                  title="Nenhum veículo associado"
                  description="Este proprietário ainda não possui veículos associados no MobiGest."
                />
              ) : (
                vehicles.map((vehicle) => (
                  <Link
                    to="/veiculos/$id"
                    params={{ id: vehicle.id }}
                    className="mobigest-card-interactive flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 hover:border-sky-200"
                    key={vehicle.id}
                  >
                    <div className="flex items-center gap-3">
                      <Bike className="text-sky-600" />
                      <div>
                        <p className="font-semibold">
                          {[vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
                            vehicleTypeLabel(vehicle.vehicle_type)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {vehicle.mobigest_number || "Sem número MobiGest"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      status={
                        vehicle.commercial_status === "a_venda"
                          ? "a_venda"
                          : vehicle.status
                      }
                    />
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </MobiGestShell>
  );
}

function vehicleTypeLabel(type: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return "Veículo";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function PerfilRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/proprietarios/$id">
      <Perfil />
    </RouteIndexBoundary>
  );
}
