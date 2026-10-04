import { RouteIndexBoundary } from "../../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bike,
  CarFront,
  Edit3,
  FileText,
  History,
  MapPin,
  Printer,
  QrCode,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { supabase } from "../../lib/supabase";
import {
  EmptyState,
  NetworkErrorState,
  SkeletonCard,
  StatusBadge,
} from "../../components/mobigest/Experience";
import { formatDate } from "../../lib/format";

export const Route = createFileRoute("/veiculos/$id")({
  component: DetalheRouteBoundary,
});

type Vehicle = {
  id: string;
  municipality_id: string;
  administrative_post_id: string | null;
  locality_id: string | null;
  current_owner_id: string | null;
  vehicle_type: string;
  mobigest_number: string | null;
  plate_number: string | null;
  chassis_number: string | null;
  frame_number: string | null;
  engine_number: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  manufacture_year: number | null;
  commercial_status: string;
  status: string;
  registration_date: string | null;
  notes: string | null;
  created_at: string;
};

type Owner = {
  id: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
};

type Registration = {
  id: string;
  reference: string | null;
  status: string;
  registration_type: string;
  created_at: string;
};

type DocumentRow = {
  id: string;
  document_type: string;
  status: string;
};

function Detalhe() {
  const { id } = Route.useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [municipalityName, setMunicipalityName] = useState("—");
  const [postName, setPostName] = useState("—");
  const [localityName, setLocalityName] = useState("—");
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const vehicleResult = await supabase
        .from("vehicles")
        .select(
          "id, municipality_id, administrative_post_id, locality_id, current_owner_id, vehicle_type, mobigest_number, plate_number, chassis_number, frame_number, engine_number, make, model, color, manufacture_year, commercial_status, status, registration_date, notes, created_at",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (vehicleResult.error || !vehicleResult.data) {
        console.error("Falha ao carregar veículo:", vehicleResult.error);
        setLoadError("Veículo não encontrado ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      const current = vehicleResult.data as Vehicle;

      const [
        ownerResult,
        municipalityResult,
        postResult,
        localityResult,
        registrationResult,
        documentsResult,
      ] = await Promise.all([
        current.current_owner_id
          ? supabase
              .from("owners")
              .select("id, full_name, document_type, document_number, phone")
              .eq("id", current.current_owner_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("municipalities")
          .select("name")
          .eq("id", current.municipality_id)
          .maybeSingle(),
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
          .from("registrations")
          .select("id, reference, status, registration_type, created_at")
          .eq("vehicle_id", current.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("documents")
          .select("id, document_type, status")
          .eq("vehicle_id", current.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      const error =
        ownerResult.error ??
        municipalityResult.error ??
        postResult.error ??
        localityResult.error ??
        registrationResult.error ??
        documentsResult.error;

      if (error) {
        console.error("Falha ao carregar relações do veículo:", error);
        setLoadError(
          "O veículo foi encontrado, mas os dados relacionados não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      setVehicle(current);
      setOwner(ownerResult.data as Owner | null);
      setMunicipalityName(municipalityResult.data?.name ?? "—");
      setPostName(postResult.data?.name ?? "—");
      setLocalityName(localityResult.data?.name ?? "—");
      setRegistration(registrationResult.data as Registration | null);
      setDocuments((documentsResult.data ?? []) as DocumentRow[]);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const publicCode = vehicle?.mobigest_number ?? null;
  const qrValue =
    publicCode && typeof window !== "undefined"
      ? window.location.origin + "/q/" + encodeURIComponent(publicCode)
      : publicCode
        ? "/q/" + encodeURIComponent(publicCode)
        : "";

  return (
    <MobiGestShell
      title="Detalhes do veículo"
      subtitle="Ficha completa e situação actual."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/veiculos"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos veículos
        </Link>

        {vehicle && (
          <div className="flex flex-wrap gap-2">
            <Link
              to="/veiculos/$id/estado"
              params={{ id }}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700"
            >
              <ShieldAlert className="h-4 w-4" />
              Alterar estado
            </Link>

            <Link
              to="/veiculos/$id/editar"
              params={{ id }}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Edit3 className="h-4 w-4" /> Editar
            </Link>

            {vehicle.mobigest_number && (
              <Link
                to="/imprimir/veiculo/$id"
                params={{ id }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
              >
                <Printer className="h-4 w-4" /> Imprimir ficha
              </Link>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : loadError || !vehicle ? (
        <NetworkErrorState
          message={loadError ?? "Veículo não encontrado."}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-slate-400">Número MobiGest</p>
              <h2 className="mt-1 text-3xl font-bold text-sky-700">
                {vehicle.mobigest_number || "Aguardando aprovação"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {vehicleTypeLabel(vehicle.vehicle_type)} · {municipalityName}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge
                status={
                  vehicle.commercial_status === "a_venda"
                    ? "a_venda"
                    : vehicle.status
                }
              />
              {registration && <StatusBadge status={registration.status} />}
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px]">
            <div>
              <SectionTitle title="Dados do veículo" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="Tipo" value={vehicleTypeLabel(vehicle.vehicle_type)} />
                <Info label="Marca" value={vehicle.make || "—"} />
                <Info label="Modelo" value={vehicle.model || "—"} />
                <Info
                  label="Ano"
                  value={
                    vehicle.manufacture_year
                      ? String(vehicle.manufacture_year)
                      : "—"
                  }
                />
                <Info label="Cor" value={vehicle.color || "—"} />
                <Info
                  label="Chassis / quadro"
                  value={
                    vehicle.chassis_number || vehicle.frame_number || "—"
                  }
                />
                <Info label="Motor" value={vehicle.engine_number || "—"} />
                <Info label="Matrícula" value={vehicle.plate_number || "—"} />
              </div>

              <SectionTitle title="Localização administrativa" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="Município" value={municipalityName} />
                <Info label="Posto administrativo" value={postName} />
                <Info label="Localidade / bairro" value={localityName} />
                <Info
                  label="Data de registo"
                  value={
                    vehicle.registration_date
                      ? formatDate(vehicle.registration_date)
                      : "Ainda não aprovado"
                  }
                />
              </div>

              <SectionTitle title="Proprietário actual" />
              {owner ? (
                <Link
                  to="/proprietarios/$id"
                  params={{ id: owner.id }}
                  className="mobigest-card-interactive mt-4 flex items-center gap-4 rounded-xl border border-slate-200 p-4 hover:border-sky-200"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                    <UserRound />
                  </div>
                  <div>
                    <p className="font-semibold">{owner.full_name}</p>
                    <p className="text-sm text-slate-500">
                      {owner.document_number
                        ? [owner.document_type, owner.document_number]
                            .filter(Boolean)
                            .join(" · ")
                        : owner.phone || "Sem documento/contacto"}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                  Sem proprietário actual.
                </div>
              )}

              <SectionTitle title="Documentação do veículo" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {documents.length === 0 ? (
                  <div className="sm:col-span-2">
                    <EmptyState
                      title="Ainda não existem documentos"
                      description="Os documentos ligados ao veículo aparecerão aqui depois do carregamento."
                    />
                  </div>
                ) : (
                  documents.slice(0, 6).map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"
                    >
                      <FileText className="h-5 w-5 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {document.document_type}
                      </span>
                      <StatusBadge status={document.status} />
                    </div>
                  ))
                )}
              </div>

              {vehicle.notes && (
                <>
                  <SectionTitle title="Observações" />
                  <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    {vehicle.notes}
                  </p>
                </>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-6 text-center">
                {publicCode ? (
                  <>
                    <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl bg-white p-4">
                      <QRCodeSVG value={qrValue} size={160} level="M" />
                    </div>
                    <p className="mt-4 font-bold">{publicCode}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      QR Code de identificação pública
                    </p>
                    <Link
                      to="/imprimir/qr/$id"
                      params={{ id }}
                      className="mt-5 block rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      Imprimir QR Code
                    </Link>
                  </>
                ) : (
                  <>
                    <QrCode className="mx-auto h-20 w-20 text-slate-300" />
                    <p className="mt-4 text-sm font-semibold">
                      QR ainda indisponível
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      O número MobiGest e o QR são disponibilizados depois da aprovação.
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex gap-3">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Situação actual
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      {vehicleStatusDescription(
                        vehicle.status,
                        vehicle.commercial_status,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {registration && (
                <Link
                  to="/registos/$id"
                  params={{ id: registration.id }}
                  className="mobigest-card-interactive flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-sky-200"
                >
                  <FileText className="h-5 w-5 text-sky-600" />
                  <span>
                    <b className="block text-sm">Processo mais recente</b>
                    <small className="text-xs text-slate-400">
                      {registration.reference || registration.id}
                    </small>
                  </span>
                </Link>
              )}

              <Link
                to="/fiscalizacao/nova"
                className="mobigest-card-interactive flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-sky-200"
              >
                <MapPin className="h-5 w-5 text-sky-600" />
                <span>
                  <b className="block text-sm">Fiscalização</b>
                  <small className="text-xs text-slate-400">
                    Registar ocorrência
                  </small>
                </span>
              </Link>
            </aside>
          </div>

          <div className="border-t border-slate-100 p-6">
            <div className="flex flex-wrap gap-5">
              <Link
                to="/veiculos/$id/historico"
                params={{ id }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700"
              >
                <History className="h-4 w-4" /> Histórico
              </Link>

              <Link
                to="/veiculos/$id/transferir"
                params={{ id }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700"
              >
                <UserRound className="h-4 w-4" /> Transferir propriedade
              </Link>

              <Link
                to="/veiculos/$id/documentos"
                params={{ id }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700"
              >
                <FileText className="h-4 w-4" /> Documentos
              </Link>
            </div>
          </div>
        </Card>
      )}
    </MobiGestShell>
  );
}

function vehicleTypeLabel(type: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return type;
}

function vehicleStatusDescription(status: string, commercialStatus: string) {
  if (commercialStatus === "a_venda") {
    return "Veículo marcado como à venda. A propriedade só muda através de um processo formal de transferência.";
  }
  if (status === "roubada") return "Veículo declarado como roubado.";
  if (status === "apreendida") return "Veículo encontra-se apreendido.";
  if (status === "suspensa") return "Registo temporariamente suspenso.";
  if (status === "cancelada") return "Registo cancelado.";
  return "Veículo activo. Alterações ficam registadas no histórico.";
}

function SectionTitle({ title }: { title: string }) {
  return <h3 className="mt-8 font-semibold first:mt-0">{title}</h3>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function DetalheRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/veiculos/$id">
      <Detalhe />
    </RouteIndexBoundary>
  );
}
