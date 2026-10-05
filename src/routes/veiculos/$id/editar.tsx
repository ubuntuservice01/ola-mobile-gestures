import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";
import { updateVehicleCore } from "../../../lib/vehicles";
import { supabase } from "../../../lib/supabase";
import { useSessionDraft } from "../../../hooks/use-session-draft";
import { notify } from "../../../components/mobigest/Experience";

export const Route = createFileRoute("/veiculos/$id/editar")({
  component: EditarVeiculo,
});

type Post = { id: string; name: string; status: string };
type Locality = {
  id: string;
  administrative_post_id: string;
  name: string;
  status: string;
};

function EditarVeiculo() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [vehicleType, setVehicleType] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [postId, setPostId] = useState("");
  const [localityId, setLocalityId] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [frameNumber, setFrameNumber] = useState("");
  const [engineNumber, setEngineNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [manufactureYear, setManufactureYear] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<Record<string, string> | null>(null);

  const vehicleDraft = useSessionDraft({
    key: "veiculos:" + id + ":editar",
    value: {
      postId,
      localityId,
      plateNumber,
      chassisNumber,
      frameNumber,
      engineNumber,
      make,
      model,
      color,
      manufactureYear,
      notes,
    },
    restore: (draft) => {
      setPostId(draft.postId ?? "");
      setLocalityId(draft.localityId ?? "");
      setPlateNumber(draft.plateNumber ?? "");
      setChassisNumber(draft.chassisNumber ?? "");
      setFrameNumber(draft.frameNumber ?? "");
      setEngineNumber(draft.engineNumber ?? "");
      setMake(draft.make ?? "");
      setModel(draft.model ?? "");
      setColor(draft.color ?? "");
      setManufactureYear(draft.manufactureYear ?? "");
      setNotes(draft.notes ?? "");
      notify.info("Rascunho recuperado automaticamente.");
    },
    isMeaningful: (draft) => {
      if (!baseline) {
        return Boolean(
          draft.plateNumber?.trim() ||
            draft.chassisNumber?.trim() ||
            draft.frameNumber?.trim() ||
            draft.make?.trim() ||
            draft.model?.trim() ||
            draft.notes?.trim(),
        );
      }
      return JSON.stringify(draft) !== JSON.stringify(baseline);
    },
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [vehicleResult, postsResult, localitiesResult] = await Promise.all([
        supabase
          .from("vehicles")
          .select(
            "id, vehicle_type, administrative_post_id, locality_id, plate_number, chassis_number, frame_number, engine_number, make, model, color, manufacture_year, notes",
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("administrative_posts")
          .select("id, name, status")
          .order("name", { ascending: true }),
        supabase
          .from("localities")
          .select("id, administrative_post_id, name, status")
          .order("name", { ascending: true }),
      ]);

      if (!active) return;

      const error =
        vehicleResult.error ?? postsResult.error ?? localitiesResult.error;

      if (error || !vehicleResult.data) {
        console.error("Falha ao carregar veículo para edição:", error);
        setLoadError("Não foi possível carregar o veículo.");
        setLoading(false);
        return;
      }

      const vehicle = vehicleResult.data;
      setVehicleType(vehicle.vehicle_type ?? "");
      setPosts((postsResult.data ?? []) as Post[]);
      setLocalities((localitiesResult.data ?? []) as Locality[]);
      const serverValues = {
        postId: vehicle.administrative_post_id ?? "",
        localityId: vehicle.locality_id ?? "",
        plateNumber: vehicle.plate_number ?? "",
        chassisNumber: vehicle.chassis_number ?? "",
        frameNumber: vehicle.frame_number ?? "",
        engineNumber: vehicle.engine_number ?? "",
        make: vehicle.make ?? "",
        model: vehicle.model ?? "",
        color: vehicle.color ?? "",
        manufactureYear: vehicle.manufacture_year
          ? String(vehicle.manufacture_year)
          : "",
        notes: vehicle.notes ?? "",
      };
      setBaseline(serverValues);
      if (!vehicleDraft.hasStoredDraft) {
        setPostId(serverValues.postId);
        setLocalityId(serverValues.localityId);
        setPlateNumber(serverValues.plateNumber);
        setChassisNumber(serverValues.chassisNumber);
        setFrameNumber(serverValues.frameNumber);
        setEngineNumber(serverValues.engineNumber);
        setMake(serverValues.make);
        setModel(serverValues.model);
        setColor(serverValues.color);
        setManufactureYear(serverValues.manufactureYear);
        setNotes(serverValues.notes);
      }
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  const availableLocalities = useMemo(
    () =>
      localities.filter(
        (item) =>
          (item.status === "activo" || item.id === localityId) &&
          (!postId || item.administrative_post_id === postId),
      ),
    [localities, postId, localityId],
  );

  const identificationValid =
    vehicleType === "bicicleta"
      ? frameNumber.trim().length >= 3
      : chassisNumber.trim().length >= 3;

  const canSave =
    !loading &&
    !saving &&
    make.trim().length >= 2 &&
    model.trim().length >= 1 &&
    identificationValid;

  const save = async () => {
    if (!canSave) return;

    setSaving(true);
    setSaveError(null);

    try {
      await updateVehicleCore({
        vehicleId: id,
        administrativePostId: postId || null,
        localityId: localityId || null,
        plateNumber:
          vehicleType === "bicicleta" ? null : plateNumber.trim() || null,
        chassisNumber:
          vehicleType === "bicicleta" ? null : chassisNumber.trim(),
        frameNumber:
          vehicleType === "bicicleta" ? frameNumber.trim() : null,
        engineNumber:
          vehicleType === "bicicleta" ? null : engineNumber.trim() || null,
        make: make.trim(),
        model: model.trim(),
        color: color.trim() || null,
        manufactureYear: manufactureYear
          ? Number.parseInt(manufactureYear, 10)
          : null,
        notes: notes.trim() || null,
      });

      vehicleDraft.clearDraft();
      await navigate({
        to: "/veiculos/$id",
        params: { id },
        replace: true,
      });
    } catch (error) {
      console.error("Falha ao actualizar veículo:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Não foi possível actualizar o veículo.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobiGestShell
      title="Editar veículo"
      subtitle="Actualizar os dados técnicos e territoriais."
    >
      <Link
        to="/veiculos/$id"
        params={{ id }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao veículo
      </Link>

      <Card className="mx-auto max-w-4xl p-7">
        {loading ? (
          <p className="text-sm text-slate-500">A carregar veículo...</p>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {loadError}
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold">Dados do veículo</h2>
            <p className="mt-1 text-sm text-slate-500">
              Proprietário, estado operacional e transferência são geridos por
              fluxos separados.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Marca *" value={make} onChange={setMake} />
              <Field label="Modelo *" value={model} onChange={setModel} />
              <Field
                label="Ano de fabrico"
                value={manufactureYear}
                onChange={(value) =>
                  setManufactureYear(value.replace(/[^0-9]/g, "").slice(0, 4))
                }
              />
              <Field label="Cor" value={color} onChange={setColor} />

              {vehicleType === "bicicleta" ? (
                <Field
                  label="Número do quadro *"
                  value={frameNumber}
                  onChange={setFrameNumber}
                />
              ) : (
                <>
                  <Field
                    label="Número de chassis *"
                    value={chassisNumber}
                    onChange={setChassisNumber}
                  />
                  <Field
                    label="Número do motor"
                    value={engineNumber}
                    onChange={setEngineNumber}
                  />
                  <Field
                    label="Matrícula"
                    value={plateNumber}
                    onChange={setPlateNumber}
                  />
                </>
              )}

              <label className="text-sm font-medium">
                Posto administrativo
                <select
                  value={postId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPostId(value);
                    if (
                      localityId &&
                      !localities.some(
                        (item) =>
                          item.id === localityId &&
                          item.administrative_post_id === value,
                      )
                    ) {
                      setLocalityId("");
                    }
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                >
                  <option value="">Não definido</option>
                  {posts
                    .filter((post) => post.status === "activo" || post.id === postId)
                    .map((post) => (
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
                  onChange={(event) => {
                    const value = event.target.value;
                    setLocalityId(value);
                    const locality = localities.find(
                      (item) => item.id === value,
                    );
                    if (locality && !postId) {
                      setPostId(locality.administrative_post_id);
                    }
                  }}
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

              <label className="text-sm font-medium md:col-span-2">
                Observações
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            {saveError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {saveError}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-6">
              <Link
                to="/veiculos/$id"
                params={{ id }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
              >
                Cancelar
              </Link>
              <button
                type="button"
                disabled={!canSave}
                onClick={save}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                {saving ? "A guardar..." : "Guardar alterações"}
              </button>
            </div>
          </>
        )}
      </Card>
    </MobiGestShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
      />
    </label>
  );
}
