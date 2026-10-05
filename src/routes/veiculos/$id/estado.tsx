import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  ShieldAlert,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";
import {
  publishVehicleSale,
  setVehicleCommercialStatus,
  setVehicleOperationalStatus,
  type VehicleOperationalStatus,
  type VehicleSaleCondition,
} from "../../../lib/vehicles";
import { supabase } from "../../../lib/supabase";
import { useSessionDraft } from "../../../hooks/use-session-draft";
import { notify } from "../../../components/mobigest/Experience";

export const Route = createFileRoute("/veiculos/$id/estado")({
  component: AlterarEstado,
});

const STATE_INFO: Array<{
  value: VehicleOperationalStatus;
  label: string;
  description: string;
}> = [
  { value: "activa", label: "Activa", description: "Veículo regularmente registado e operacional." },
  { value: "suspensa", label: "Suspensa", description: "Registo temporariamente suspenso por decisão administrativa." },
  { value: "roubada", label: "Roubada", description: "Veículo declarado como roubado." },
  { value: "apreendida", label: "Apreendida", description: "Veículo retido pelas autoridades competentes." },
  { value: "cancelada", label: "Cancelada", description: "Registo cancelado administrativamente." },
];

const TRANSITIONS: Record<VehicleOperationalStatus, VehicleOperationalStatus[]> = {
  activa: ["suspensa", "roubada", "apreendida", "cancelada"],
  suspensa: ["activa", "cancelada"],
  roubada: ["activa", "cancelada"],
  apreendida: ["activa", "cancelada"],
  cancelada: [],
};

const CONDITIONS: Array<{ value: VehicleSaleCondition; label: string }> = [
  { value: "excelente", label: "Excelente" },
  { value: "boa", label: "Boa" },
  { value: "razoavel", label: "Razoável" },
  { value: "necessita_reparacao", label: "Necessita reparação" },
];

function AlterarEstado() {
  const { id } = Route.useParams();
  const [vehicleNumber, setVehicleNumber] = useState("—");
  const [municipalityId, setMunicipalityId] = useState("");
  const [currentStatus, setCurrentStatus] = useState<VehicleOperationalStatus>("activa");
  const [commercialStatus, setCommercialStatus] = useState<"normal" | "a_venda">("normal");
  const [newStatus, setNewStatus] = useState<VehicleOperationalStatus | "">("");
  const [reason, setReason] = useState("");
  const [occurrenceReference, setOccurrenceReference] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");

  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<VehicleSaleCondition>("boa");
  const [declaredProblems, setDeclaredProblems] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [location, setLocation] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [existingPhotoPaths, setExistingPhotoPaths] = useState<string[]>([]);
  const [removedPhotoPaths, setRemovedPhotoPaths] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingCommercial, setSavingCommercial] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const operationalDraft = useSessionDraft({
    key: "veiculos:" + id + ":estado-operacional",
    value: { newStatus, reason, occurrenceReference },
    restore: (draft) => {
      setNewStatus(draft.newStatus ?? "");
      setReason(draft.reason ?? "");
      setOccurrenceReference(draft.occurrenceReference ?? "");
      notify.info("Rascunho operacional recuperado automaticamente.");
    },
    isMeaningful: (draft) =>
      Boolean(draft.newStatus || draft.reason?.trim() || draft.occurrenceReference?.trim()),
  });

  const previewUrls = useMemo(
    () => newPhotos.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newPhotos],
  );

  useEffect(() => {
    return () => previewUrls.forEach((item) => URL.revokeObjectURL(item.url));
  }, [previewUrls]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("vehicles")
        .select("mobigest_number, municipality_id, locality_id, current_owner_id, status, commercial_status")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        console.error("Falha ao carregar estado do veículo:", error);
        setLoadError("Veículo não encontrado ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      setVehicleNumber(data.mobigest_number ?? "Aguardando aprovação");
      setMunicipalityId(data.municipality_id);
      setCurrentStatus(data.status as VehicleOperationalStatus);
      setCommercialStatus(data.commercial_status as "normal" | "a_venda");

      const [ownerResult, localityResult, listingResult, photosResult] = await Promise.all([
        data.current_owner_id
          ? supabase
              .from("owners")
              .select("full_name, phone, address")
              .eq("id", data.current_owner_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        data.locality_id
          ? supabase.from("localities").select("name").eq("id", data.locality_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("vehicle_sale_listings")
          .select("price, vehicle_condition, declared_problems, public_contact_name, public_contact_phone, public_location, consent_confirmed")
          .eq("vehicle_id", id)
          .maybeSingle(),
        supabase
          .from("vehicle_sale_photos")
          .select("file_path, position")
          .eq("vehicle_id", id)
          .order("position", { ascending: true }),
      ]);

      if (!active) return;

      if (ownerResult.error || localityResult.error || listingResult.error || photosResult.error) {
        console.error("Falha ao carregar dados comerciais:", {
          owner: ownerResult.error,
          locality: localityResult.error,
          listing: listingResult.error,
          photos: photosResult.error,
        });
      }

      const listing = listingResult.data;
      setPrice(listing?.price ? String(listing.price) : "");
      setCondition((listing?.vehicle_condition as VehicleSaleCondition | undefined) ?? "boa");
      setDeclaredProblems(listing?.declared_problems ?? "");
      setContactName(listing?.public_contact_name ?? ownerResult.data?.full_name ?? "");
      setContactPhone(listing?.public_contact_phone ?? ownerResult.data?.phone ?? "");
      setLocation(listing?.public_location ?? localityResult.data?.name ?? ownerResult.data?.address ?? "");
      setConsentConfirmed(Boolean(listing?.consent_confirmed));
      setExistingPhotoPaths((photosResult.data ?? []).map((photo) => photo.file_path));
      setRemovedPhotoPaths([]);
      setNewPhotos([]);

      if (!operationalDraft.hasStoredDraft) setNewStatus("");
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const allowedTransitions = useMemo(
    () => TRANSITIONS[currentStatus] ?? [],
    [currentStatus],
  );

  const totalPhotos = existingPhotoPaths.length + newPhotos.length;
  const saleFormValid =
    currentStatus === "activa" &&
    Number(price) > 0 &&
    contactName.trim().length >= 2 &&
    contactPhone.trim().length >= 7 &&
    location.trim().length >= 2 &&
    totalPhotos >= 1 &&
    totalPhotos <= 6 &&
    consentConfirmed;

  const saveStatus = async () => {
    if (!newStatus || reason.trim().length < 4 || savingStatus) return;

    setSavingStatus(true);
    setActionError(null);
    setMessage(null);

    try {
      await setVehicleOperationalStatus({
        vehicleId: id,
        status: newStatus,
        reason: reason.trim(),
        occurrenceReference: occurrenceReference.trim() || null,
      });

      operationalDraft.clearDraft();
      setCurrentStatus(newStatus);
      if (newStatus !== "activa") setCommercialStatus("normal");
      setNewStatus("");
      setReason("");
      setOccurrenceReference("");
      setMessage("Estado operacional actualizado e registado no histórico.");
    } catch (error) {
      console.error("Falha ao alterar estado:", error);
      setActionError(error instanceof Error ? error.message : "Não foi possível alterar o estado.");
    } finally {
      setSavingStatus(false);
    }
  };

  const publishSale = async () => {
    if (!saleFormValid || savingCommercial) return;

    setSavingCommercial(true);
    setActionError(null);
    setMessage(null);

    const uploadedPaths: string[] = [];
    try {
      for (let index = 0; index < newPhotos.length; index += 1) {
        const file = newPhotos[index];
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
        const path = `${municipalityId}/${id}/${Date.now()}-${index + 1}-${safeName}`;

        const { error } = await supabase.storage
          .from("mobigest-sale-photos")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (error) throw error;
        uploadedPaths.push(path);
      }

      const allPhotoPaths = [...existingPhotoPaths, ...uploadedPaths];

      await publishVehicleSale({
        vehicleId: id,
        price: Number(price),
        vehicleCondition: condition,
        declaredProblems: declaredProblems.trim() || null,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        location: location.trim(),
        photoPaths: allPhotoPaths,
        consentConfirmed,
      });

      if (removedPhotoPaths.length) {
        await supabase.storage.from("mobigest-sale-photos").remove(removedPhotoPaths);
      }
      setExistingPhotoPaths(allPhotoPaths);
      setRemovedPhotoPaths([]);
      setNewPhotos([]);
      setCommercialStatus("a_venda");
      setMessage(
        commercialStatus === "a_venda"
          ? "Anúncio de venda actualizado. As alterações já estão disponíveis na consulta pública."
          : "Veículo publicado à venda. Já aparece automaticamente na consulta pública.",
      );
    } catch (error) {
      if (uploadedPaths.length) {
        await supabase.storage.from("mobigest-sale-photos").remove(uploadedPaths);
      }
      console.error("Falha ao publicar venda:", error);
      setActionError(error instanceof Error ? error.message : "Não foi possível publicar a venda.");
    } finally {
      setSavingCommercial(false);
    }
  };

  const withdrawSale = async () => {
    if (withdrawReason.trim().length < 4 || savingCommercial) return;

    setSavingCommercial(true);
    setActionError(null);
    setMessage(null);

    try {
      await setVehicleCommercialStatus({
        vehicleId: id,
        status: "normal",
        reason: withdrawReason.trim(),
      });
      setCommercialStatus("normal");
      setWithdrawReason("");
      setMessage("Veículo retirado da venda. Já não aparece na consulta pública.");
    } catch (error) {
      console.error("Falha ao retirar veículo da venda:", error);
      setActionError(error instanceof Error ? error.message : "Não foi possível retirar o veículo da venda.");
    } finally {
      setSavingCommercial(false);
    }
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const allowed = Array.from(files).filter(
      (file) => file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp",
    );
    const remaining = Math.max(0, 6 - existingPhotoPaths.length - newPhotos.length);
    setNewPhotos((current) => [...current, ...allowed.slice(0, remaining)]);
  };

  const removeExistingPhoto = (path: string) => {
    setExistingPhotoPaths((current) => current.filter((item) => item !== path));
    setRemovedPhotoPaths((current) => [...current, path]);
  };

  const publicPhotoUrl = (path: string) =>
    supabase.storage.from("mobigest-sale-photos").getPublicUrl(path).data.publicUrl;

  return (
    <MobiGestShell
      title="Alterar estado"
      subtitle="Registar mudanças operacionais e gerir a publicação pública de venda."
    >
      <Link
        to="/veiculos/$id"
        params={{ id }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao veículo
      </Link>

      {loading ? (
        <Card className="mx-auto max-w-4xl p-8 text-sm text-slate-500">
          A carregar estado do veículo...
        </Card>
      ) : loadError ? (
        <Card className="mx-auto max-w-4xl p-8 text-sm font-medium text-red-700">
          {loadError}
        </Card>
      ) : (
        <div className="mx-auto max-w-4xl space-y-6">
          <Card className="p-7">
            <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle />
              </div>
              <div>
                <p className="text-xs text-slate-400">Número MobiGest</p>
                <h2 className="text-xl font-bold">{vehicleNumber}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Estado actual: <b>{stateLabel(currentStatus)}</b>
                </p>
              </div>
            </div>

            <div className="mt-7">
              <h3 className="font-semibold">Nova situação operacional</h3>
              <p className="mt-1 text-sm text-slate-500">
                Só são apresentadas transições permitidas a partir do estado actual.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {STATE_INFO.map((state) => {
                  const allowed = allowedTransitions.includes(state.value);
                  return (
                    <label
                      key={state.value}
                      className={
                        "rounded-xl border p-4 " +
                        (allowed
                          ? "cursor-pointer border-slate-200 hover:border-sky-300 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50"
                          : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-50")
                      }
                    >
                      <input
                        type="radio"
                        name="estado"
                        value={state.value}
                        checked={newStatus === state.value}
                        disabled={!allowed}
                        onChange={() => setNewStatus(state.value)}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-sky-600" />
                        {state.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {state.description}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                Motivo *
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Motivo da alteração"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>
              <label className="text-sm font-medium">
                Referência da ocorrência
                <input
                  value={occurrenceReference}
                  onChange={(event) => setOccurrenceReference(event.target.value)}
                  placeholder="Ex.: auto, participação, expediente..."
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!newStatus || reason.trim().length < 4 || savingStatus}
                onClick={saveStatus}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                <ShieldAlert className="h-4 w-4" />
                {savingStatus ? "A guardar..." : "Guardar estado operacional"}
              </button>
            </div>
          </Card>

          <Card className="p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <ShoppingCart />
              </div>
              <div>
                <h3 className="font-semibold">Declaração de venda</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  O técnico publica o anúncio depois da declaração do proprietário. Os dados abaixo serão públicos.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
              Estado comercial:{" "}
              <b>{commercialStatus === "a_venda" ? "À venda — publicado" : "Normal — não publicado"}</b>
            </div>

            {currentStatus !== "activa" && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Apenas veículos com estado operacional <b>Activo</b> podem ser publicados à venda.
              </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                Preço (MT) *
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="Ex.: 65000"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>
              <label className="text-sm font-medium">
                Condição *
                <select
                  value={condition}
                  onChange={(event) => setCondition(event.target.value as VehicleSaleCondition)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                >
                  {CONDITIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Nome público do proprietário/vendedor *
                <input
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>
              <label className="text-sm font-medium">
                Contacto público *
                <input
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  inputMode="tel"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>
              <label className="text-sm font-medium md:col-span-2">
                Bairro / localidade *
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Bairro ou localidade onde o veículo pode ser encontrado"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>
              <label className="text-sm font-medium md:col-span-2">
                Problemas ou condições declaradas
                <textarea
                  value={declaredProblems}
                  onChange={(event) => setDeclaredProblems(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="Ex.: pneu traseiro gasto, pequeno risco no depósito, precisa trocar bateria..."
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3"
                />
              </label>
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold">Fotografias públicas</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Adicione entre 1 e 6 fotos reais do veículo. Formatos JPG, PNG ou WEBP.
                  </p>
                </div>
                <label className={"inline-flex cursor-pointer items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 " + (totalPhotos >= 6 ? "pointer-events-none opacity-50" : "")}>
                  <ImagePlus className="h-4 w-4" />
                  Adicionar fotos
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      addPhotos(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {existingPhotoPaths.map((path, index) => (
                  <div key={path} className="group relative aspect-[4/3] overflow-hidden rounded-xl border bg-slate-100">
                    <img src={publicPhotoUrl(path)} alt={`Foto ${index + 1} do veículo`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(path)}
                      className="absolute right-2 top-2 rounded-lg bg-black/65 p-2 text-white"
                      aria-label="Remover fotografia"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {previewUrls.map(({ file, url }, index) => (
                  <div key={file.name + index} className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-slate-100">
                    <img src={url} alt={`Nova foto ${index + 1} do veículo`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))}
                      className="absolute right-2 top-2 rounded-lg bg-black/65 p-2 text-white"
                      aria-label="Remover fotografia"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs font-medium text-slate-500">{totalPhotos}/6 fotografias seleccionadas</p>
            </div>

            <label className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(event) => setConsentConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                Confirmo que o proprietário declarou a venda e autorizou a publicação do nome, contacto, bairro/localidade, preço, condição, problemas declarados e fotografias deste veículo.
              </span>
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {commercialStatus === "a_venda" && (
                <div className="flex w-full flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end">
                  <label className="flex-1 text-sm font-medium">
                    Motivo para retirar da venda *
                    <input
                      value={withdrawReason}
                      onChange={(event) => setWithdrawReason(event.target.value)}
                      placeholder="Ex.: vendido, proprietário desistiu..."
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={withdrawReason.trim().length < 4 || savingCommercial}
                    onClick={withdrawSale}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 disabled:opacity-40"
                  >
                    Retirar da venda
                  </button>
                </div>
              )}

              <button
                type="button"
                disabled={!saleFormValid || savingCommercial}
                onClick={publishSale}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {savingCommercial
                  ? "A publicar..."
                  : commercialStatus === "a_venda"
                    ? "Actualizar anúncio"
                    : "Publicar à venda"}
              </button>
            </div>
          </Card>

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
        </div>
      )}
    </MobiGestShell>
  );
}

function stateLabel(status: VehicleOperationalStatus) {
  const labels: Record<VehicleOperationalStatus, string> = {
    activa: "Activa",
    suspensa: "Suspensa",
    roubada: "Roubada",
    apreendida: "Apreendida",
    cancelada: "Cancelada",
  };
  return labels[status];
}
