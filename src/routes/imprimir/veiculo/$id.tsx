import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  EmptyState,
  NetworkErrorState,
  PageTransition,
  SkeletonCard,
} from "../../../components/mobigest/Experience";
import { formatDate } from "../../../lib/format";
import { municipalityLogoUrl } from "../../../lib/municipality-settings";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/imprimir/veiculo/$id")({
  component: PrintVehicle,
});

type VehiclePrint = {
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
  created_at: string;
};

type PrintContext = {
  vehicle: VehiclePrint;
  ownerName: string;
  ownerDocument: string;
  ownerPhone: string;
  municipalityName: string;
  municipalityCode: string;
  municipalityAddress: string;
  municipalityPhone: string;
  municipalityEmail: string;
  documentHeader: string;
  logoPath: string | null;
  primaryColor: string;
  postName: string;
  localityName: string;
};

function PrintVehicle() {
  const { id } = Route.useParams();
  const [data, setData] = useState<PrintContext | null>(null);
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
          "id, municipality_id, administrative_post_id, locality_id, current_owner_id, vehicle_type, mobigest_number, plate_number, chassis_number, frame_number, engine_number, make, model, color, manufacture_year, commercial_status, status, registration_date, created_at",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (vehicleResult.error || !vehicleResult.data) {
        console.error(
          "Falha ao preparar ficha do veículo:",
          vehicleResult.error,
        );
        setLoadError(
          vehicleResult.error
            ? "Não foi possível carregar a ficha do veículo."
            : "Veículo não encontrado ou fora do seu âmbito.",
        );
        setLoading(false);
        return;
      }

      const vehicle = vehicleResult.data as VehiclePrint;

      const [
        ownerResult,
        municipalityResult,
        postResult,
        localityResult,
      ] = await Promise.all([
        vehicle.current_owner_id
          ? supabase
              .from("owners")
              .select(
                "full_name, document_type, document_number, phone",
              )
              .eq("id", vehicle.current_owner_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("municipalities")
          .select(
            "name, code, address, institutional_phone, institutional_email, display_name, logo_path, primary_color, document_header",
          )
          .eq("id", vehicle.municipality_id)
          .maybeSingle(),
        vehicle.administrative_post_id
          ? supabase
              .from("administrative_posts")
              .select("name")
              .eq("id", vehicle.administrative_post_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        vehicle.locality_id
          ? supabase
              .from("localities")
              .select("name")
              .eq("id", vehicle.locality_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!active) return;

      const relationError =
        ownerResult.error ??
        municipalityResult.error ??
        postResult.error ??
        localityResult.error;

      if (relationError) {
        console.error(
          "Falha ao carregar dados relacionados da ficha:",
          relationError,
        );
        setLoadError(
          "O veículo foi encontrado, mas a ficha não pôde ser preparada completamente.",
        );
        setLoading(false);
        return;
      }

      const municipality = municipalityResult.data;
      const owner = ownerResult.data;

      setData({
        vehicle,
        ownerName: owner?.full_name ?? "Sem proprietário actual",
        ownerDocument: owner?.document_number
          ? [owner.document_type, owner.document_number]
              .filter(Boolean)
              .join(" · ")
          : "Não informado",
        ownerPhone: owner?.phone ?? "Não informado",
        municipalityName:
          municipality?.display_name ??
          municipality?.name ??
          "Município MobiGest",
        municipalityCode: municipality?.code ?? "—",
        municipalityAddress:
          municipality?.address ?? "Endereço não configurado",
        municipalityPhone:
          municipality?.institutional_phone ?? "Não informado",
        municipalityEmail:
          municipality?.institutional_email ?? "Não informado",
        documentHeader:
          municipality?.document_header ??
          "Ficha oficial de identificação do veículo",
        logoPath: municipality?.logo_path ?? null,
        primaryColor: municipality?.primary_color ?? "#0284C7",
        postName: postResult.data?.name ?? "Não definido",
        localityName: localityResult.data?.name ?? "Não definida",
      });

      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10">
        <div className="mx-auto max-w-3xl">
          <SkeletonCard />
          <p className="mt-4 text-center text-sm text-slate-500">
            A preparar documento...
          </p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10">
        <div className="mx-auto max-w-3xl">
          <NetworkErrorState
            message={loadError}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white">
          <EmptyState
            title="Ficha indisponível"
            description="Não existem dados suficientes para preparar a ficha deste veículo."
          />
        </div>
      </main>
    );
  }

  const { vehicle } = data;
  const logoUrl = municipalityLogoUrl(data.logoPath);

  const rows = [
    ["Número MobiGest", vehicle.mobigest_number || "Ainda não atribuído"],
    ["Tipo", vehicleTypeLabel(vehicle.vehicle_type)],
    ["Marca", vehicle.make || "—"],
    ["Modelo", vehicle.model || "—"],
    ["Ano de fabrico", vehicle.manufacture_year ? String(vehicle.manufacture_year) : "—"],
    ["Cor", vehicle.color || "—"],
    ["Matrícula", vehicle.plate_number || "—"],
    ["Chassis / quadro", vehicle.chassis_number || vehicle.frame_number || "—"],
    ["Motor", vehicle.engine_number || "—"],
    ["Proprietário actual", data.ownerName],
    ["Documento do proprietário", data.ownerDocument],
    ["Contacto do proprietário", data.ownerPhone],
    ["Posto administrativo", data.postName],
    ["Localidade / bairro", data.localityName],
    ["Estado", vehicleStatusLabel(vehicle.status, vehicle.commercial_status)],
    [
      "Data de registo",
      vehicle.registration_date
        ? formatDate(vehicle.registration_date)
        : "Ainda não aprovado",
    ],
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 print:bg-white print:p-0">
      <PageTransition>
        <div className="mobigest-no-print mx-auto mb-5 flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <Link
            to="/veiculos/$id"
            params={{ id }}
            className="mobigest-interactive inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-500 hover:text-sky-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao veículo
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="mobigest-button inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            Imprimir ficha
          </button>
        </div>

        <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
          <header
            className="border-b px-7 py-6 sm:px-9"
            style={{ borderTop: "5px solid " + data.primaryColor }}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={"Logótipo de " + data.municipalityName}
                    className="h-16 w-16 rounded-xl border border-slate-200 bg-white object-contain p-1.5"
                  />
                ) : (
                  <img
                    src="/mobigest-logo.svg"
                    alt="MobiGest"
                    className="h-12 w-auto"
                  />
                )}

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    {data.municipalityName}
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-slate-950">
                    Ficha do veículo
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {data.documentHeader}
                  </p>
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-xs text-slate-400">
                  Número MobiGest
                </p>
                <p
                  className="mt-1 text-lg font-bold"
                  style={{ color: data.primaryColor }}
                >
                  {vehicle.mobigest_number || "Pendente"}
                </p>
              </div>
            </div>
          </header>

          <section className="px-7 py-7 sm:px-9">
            <div className="grid gap-x-8 sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  className="border-b border-slate-100 py-3.5"
                >
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-xl bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: data.primaryColor }}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Identificação institucional
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {data.municipalityName} · Código {data.municipalityCode}
                    <br />
                    {data.municipalityAddress}
                    <br />
                    {data.municipalityPhone} · {data.municipalityEmail}
                  </p>
                </div>
              </div>
            </div>

            <footer className="mt-8 flex flex-col gap-2 border-t border-slate-100 pt-5 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Documento preparado pelo MobiGest em{" "}
                {new Date().toLocaleDateString("pt-MZ")}
              </span>
              <span>
                Consulte o QR Code do veículo para verificação pública.
              </span>
            </footer>
          </section>
        </article>
      </PageTransition>
    </main>
  );
}

function vehicleTypeLabel(type: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return type;
}

function vehicleStatusLabel(
  status: string,
  commercialStatus: string,
) {
  if (commercialStatus === "a_venda") return "À venda";

  const labels: Record<string, string> = {
    activa: "Activa",
    roubada: "Roubada",
    apreendida: "Apreendida",
    suspensa: "Suspensa",
    cancelada: "Cancelada",
  };

  return labels[status] ?? status;
}
