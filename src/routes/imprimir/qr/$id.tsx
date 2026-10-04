import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Copy,
  Download,
  Printer,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import {
  EmptyState,
  LoadingButton,
  NetworkErrorState,
  PageTransition,
  SkeletonCard,
  notify,
} from "../../../components/mobigest/Experience";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/imprimir/qr/$id")({
  component: PrintQR,
});

type VehicleQR = {
  id: string;
  mobigest_number: string;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  municipality_id: string;
  municipalityName: string;
};

function PrintQR() {
  const { id } = Route.useParams();
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [vehicle, setVehicle] = useState<VehicleQR | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const vehicleResult = await supabase
        .from("vehicles")
        .select(
          "id, mobigest_number, vehicle_type, make, model, municipality_id",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (vehicleResult.error || !vehicleResult.data) {
        console.error("Falha ao preparar QR do veículo:", vehicleResult.error);
        setLoadError(
          vehicleResult.error
            ? "Não foi possível carregar o veículo."
            : "Veículo não encontrado ou fora do seu âmbito.",
        );
        setLoading(false);
        return;
      }

      if (!vehicleResult.data.mobigest_number) {
        setVehicle(null);
        setLoading(false);
        return;
      }

      const municipalityResult = await supabase
        .from("municipalities")
        .select("name")
        .eq("id", vehicleResult.data.municipality_id)
        .maybeSingle();

      if (!active) return;

      if (municipalityResult.error) {
        console.error(
          "Falha ao carregar município do QR:",
          municipalityResult.error,
        );
        setLoadError("Não foi possível preparar a identificação municipal.");
        setLoading(false);
        return;
      }

      setVehicle({
        ...vehicleResult.data,
        mobigest_number: vehicleResult.data.mobigest_number,
        municipalityName:
          municipalityResult.data?.name ?? "Município MobiGest",
      } as VehicleQR);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const publicUrl =
    vehicle && typeof window !== "undefined"
      ? window.location.origin +
        "/q/" +
        encodeURIComponent(vehicle.mobigest_number)
      : "";

  const copyPublicLink = async () => {
    if (!publicUrl || copying) return;

    setCopying(true);
    try {
      await navigator.clipboard.writeText(publicUrl);
      notify.success("Link público copiado");
    } catch (error) {
      console.error("Falha ao copiar link público:", error);
      notify.error(
        "Não foi possível copiar o link",
        "Copie o endereço directamente do navegador.",
      );
    } finally {
      setCopying(false);
    }
  };

  const downloadQr = () => {
    const svg = qrContainerRef.current?.querySelector("svg");
    if (!svg || !vehicle) {
      notify.error("Não foi possível preparar o QR para download.");
      return;
    }

    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = vehicle.mobigest_number + "-qr.svg";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    notify.success("QR Code preparado para download");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10">
        <div className="mx-auto max-w-lg">
          <SkeletonCard />
          <p className="mt-4 text-center text-sm text-slate-500">
            A gerar QR Code...
          </p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10">
        <div className="mx-auto max-w-lg">
          <NetworkErrorState
            message={loadError}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        </div>
      </main>
    );
  }

  if (!vehicle) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white">
          <EmptyState
            icon={<QrCode className="h-5 w-5" />}
            title="QR Code ainda não disponível"
            description="O número MobiGest e o QR público só ficam disponíveis depois da aprovação do processo de registo."
            action={
              <Link
                to="/veiculos/$id"
                params={{ id }}
                className="mobigest-button inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
              >
                Voltar ao veículo
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 print:bg-white print:p-0">
      <PageTransition>
        <div className="mobigest-no-print mx-auto mb-5 flex max-w-lg flex-wrap items-center justify-between gap-3">
          <Link
            to="/veiculos/$id"
            params={{ id }}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-sky-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao veículo
          </Link>

          <div className="flex flex-wrap gap-2">
            <LoadingButton
              onClick={copyPublicLink}
              state={copying ? "loading" : "idle"}
              idleLabel="Copiar link"
              loadingLabel="A copiar..."
              icon={<Copy className="h-4 w-4" />}
              className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            />
            <button
              type="button"
              onClick={downloadQr}
              className="mobigest-button inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Baixar QR
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="mobigest-button inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>
        </div>

        <div className="mx-auto flex min-h-[calc(100vh-130px)] max-w-lg items-center justify-center print:min-h-0 print:max-w-none">
          <section className="w-full rounded-2xl border-2 border-slate-900 bg-white p-8 text-center shadow-sm print:w-[90mm] print:rounded-none print:shadow-none">
            <img
              src="/mobigest-logo.svg"
              alt="MobiGest"
              className="mx-auto h-11 w-auto"
            />

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Identificação pública
            </p>

            <div
              ref={qrContainerRef}
              className="mx-auto mt-5 flex h-52 w-52 items-center justify-center rounded-2xl border border-slate-200 bg-white"
            >
              <QRCodeSVG
                value={publicUrl}
                size={176}
                level="M"
                includeMargin
                title={"QR " + vehicle.mobigest_number}
              />
            </div>

            <h1 className="mt-5 break-all text-2xl font-bold tracking-tight text-slate-950">
              {vehicle.mobigest_number}
            </h1>

            <p className="mt-2 text-sm font-medium text-slate-700">
              {[vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
                vehicleTypeLabel(vehicle.vehicle_type)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {vehicleTypeLabel(vehicle.vehicle_type)} ·{" "}
              {vehicle.municipalityName}
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              Digitalize para verificar o registo no MobiGest
            </div>

            <p className="mt-5 break-all text-[10px] leading-4 text-slate-400">
              {publicUrl}
            </p>
          </section>
        </div>
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
