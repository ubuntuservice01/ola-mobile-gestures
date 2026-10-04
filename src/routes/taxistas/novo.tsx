import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, QrCode, Save } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { createDriver, type DriverType } from "../../lib/drivers";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/taxistas/novo")({
  component: NovoTaxista,
});

type Post = { id: string; name: string; status: string };
type Locality = {
  id: string;
  administrative_post_id: string;
  name: string;
  status: string;
};
type Vehicle = {
  id: string;
  mobigest_number: string | null;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  status: string;
};

function NovoTaxista() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [driverType, setDriverType] = useState<DriverType>("mototaxista");
  const [fullName, setFullName] = useState("");
  const [documentType, setDocumentType] = useState("BI");
  const [documentNumber, setDocumentNumber] = useState("");
  const [nuit, setNuit] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [postId, setPostId] = useState("");
  const [localityId, setLocalityId] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    id: string;
    reference: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [postsResult, localitiesResult, vehiclesResult] = await Promise.all([
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
        supabase
          .from("vehicles")
          .select("id, mobigest_number, vehicle_type, make, model, status")
          .eq("status", "activa")
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      const error =
        postsResult.error ?? localitiesResult.error ?? vehiclesResult.error;

      if (error) {
        console.error("Falha ao preparar taxista/condutor:", error);
        setLoadError("Não foi possível carregar território e veículos.");
        setLoading(false);
        return;
      }

      setPosts((postsResult.data ?? []) as Post[]);
      setLocalities((localitiesResult.data ?? []) as Locality[]);
      setVehicles((vehiclesResult.data ?? []) as Vehicle[]);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const availableLocalities = useMemo(
    () =>
      localities.filter(
        (locality) =>
          locality.status === "activo" &&
          (!postId || locality.administrative_post_id === postId),
      ),
    [localities, postId],
  );

  const availableVehicles = useMemo(
    () =>
      vehicles.filter((vehicle) => {
        if (driverType === "taxista" || driverType === "mototaxista") {
          return vehicle.vehicle_type === "motorizada";
        }
        return true;
      }),
    [vehicles, driverType],
  );

  const submit = async () => {
    if (fullName.trim().length < 3 || saving) return;

    setSaving(true);
    setSaveError(null);

    try {
      const result = await createDriver({
        driverType,
        fullName: fullName.trim(),
        documentType: documentType.trim() || null,
        documentNumber: documentNumber.trim() || null,
        nuit: nuit.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        birthDate: birthDate || null,
        address: address.trim() || null,
        administrativePostId: postId || null,
        localityId: localityId || null,
        vehicleId: vehicleId || null,
      });

      setCreated({
        id: result.driver_id,
        reference: result.driver_reference,
      });
    } catch (error) {
      console.error("Falha ao criar taxista/condutor:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o taxista/condutor.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    const qrValue =
      typeof window !== "undefined"
        ? window.location.origin +
          "/consulta/condutor/" +
          encodeURIComponent(created.reference)
        : created.reference;

    return (
      <MobiGestShell
        title="Taxista/condutor registado"
        subtitle="Referência individual gerada pelo servidor."
      >
        <Card className="mx-auto max-w-2xl p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-4 text-3xl font-bold">{created.reference}</h2>
          <p className="mt-2 text-sm text-slate-500">{fullName}</p>

          <div className="mx-auto mt-6 flex h-52 w-52 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
            <QRCodeSVG value={qrValue} size={175} level="M" />
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-500">
            {created.reference.startsWith("MTX-")
              ? "Série MTX atribuída a taxista/mototaxista."
              : "Série CDT atribuída a condutor."}
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/taxistas/$id"
              params={{ id: created.id }}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Abrir ficha
            </Link>
            <Link
              to="/taxistas"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
            >
              Voltar à lista
            </Link>
          </div>
        </Card>
      </MobiGestShell>
    );
  }

  return (
    <MobiGestShell
      title="Novo taxista / condutor"
      subtitle="Registar identidade e associação principal a um veículo."
    >
      <Link
        to="/taxistas"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Taxistas / condutores
      </Link>

      <Card className="mx-auto max-w-4xl p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Dados pessoais</h2>
            <p className="mt-2 text-sm text-slate-500">
              A referência MTX/CDT e o QR são atribuídos pelo servidor.
            </p>
          </div>
          <QrCode className="h-8 w-8 text-sky-600" />
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">
            A carregar território e veículos...
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                Tipo *
                <select
                  value={driverType}
                  onChange={(event) => {
                    setDriverType(event.target.value as DriverType);
                    setVehicleId("");
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                >
                  <option value="mototaxista">Mototaxista</option>
                  <option value="taxista">Taxista</option>
                  <option value="condutor">Condutor</option>
                  <option value="outro">Outro condutor</option>
                </select>
              </label>

              <Field
                label="Nome completo *"
                value={fullName}
                onChange={setFullName}
              />

              <label className="text-sm font-medium">
                Tipo de documento
                <select
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                >
                  <option value="BI">BI</option>
                  <option value="Passaporte">Passaporte</option>
                  <option value="DIRE">DIRE</option>
                  <option value="Carta de condução">Carta de condução</option>
                  <option value="Outro">Outro</option>
                </select>
              </label>

              <Field
                label="Número do documento"
                value={documentNumber}
                onChange={setDocumentNumber}
              />
              <Field label="NUIT" value={nuit} onChange={setNuit} />
              <Field label="Telefone" value={phone} onChange={setPhone} />
              <Field label="Email" value={email} onChange={setEmail} type="email" />

              <label className="text-sm font-medium">
                Data de nascimento
                <input
                  type="date"
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>

              <Field label="Morada" value={address} onChange={setAddress} />

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

              <label className="text-sm font-medium md:col-span-2">
                Veículo principal
                <select
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                >
                  <option value="">Sem veículo associado</option>
                  {availableVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.mobigest_number || "Sem número MobiGest"} ·{" "}
                      {[vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
                        vehicle.vehicle_type}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {loadError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {loadError}
              </div>
            )}

            {saveError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {saveError}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-6">
              <Link
                to="/taxistas"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
              >
                Cancelar
              </Link>
              <button
                type="button"
                disabled={fullName.trim().length < 3 || saving}
                onClick={submit}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                {saving ? "A guardar..." : "Guardar e gerar referência"}
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
      />
    </label>
  );
}
