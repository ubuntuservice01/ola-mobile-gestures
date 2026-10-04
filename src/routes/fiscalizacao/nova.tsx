import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import {
  createFiscalization,
  uploadFiscalizationEvidence,
  type FiscalizationResult,
} from "../../lib/enforcement";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/fiscalizacao/nova")({
  component: NovaFiscalizacao,
});

type Vehicle = {
  id: string;
  municipality_id: string;
  administrative_post_id: string | null;
  locality_id: string | null;
  mobigest_number: string | null;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  status: string;
  commercial_status: string;
};

type Post = { id: string; name: string };
type Locality = {
  id: string;
  administrative_post_id: string;
  name: string;
};

function NovaFiscalizacao() {
  const [code, setCode] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [result, setResult] = useState<FiscalizationResult>("regular");
  const [occurrence, setOccurrence] = useState("");
  const [observation, setObservation] = useState("");
  const [postId, setPostId] = useState("");
  const [localityId, setLocalityId] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [evidenceWarning, setEvidenceWarning] = useState<string | null>(null);

  const availableLocalities = useMemo(
    () =>
      localities.filter(
        (locality) =>
          !postId || locality.administrative_post_id === postId,
      ),
    [localities, postId],
  );

  const searchVehicle = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized || searching) return;

    setSearching(true);
    setErrorMessage(null);
    setVehicle(null);

    const vehicleResult = await supabase
      .from("vehicles")
      .select(
        "id, municipality_id, administrative_post_id, locality_id, mobigest_number, vehicle_type, make, model, status, commercial_status",
      )
      .eq("mobigest_number", normalized)
      .maybeSingle();

    if (vehicleResult.error || !vehicleResult.data) {
      console.error("Falha ao localizar veículo:", vehicleResult.error);
      setErrorMessage(
        vehicleResult.error
          ? "Não foi possível pesquisar o veículo."
          : "Nenhum veículo foi encontrado com este número MobiGest.",
      );
      setSearching(false);
      return;
    }

    const current = vehicleResult.data as Vehicle;

    const [postsResult, localitiesResult] = await Promise.all([
      supabase
        .from("administrative_posts")
        .select("id, name")
        .eq("municipality_id", current.municipality_id)
        .eq("status", "activo")
        .order("name", { ascending: true }),
      supabase
        .from("localities")
        .select("id, administrative_post_id, name")
        .eq("municipality_id", current.municipality_id)
        .eq("status", "activo")
        .order("name", { ascending: true }),
    ]);

    if (postsResult.error || localitiesResult.error) {
      console.error(
        "Falha ao carregar território da fiscalização:",
        postsResult.error ?? localitiesResult.error,
      );
      setErrorMessage("O veículo foi encontrado, mas o território não pôde ser carregado.");
      setSearching(false);
      return;
    }

    setVehicle(current);
    setPosts((postsResult.data ?? []) as Post[]);
    setLocalities((localitiesResult.data ?? []) as Locality[]);
    setPostId(current.administrative_post_id ?? "");
    setLocalityId(current.locality_id ?? "");
    setSearching(false);
  };

  const save = async () => {
    if (!vehicle || !confirmed || saving) return;

    setSaving(true);
    setErrorMessage(null);
    setEvidenceWarning(null);

    try {
      const fiscalizationId = await createFiscalization({
        vehicleId: vehicle.id,
        result,
        occurrence: occurrence.trim() || null,
        observation: observation.trim() || null,
        administrativePostId: postId || null,
        localityId: localityId || null,
      });

      if (evidence) {
        try {
          await uploadFiscalizationEvidence({
            municipalityId: vehicle.municipality_id,
            fiscalizationId,
            file: evidence,
            description: evidenceDescription.trim() || null,
          });
        } catch (evidenceError) {
          console.error("Fiscalização criada, mas evidência falhou:", evidenceError);
          setEvidenceWarning(
            evidenceError instanceof Error
              ? evidenceError.message
              : "A fiscalização foi criada, mas a evidência não pôde ser carregada.",
          );
        }
      }

      setCreatedId(fiscalizationId);
    } catch (error) {
      console.error("Falha ao registar fiscalização:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível registar a fiscalização.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (createdId) {
    return (
      <MobiGestShell
        title="Fiscalização registada"
        subtitle="A ocorrência foi guardada e auditada."
      >
        <Card className="mx-auto max-w-2xl p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-4 text-2xl font-bold">Fiscalização concluída</h2>
          <p className="mt-2 text-sm text-slate-500">
            {vehicle?.mobigest_number} · {resultLabel(result)}
          </p>

          {evidenceWarning && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-800">
              O registo foi criado, mas a evidência precisa ser adicionada novamente:{" "}
              {evidenceWarning}
            </div>
          )}

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/fiscalizacao/$id"
              params={{ id: createdId }}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Abrir fiscalização
            </Link>
            <Link
              to="/fiscalizacao"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
            >
              Voltar
            </Link>
          </div>
        </Card>
      </MobiGestShell>
    );
  }

  return (
    <MobiGestShell
      title="Nova fiscalização"
      subtitle="Registar uma verificação de campo."
    >
      <Link
        to="/fiscalizacao"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à fiscalização
      </Link>

      <div className="mx-auto max-w-4xl">
        <Card className="p-7">
          <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <ShieldCheck />
            </div>
            <div>
              <h2 className="text-xl font-bold">Identificar veículo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Pesquise pelo número MobiGest. O QR do veículo abre a mesma
                identificação pública e pode ser usado para copiar o código.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <div className="flex flex-1 items-center rounded-xl border border-slate-300 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void searchVehicle();
                  }
                }}
                placeholder="MZ-LIC-000001"
                className="h-12 flex-1 px-3 outline-none"
              />
            </div>
            <button
              type="button"
              disabled={!code.trim() || searching}
              onClick={searchVehicle}
              className="rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {searching ? "A verificar..." : "Verificar"}
            </button>
          </div>

          {vehicle && (
            <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-900">
                    Veículo encontrado
                  </p>
                  <p className="mt-1 text-sm text-emerald-800">
                    {vehicle.mobigest_number} ·{" "}
                    {vehicleTypeLabel(vehicle.vehicle_type)} ·{" "}
                    {[vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
                      "Sem marca/modelo"}{" "}
                    · Estado: {vehicleStatusLabel(vehicle.status)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {vehicle && (
            <>
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">
                  Resultado da fiscalização *
                  <select
                    value={result}
                    onChange={(event) =>
                      setResult(event.target.value as FiscalizationResult)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                  >
                    <option value="regular">Regular</option>
                    <option value="irregular">Irregular</option>
                    <option value="pendente">Pendente de análise</option>
                    <option value="nao_localizado">Não localizado</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Ocorrência / natureza
                  <input
                    value={occurrence}
                    onChange={(event) => setOccurrence(event.target.value)}
                    placeholder="Ex.: documentação irregular, lotação..."
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                  />
                </label>

                <label className="text-sm font-medium">
                  Posto administrativo
                  <select
                    value={postId}
                    onChange={(event) => {
                      setPostId(event.target.value);
                      setLocalityId("");
                    }}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                  >
                    <option value="">Não definido</option>
                    {posts.map((post) => (
                      <option key={post.id} value={post.id}>
                        {post.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Localidade / bairro
                  <select
                    value={localityId}
                    onChange={(event) => setLocalityId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                  >
                    <option value="">Não definida</option>
                    {availableLocalities.map((locality) => (
                      <option key={locality.id} value={locality.id}>
                        {locality.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <MapPin className="h-4 w-4" />
                A localização administrativa é validada pelo servidor contra o
                município do veículo.
              </div>

              <label className="mt-5 block text-sm font-medium">
                Observações
                <textarea
                  value={observation}
                  onChange={(event) => setObservation(event.target.value)}
                  className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3"
                  placeholder="Descreva a verificação efectuada."
                />
              </label>

              <div className="mt-5 rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold">Evidência opcional</p>
                <p className="mt-1 text-xs text-slate-500">
                  PDF, JPG, PNG ou WEBP, até 10 MB. O ficheiro fica privado.
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium">
                    Ficheiro
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        setEvidence(event.target.files?.[0] ?? null)
                      }
                      className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Descrição da evidência
                    <input
                      value={evidenceDescription}
                      onChange={(event) =>
                        setEvidenceDescription(event.target.value)
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                    />
                  </label>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <Camera className="h-4 w-4" />
                  A evidência fica vinculada ao registo depois da fiscalização
                  ser criada.
                </div>
              </div>

              <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                Confirmo que realizei esta fiscalização e que os dados
                correspondem à verificação efectuada.
              </label>
            </>
          )}

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <Link
              to="/fiscalizacao"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
            >
              Cancelar
            </Link>
            <button
              type="button"
              disabled={!vehicle || !confirmed || saving}
              onClick={save}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? "A registar..." : "Registar fiscalização"}
            </button>
          </div>
        </Card>
      </div>
    </MobiGestShell>
  );
}

function resultLabel(result: FiscalizationResult) {
  const labels: Record<FiscalizationResult, string> = {
    regular: "Regular",
    irregular: "Irregular",
    pendente: "Pendente",
    nao_localizado: "Não localizado",
    outro: "Outro",
  };
  return labels[result];
}

function vehicleTypeLabel(type: string) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  if (type === "bicicleta") return "Bicicleta";
  return type;
}

function vehicleStatusLabel(status: string) {
  const labels: Record<string, string> = {
    activa: "Activa",
    suspensa: "Suspensa",
    roubada: "Roubada",
    apreendida: "Apreendida",
    cancelada: "Cancelada",
  };
  return labels[status] ?? status;
}
