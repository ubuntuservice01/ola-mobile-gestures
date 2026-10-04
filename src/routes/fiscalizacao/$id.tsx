import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  ExternalLink,
  FileText,
  MapPin,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import {
  createEvidenceViewUrl,
  uploadFiscalizationEvidence,
} from "../../lib/enforcement";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/fiscalizacao/$id")({
  component: FiscalizationDetail,
});

type Fiscalization = {
  id: string;
  municipality_id: string;
  vehicle_id: string;
  administrative_post_id: string | null;
  locality_id: string | null;
  result: string;
  occurrence: string | null;
  observation: string | null;
  evidence_count: number;
  fiscal_id: string | null;
  occurred_at: string;
  created_at: string;
};

type Vehicle = {
  id: string;
  mobigest_number: string | null;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  status: string;
};

type Evidence = {
  id: string;
  file_path: string;
  description: string | null;
  created_at: string;
};

function FiscalizationDetail() {
  const { id } = Route.useParams();

  const [fiscalization, setFiscalization] = useState<Fiscalization | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [postName, setPostName] = useState("—");
  const [localityName, setLocalityName] = useState("—");
  const [fiscalName, setFiscalName] = useState("Fiscal não identificado");
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [newEvidence, setNewEvidence] = useState<File | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const fiscalizationResult = await supabase
        .from("fiscalizations")
        .select(
          "id, municipality_id, vehicle_id, administrative_post_id, locality_id, result, occurrence, observation, evidence_count, fiscal_id, occurred_at, created_at",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (fiscalizationResult.error || !fiscalizationResult.data) {
        console.error(
          "Falha ao carregar fiscalização:",
          fiscalizationResult.error,
        );
        setLoadError("Fiscalização não encontrada ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      const current = fiscalizationResult.data as Fiscalization;

      const [
        vehicleResult,
        postResult,
        localityResult,
        fiscalResult,
        evidenceResult,
      ] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id, mobigest_number, vehicle_type, make, model, status")
          .eq("id", current.vehicle_id)
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
        current.fiscal_id
          ? supabase
              .from("profiles")
              .select("full_name")
              .eq("id", current.fiscal_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("fiscalization_evidence")
          .select("id, file_path, description, created_at")
          .eq("fiscalization_id", current.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      const error =
        vehicleResult.error ??
        postResult.error ??
        localityResult.error ??
        fiscalResult.error ??
        evidenceResult.error;

      if (error) {
        console.error("Falha ao carregar detalhe da fiscalização:", error);
        setLoadError(
          "A fiscalização foi encontrada, mas os dados relacionados não puderam ser carregados.",
        );
        setLoading(false);
        return;
      }

      setFiscalization(current);
      setVehicle(vehicleResult.data as Vehicle | null);
      setPostName(postResult.data?.name ?? "—");
      setLocalityName(localityResult.data?.name ?? "—");
      setFiscalName(fiscalResult.data?.full_name ?? "Fiscal não identificado");
      setEvidence((evidenceResult.data ?? []) as Evidence[]);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, refreshToken]);

  const addEvidence = async () => {
    if (!fiscalization || !newEvidence || uploading) return;

    setUploading(true);
    setActionError(null);
    setMessage(null);

    try {
      await uploadFiscalizationEvidence({
        municipalityId: fiscalization.municipality_id,
        fiscalizationId: fiscalization.id,
        file: newEvidence,
        description: evidenceDescription.trim() || null,
      });

      setNewEvidence(null);
      setEvidenceDescription("");
      setMessage("Evidência adicionada à fiscalização.");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao adicionar evidência:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar a evidência.",
      );
    } finally {
      setUploading(false);
    }
  };

  const openEvidence = async (item: Evidence) => {
    setOpeningId(item.id);
    setActionError(null);

    try {
      const url = await createEvidenceViewUrl(item.file_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Falha ao abrir evidência:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir a evidência.",
      );
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <MobiGestShell
      title="Detalhe da fiscalização"
      subtitle="Ocorrência, agente, território e evidências."
    >
      <Link
        to="/fiscalizacao"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à fiscalização
      </Link>

      {loading ? (
        <Card className="p-10 text-sm text-slate-500">
          A carregar fiscalização...
        </Card>
      ) : loadError || !fiscalization ? (
        <Card className="p-10 text-sm font-medium text-red-700">
          {loadError ?? "Fiscalização não encontrada."}
        </Card>
      ) : (
        <div className="space-y-6">
          {actionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {actionError}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card className="p-7">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Fiscalização
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    {vehicle?.mobigest_number || fiscalization.vehicle_id}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(fiscalization.occurred_at).toLocaleString("pt-MZ")}
                  </p>
                </div>
                <ResultBadge result={fiscalization.result} />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info
                  label="Veículo"
                  value={
                    [vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ||
                    vehicleTypeLabel(vehicle?.vehicle_type)
                  }
                />
                <Info
                  label="Estado do veículo"
                  value={vehicleStatusLabel(vehicle?.status)}
                />
                <Info label="Posto administrativo" value={postName} />
                <Info label="Localidade / bairro" value={localityName} />
                <Info label="Fiscal" value={fiscalName} />
                <Info
                  label="Evidências"
                  value={String(evidence.length)}
                />
              </div>

              <div className="mt-6">
                <p className="text-xs text-slate-400">Ocorrência / natureza</p>
                <p className="mt-1 text-sm font-semibold">
                  {fiscalization.occurrence || "Não informada"}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-xs text-slate-400">Observações</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {fiscalization.observation || "Sem observações."}
                </p>
              </div>

              {vehicle && (
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to="/veiculos/$id"
                    params={{ id: vehicle.id }}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                  >
                    Abrir veículo
                  </Link>
                  {fiscalization.result === "irregular" && (
                    <Link
                      to="/multas/nova"
                      className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      Emitir multa
                    </Link>
                  )}
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <ShieldCheck className="h-5 w-5 text-sky-600" />
                <p className="mt-3 text-sm font-semibold">
                  Registo institucional
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Criado pelo utilizador autenticado, com data/hora, veículo e
                  âmbito municipal preservados.
                </p>
              </Card>

              <Card className="p-5">
                <UserRoundCheck className="h-5 w-5 text-sky-600" />
                <p className="mt-3 text-xs text-slate-400">Agente</p>
                <p className="mt-1 text-sm font-semibold">{fiscalName}</p>
              </Card>

              <Card className="p-5">
                <MapPin className="h-5 w-5 text-sky-600" />
                <p className="mt-3 text-xs text-slate-400">Território</p>
                <p className="mt-1 text-sm font-semibold">
                  {postName}
                  {localityName !== "—" ? " · " + localityName : ""}
                </p>
              </Card>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 p-6">
              <h3 className="font-semibold">Evidências privadas</h3>
              <p className="mt-1 text-sm text-slate-500">
                Ficheiros visíveis apenas para perfis autorizados do município.
              </p>
            </div>

            <div className="border-b border-slate-100 bg-slate-50/60 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">
                  Ficheiro
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setNewEvidence(event.target.files?.[0] ?? null)
                    }
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm font-medium">
                  Descrição
                  <input
                    value={evidenceDescription}
                    onChange={(event) =>
                      setEvidenceDescription(event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                    placeholder="Ex.: fotografia do documento apresentado"
                  />
                </label>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={!newEvidence || uploading}
                  onClick={addEvidence}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Camera className="h-4 w-4" />
                  {uploading ? "A carregar..." : "Adicionar evidência"}
                </button>
              </div>
            </div>

            {evidence.length === 0 ? (
              <div className="p-8 text-sm text-slate-500">
                Ainda não existem evidências associadas.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {evidence.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-4 p-5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                      <FileText className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {item.description || "Evidência da fiscalização"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleString("pt-MZ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={openingId === item.id}
                      onClick={() => openEvidence(item)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {openingId === item.id ? "A abrir..." : "Ver evidência"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </MobiGestShell>
  );
}

function ResultBadge({ result }: { result: string }) {
  const labels: Record<string, string> = {
    regular: "Regular",
    irregular: "Irregular",
    pendente: "Pendente",
    nao_localizado: "Não localizado",
    outro: "Outro",
  };

  const className =
    result === "regular"
      ? "bg-emerald-50 text-emerald-700"
      : result === "irregular"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={"rounded-full px-3 py-1.5 text-xs font-semibold " + className}
    >
      {labels[result] ?? result}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function vehicleTypeLabel(type?: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return "Veículo";
}

function vehicleStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    activa: "Activa",
    suspensa: "Suspensa",
    roubada: "Roubada",
    apreendida: "Apreendida",
    cancelada: "Cancelada",
  };
  return status ? labels[status] ?? status : "—";
}
