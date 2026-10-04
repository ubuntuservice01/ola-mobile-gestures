import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  CarFront,
  Check,
  CheckCircle2,
  FileText,
  MapPin,
  Save,
  UserRound,
} from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";
import {
  EmptyState,
  LoadingButton,
  NetworkErrorState,
  SkeletonCard,
  notify,
} from "../../../components/mobigest/Experience";
import { Progress } from "../../../components/ui/progress";
import {
  createVehicleRegistration,
  type VehicleType,
} from "../../../lib/vehicles";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/veiculos/novo/$tipo")({
  component: RegistoVeiculo,
});

const LABELS: Record<VehicleType, string> = {
  motorizada: "Motorizada",
  carro: "Carro",
  bicicleta: "Bicicleta",
};

const STEPS = [
  { number: 1, label: "Proprietário", icon: UserRound },
  { number: 2, label: "Veículo", icon: Bike },
  { number: 3, label: "Localização", icon: MapPin },
  { number: 4, label: "Confirmação", icon: FileText },
] as const;

type Owner = {
  id: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  status: string;
};

type Post = {
  id: string;
  name: string;
  status: string;
};

type Locality = {
  id: string;
  administrative_post_id: string;
  name: string;
  status: string;
};

function RegistoVeiculo() {
  const { tipo } = Route.useParams();
  const vehicleType: VehicleType =
    tipo === "carro" || tipo === "bicicleta" ? tipo : "motorizada";
  const vehicleLabel = LABELS[vehicleType];
  const Icon = vehicleType === "carro" ? CarFront : Bike;

  const [owners, setOwners] = useState<Owner[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);

  const [ownerId, setOwnerId] = useState("");
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

  const [step, setStep] = useState(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    registrationId: string;
    registrationReference: string;
    vehicleId: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [ownersResult, postsResult, localitiesResult] = await Promise.all([
        supabase
          .from("owners")
          .select("id, full_name, document_type, document_number, phone, status")
          .eq("status", "activo")
          .order("full_name", { ascending: true }),
        supabase
          .from("administrative_posts")
          .select("id, name, status")
          .eq("status", "activo")
          .order("name", { ascending: true }),
        supabase
          .from("localities")
          .select("id, administrative_post_id, name, status")
          .eq("status", "activo")
          .order("name", { ascending: true }),
      ]);

      if (!active) return;

      const error =
        ownersResult.error ?? postsResult.error ?? localitiesResult.error;

      if (error) {
        console.error("Falha ao preparar registo de veículo:", error);
        setLoadError(
          "Não foi possível carregar proprietários e estrutura territorial.",
        );
        setLoading(false);
        return;
      }

      const ownerRows = (ownersResult.data ?? []) as Owner[];
      const postRows = (postsResult.data ?? []) as Post[];

      setOwners(ownerRows);
      setPosts(postRows);
      setLocalities((localitiesResult.data ?? []) as Locality[]);

      if (ownerRows[0]) {
        setOwnerId((current) => current || ownerRows[0].id);
      }
      if (postRows[0]) {
        setPostId((current) => current || postRows[0].id);
      }

      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const availableLocalities = useMemo(
    () =>
      localities.filter(
        (locality) =>
          locality.status === "activo" &&
          (!postId || locality.administrative_post_id === postId),
      ),
    [localities, postId],
  );

  const selectedOwner = owners.find((owner) => owner.id === ownerId) ?? null;
  const selectedPost = posts.find((post) => post.id === postId) ?? null;
  const selectedLocality =
    localities.find((locality) => locality.id === localityId) ?? null;

  const identificationValid =
    vehicleType === "bicicleta"
      ? frameNumber.trim().length >= 3
      : chassisNumber.trim().length >= 3;

  const vehicleDataValid =
    make.trim().length >= 2 &&
    model.trim().length >= 1 &&
    identificationValid;

  const canSubmit =
    !loading &&
    !saving &&
    Boolean(ownerId) &&
    vehicleDataValid;

  const changePost = (value: string) => {
    setPostId(value);

    if (
      localityId &&
      !localities.some(
        (locality) =>
          locality.id === localityId &&
          locality.administrative_post_id === value,
      )
    ) {
      setLocalityId("");
    }
  };

  const validateStep = (current: number) => {
    if (current === 1 && !ownerId) {
      return "Seleccione um proprietário para continuar.";
    }

    if (current === 2) {
      if (make.trim().length < 2) {
        return "A marca deve conter pelo menos 2 caracteres.";
      }
      if (model.trim().length < 1) {
        return "Informe o modelo do veículo.";
      }
      if (!identificationValid) {
        return vehicleType === "bicicleta"
          ? "O número do quadro deve conter pelo menos 3 caracteres."
          : "O número de chassis deve conter pelo menos 3 caracteres.";
      }
    }

    return null;
  };

  const continueStep = () => {
    const validation = validateStep(step);
    if (validation) {
      setStepError(validation);
      return;
    }

    const next = Math.min(4, step + 1);
    setStepError(null);
    setStep(next);
    setMaxVisitedStep((value) => Math.max(value, next));
  };

  const goBack = () => {
    setStepError(null);
    setStep((value) => Math.max(1, value - 1));
  };

  const goToVisitedStep = (nextStep: number) => {
    if (nextStep <= maxVisitedStep) {
      setStepError(null);
      setStep(nextStep);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;

    setSaving(true);
    setSaveError(null);

    try {
      const result = await createVehicleRegistration({
        ownerId,
        vehicleType,
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

      setCreated({
        registrationId: result.registration_id,
        registrationReference: result.registration_reference,
        vehicleId: result.vehicle_id,
      });
      notify.success(
        "Processo de registo criado",
        "O veículo foi submetido para validação.",
      );
    } catch (error) {
      console.error("Falha ao criar registo de veículo:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível criar o processo de registo.";
      setSaveError(message);
      notify.error("Não foi possível criar o registo", message);
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <MobiGestShell
        title="Processo de registo criado"
        subtitle="O veículo foi submetido para validação."
      >
        <Card className="mx-auto max-w-2xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h2 className="mt-5 text-2xl font-bold">
            {created.registrationReference}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {vehicleLabel} · {make} {model}
          </p>

          <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-900">
            <b>Estado:</b> Pendente de validação. O número MobiGest ainda não
            foi atribuído. Ele será gerado pelo servidor apenas quando o
            processo for aprovado.
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/registos/$id"
              params={{ id: created.registrationId }}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Abrir processo
            </Link>
            <Link
              to="/veiculos/$id"
              params={{ id: created.vehicleId }}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
            >
              Ver veículo
            </Link>
          </div>
        </Card>
      </MobiGestShell>
    );
  }

  return (
    <MobiGestShell
      title={"Registar " + vehicleLabel}
      subtitle="Criar veículo e processo municipal numa única operação."
    >
      <div className="mx-auto max-w-5xl">
        <Link
          to="/veiculos/novo"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" /> Alterar tipo
        </Link>

        <div className="mb-7 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-2xl font-bold">
              Novo registo de {vehicleLabel.toLowerCase()}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              O processo começa como Pendente. O número MobiGest nasce apenas
              depois da aprovação.
            </p>
          </div>
        </div>

        {loadError && (
          <div className="mb-5">
            <NetworkErrorState
              message={loadError}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : owners.length === 0 ? (
          <Card>
            <EmptyState
              title="Nenhum proprietário activo"
              description="Registe primeiro o proprietário antes de iniciar um processo de veículo."
              action={
                <Link
                  to="/proprietarios/novo"
                  className="mobigest-button inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Registar proprietário
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            <Stepper
              step={step}
              maxVisitedStep={maxVisitedStep}
              onStep={goToVisitedStep}
            />

            <div className="mt-6">
              {step === 1 && (
                <Card className="p-6">
                  <Section
                    icon={<UserRound />}
                    title="1. Proprietário"
                    text="Seleccione um proprietário real já cadastrado no município."
                  />

                  <label className="mt-5 block text-sm font-medium">
                    Proprietário *
                    <select
                      value={ownerId}
                      onChange={(event) => setOwnerId(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                    >
                      {owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.full_name}
                          {owner.document_number
                            ? " · " +
                              [owner.document_type, owner.document_number]
                                .filter(Boolean)
                                .join(" ")
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedOwner && (
                    <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                      <Info label="Nome" value={selectedOwner.full_name} />
                      <Info
                        label="Documento"
                        value={
                          selectedOwner.document_number
                            ? [
                                selectedOwner.document_type,
                                selectedOwner.document_number,
                              ]
                                .filter(Boolean)
                                .join(" · ")
                            : "Não informado"
                        }
                      />
                      <Info
                        label="Contacto"
                        value={selectedOwner.phone || "Não informado"}
                      />
                    </div>
                  )}
                </Card>
              )}

              {step === 2 && (
                <Card className="p-6">
                  <Section
                    icon={<Icon />}
                    title={"2. Dados da " + vehicleLabel.toLowerCase()}
                    text="Identificadores técnicos e características do veículo."
                  />

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field
                      label="Marca *"
                      value={make}
                      onChange={setMake}
                      placeholder="Marca"
                      valid={make.trim().length >= 2}
                    />
                    <Field
                      label="Modelo *"
                      value={model}
                      onChange={setModel}
                      placeholder="Modelo"
                      valid={model.trim().length >= 1}
                    />
                    <Field
                      label="Ano de fabrico"
                      value={manufactureYear}
                      onChange={(value) =>
                        setManufactureYear(
                          value.replace(/[^0-9]/g, "").slice(0, 4),
                        )
                      }
                      placeholder="AAAA"
                    />
                    <Field
                      label="Cor"
                      value={color}
                      onChange={setColor}
                      placeholder="Cor"
                    />

                    {vehicleType === "bicicleta" ? (
                      <Field
                        label="Número do quadro *"
                        value={frameNumber}
                        onChange={setFrameNumber}
                        placeholder="Número único do quadro"
                        valid={frameNumber.trim().length >= 3}
                        error={
                          frameNumber.length > 0 &&
                          frameNumber.trim().length < 3
                            ? "O número do quadro deve conter pelo menos 3 caracteres."
                            : undefined
                        }
                      />
                    ) : (
                      <>
                        <Field
                          label="Número de chassis *"
                          value={chassisNumber}
                          onChange={setChassisNumber}
                          placeholder="Número único do chassis"
                          valid={chassisNumber.trim().length >= 3}
                          error={
                            chassisNumber.length > 0 &&
                            chassisNumber.trim().length < 3
                              ? "O número de chassis deve conter pelo menos 3 caracteres."
                              : undefined
                          }
                        />
                        <Field
                          label="Número do motor"
                          value={engineNumber}
                          onChange={setEngineNumber}
                          placeholder="Número do motor"
                        />
                        <Field
                          label="Matrícula"
                          value={plateNumber}
                          onChange={setPlateNumber}
                          placeholder="Se aplicável"
                        />
                      </>
                    )}

                    <label className="text-sm font-medium md:col-span-2">
                      Observações
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={3}
                        placeholder="Informação técnica adicional"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </Card>
              )}

              {step === 3 && (
                <Card className="p-6">
                  <Section
                    icon={<MapPin />}
                    title="3. Localização administrativa"
                    text="O município é determinado automaticamente pela sessão autenticada."
                  />

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-medium">
                      Posto administrativo
                      <select
                        value={postId}
                        onChange={(event) => changePost(event.target.value)}
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
                  </div>
                </Card>
              )}

              {step === 4 && (
                <Card className="border-sky-100 bg-sky-50/40 p-6">
                  <Section
                    icon={<FileText />}
                    title="4. Confirmar e submeter"
                    text="Reveja os dados antes de criar o processo municipal."
                  />

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Info
                      label="Proprietário"
                      value={selectedOwner?.full_name ?? "—"}
                    />
                    <Info
                      label="Veículo"
                      value={[make, model].filter(Boolean).join(" ") || "—"}
                    />
                    <Info
                      label={
                        vehicleType === "bicicleta"
                          ? "Número do quadro"
                          : "Número de chassis"
                      }
                      value={
                        vehicleType === "bicicleta"
                          ? frameNumber || "—"
                          : chassisNumber || "—"
                      }
                    />
                    <Info
                      label="Posto administrativo"
                      value={selectedPost?.name ?? "Não definido"}
                    />
                    <Info
                      label="Localidade / bairro"
                      value={selectedLocality?.name ?? "Não definida"}
                    />
                    <Info
                      label="Estado inicial"
                      value="Pendente de validação"
                    />
                  </div>

                  <div className="mt-5 rounded-xl bg-white p-4 text-sm leading-6 text-slate-600">
                    Ao submeter, o servidor cria o veículo e o processo de
                    registo numa única transacção. Se algum identificador já
                    existir, toda a operação é recusada.
                  </div>

                  {saveError && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                      {saveError}
                    </div>
                  )}
                </Card>
              )}
            </div>

            {stepError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {stepError}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="mobigest-button rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                  >
                    Voltar
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/veiculos"
                  className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </Link>

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={continueStep}
                    className="mobigest-button inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700"
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <LoadingButton
                    onClick={submit}
                    disabled={!canSubmit}
                    state={saving ? "loading" : "idle"}
                    idleLabel="Criar processo de registo"
                    loadingLabel="A criar processo..."
                    icon={<Save className="h-4 w-4" />}
                    className="bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40"
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MobiGestShell>
  );
}

function Stepper({
  step,
  maxVisitedStep,
  onStep,
}: {
  step: number;
  maxVisitedStep: number;
  onStep: (step: number) => void;
}) {
  return (
    <Card className="p-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {STEPS.map(({ number, label, icon: StepIcon }) => {
          const complete = number < step;
          const active = number === step;
          const clickable = number <= maxVisitedStep;

          return (
            <button
              key={number}
              type="button"
              disabled={!clickable}
              onClick={() => onStep(number)}
              className={
                "flex items-center gap-3 rounded-xl p-3 text-left " +
                (active
                  ? "bg-sky-50 text-sky-800"
                  : clickable
                    ? "hover:bg-slate-50"
                    : "cursor-default text-slate-400")
              }
            >
              <span
                className={
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold " +
                  (active
                    ? "border-sky-600 bg-sky-600 text-white"
                    : complete
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-500")
                }
              >
                {complete ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <StepIcon className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wide opacity-60">
                  Etapa {number}
                </span>
                <span className="block truncate text-sm font-semibold">
                  {label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <Progress
        value={(step / STEPS.length) * 100}
        className="mt-4 h-1.5"
        aria-label={"Etapa " + step + " de " + STEPS.length}
      />
    </Card>
  );
}

function Section({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  valid,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  valid?: boolean;
  error?: string;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <div className="relative mt-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className={
            "h-11 w-full rounded-xl border bg-white px-3 pr-9 text-sm font-normal outline-none focus:ring-4 " +
            (error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
              : "border-slate-300 focus:border-sky-500 focus:ring-sky-500/10")
          }
        />
        {valid && value.trim() && !error && (
          <Check
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600"
            aria-label="Campo válido"
          />
        )}
      </div>
      {error && (
        <span className="mt-1.5 block text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
