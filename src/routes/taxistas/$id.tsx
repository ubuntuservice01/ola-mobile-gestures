import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bike,
  Pencil,
  QrCode,
  Save,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import {
  setDriverStatus,
  updateDriver,
  type DriverStatus,
  type DriverType,
} from "../../lib/drivers";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/taxistas/$id")({
  component: DriverDetail,
});

type Driver = {
  id: string;
  municipality_id: string;
  administrative_post_id: string | null;
  locality_id: string | null;
  driver_type: DriverType;
  reference: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
  nuit: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  address: string | null;
  status: DriverStatus;
};

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

function DriverDetail() {
  const { id } = Route.useParams();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [editing, setEditing] = useState(false);
  const [driverType, setDriverType] = useState<DriverType>("condutor");
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
  const [pendingStatus, setPendingStatus] = useState<DriverStatus | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      const [driverResult, postsResult, localitiesResult, vehiclesResult, linksResult] =
        await Promise.all([
          supabase
            .from("drivers")
            .select(
              "id, municipality_id, administrative_post_id, locality_id, driver_type, reference, full_name, document_type, document_number, nuit, phone, email, birth_date, address, status",
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
          supabase
            .from("vehicles")
            .select("id, mobigest_number, vehicle_type, make, model, status")
            .eq("status", "activa")
            .order("created_at", { ascending: false }),
          supabase
            .from("driver_vehicles")
            .select("vehicle_id, is_primary")
            .eq("driver_id", id)
            .eq("status", "activo"),
        ]);

      if (!active) return;

      const error =
        driverResult.error ??
        postsResult.error ??
        localitiesResult.error ??
        vehiclesResult.error ??
        linksResult.error;

      if (error || !driverResult.data) {
        console.error("Falha ao carregar taxista/condutor:", error);
        setErrorMessage("Taxista/condutor não encontrado ou fora do âmbito.");
        setLoading(false);
        return;
      }

      const current = driverResult.data as Driver;
      const primary =
        (linksResult.data ?? []).find((link) => link.is_primary) ??
        (linksResult.data ?? [])[0];

      setDriver(current);
      setPosts((postsResult.data ?? []) as Post[]);
      setLocalities((localitiesResult.data ?? []) as Locality[]);
      setVehicles((vehiclesResult.data ?? []) as Vehicle[]);
      setVehicleId(primary?.vehicle_id ?? "");

      setDriverType(current.driver_type);
      setFullName(current.full_name);
      setDocumentType(current.document_type ?? "BI");
      setDocumentNumber(current.document_number ?? "");
      setNuit(current.nuit ?? "");
      setPhone(current.phone ?? "");
      setEmail(current.email ?? "");
      setBirthDate(current.birth_date ?? "");
      setAddress(current.address ?? "");
      setPostId(current.administrative_post_id ?? "");
      setLocalityId(current.locality_id ?? "");
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [id, refreshToken]);

  const availableLocalities = useMemo(
    () =>
      localities.filter(
        (locality) =>
          (locality.status === "activo" || locality.id === localityId) &&
          (!postId || locality.administrative_post_id === postId),
      ),
    [localities, postId, localityId],
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

  const currentVehicle =
    vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;

  const save = async () => {
    if (!driver || fullName.trim().length < 3 || saving) return;

    setSaving(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      await updateDriver({
        driverId: driver.id,
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

      setEditing(false);
      setMessage("Dados do taxista/condutor actualizados.");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao actualizar taxista/condutor:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível actualizar.",
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!driver || !pendingStatus || statusReason.trim().length < 4) return;

    setChangingStatus(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      await setDriverStatus({
        driverId: driver.id,
        status: pendingStatus,
        reason: statusReason.trim(),
      });
      setPendingStatus(null);
      setStatusReason("");
      setMessage("Estado actualizado e registado na auditoria.");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao alterar estado:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível alterar o estado.",
      );
    } finally {
      setChangingStatus(false);
    }
  };

  const qrValue =
    driver && typeof window !== "undefined"
      ? window.location.origin +
        "/consulta/condutor/" +
        encodeURIComponent(driver.reference)
      : driver?.reference ?? "";

  return (
    <MobiGestShell
      title="Taxista / Condutor"
      subtitle="Ficha individual, identificação e vínculo ao veículo."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/taxistas"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" /> Taxistas / condutores
        </Link>

        {driver && (
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {editing ? "Cancelar edição" : "Editar"}
          </button>
        )}
      </div>

      {loading ? (
        <Card className="p-8 text-sm text-slate-500">A carregar ficha...</Card>
      ) : !driver ? (
        <Card className="p-8 text-sm font-medium text-red-700">
          {errorMessage || "Registo não encontrado."}
        </Card>
      ) : (
        <div className="space-y-6">
          {editing && (
            <Card className="p-6">
              <h3 className="font-semibold">Editar dados</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">
                  Tipo
                  <select
                    value={driverType}
                    onChange={(event) =>
                      setDriverType(event.target.value as DriverType)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                  >
                    <option value="mototaxista">Mototaxista</option>
                    <option value="taxista">Taxista</option>
                    <option value="condutor">Condutor</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>
                <Field label="Nome completo" value={fullName} onChange={setFullName} />
                <Field
                  label="Tipo de documento"
                  value={documentType}
                  onChange={setDocumentType}
                />
                <Field
                  label="Número do documento"
                  value={documentNumber}
                  onChange={setDocumentNumber}
                />
                <Field label="NUIT" value={nuit} onChange={setNuit} />
                <Field label="Telefone" value={phone} onChange={setPhone} />
                <Field label="Email" value={email} onChange={setEmail} />
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

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  disabled={fullName.trim().length < 3 || saving}
                  onClick={save}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "A guardar..." : "Guardar alterações"}
                </button>
              </div>
            </Card>
          )}

          {pendingStatus && (
            <Card className="border-amber-200 p-6">
              <h3 className="font-semibold">
                Alterar estado para {statusLabel(pendingStatus)}
              </h3>
              <textarea
                value={statusReason}
                onChange={(event) => setStatusReason(event.target.value)}
                rows={3}
                placeholder="Motivo obrigatório..."
                className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  disabled={
                    statusReason.trim().length < 4 || changingStatus
                  }
                  onClick={changeStatus}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {changingStatus ? "A processar..." : "Confirmar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingStatus(null);
                    setStatusReason("");
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </Card>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}
          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card className="p-7">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                  <UserRoundCheck className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {driverTypeLabel(driver.driver_type)}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">{driver.full_name}</h2>
                  <p className="mt-1 text-sm font-semibold text-sky-700">
                    {driver.reference}
                  </p>
                </div>
                <StatusBadge status={driver.status} />
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <Info
                  label="Documento"
                  value={
                    driver.document_number
                      ? [driver.document_type, driver.document_number]
                          .filter(Boolean)
                          .join(" · ")
                      : "—"
                  }
                />
                <Info label="NUIT" value={driver.nuit || "—"} />
                <Info label="Telefone" value={driver.phone || "—"} />
                <Info label="Email" value={driver.email || "—"} />
                <Info
                  label="Posto"
                  value={
                    posts.find(
                      (post) => post.id === driver.administrative_post_id,
                    )?.name ?? "—"
                  }
                />
                <Info
                  label="Localidade"
                  value={
                    localities.find(
                      (locality) => locality.id === driver.locality_id,
                    )?.name ?? "—"
                  }
                />
                <Info label="Morada" value={driver.address || "—"} />
                <Info
                  label="Nascimento"
                  value={
                    driver.birth_date
                      ? new Date(driver.birth_date).toLocaleDateString("pt-MZ")
                      : "—"
                  }
                />
              </div>

              <h3 className="mt-7 font-semibold">Veículo principal</h3>
              {currentVehicle ? (
                <Link
                  to="/veiculos/$id"
                  params={{ id: currentVehicle.id }}
                  className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-sky-200"
                >
                  <Bike className="h-5 w-5 text-sky-600" />
                  <div>
                    <p className="text-sm font-semibold">
                      {currentVehicle.mobigest_number || "Sem número MobiGest"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[currentVehicle.make, currentVehicle.model]
                        .filter(Boolean)
                        .join(" ") || currentVehicle.vehicle_type}
                    </p>
                  </div>
                </Link>
              ) : (
                <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Sem veículo principal associado.
                </p>
              )}

              <div className="mt-7 flex flex-wrap gap-2">
                {driver.status !== "activo" && (
                  <button
                    type="button"
                    onClick={() => setPendingStatus("activo")}
                    className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700"
                  >
                    Reactivar
                  </button>
                )}
                {driver.status === "activo" && (
                  <button
                    type="button"
                    onClick={() => setPendingStatus("suspenso")}
                    className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700"
                  >
                    Suspender
                  </button>
                )}
                {driver.status !== "bloqueado" && (
                  <button
                    type="button"
                    onClick={() => setPendingStatus("bloqueado")}
                    className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                  >
                    Bloquear
                  </button>
                )}
                {driver.status !== "inactivo" && (
                  <button
                    type="button"
                    onClick={() => setPendingStatus("inactivo")}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
                  >
                    Inactivar
                  </button>
                )}
              </div>
            </Card>

            <div className="space-y-4">
              <Card className="p-6 text-center">
                <QrCode className="mx-auto mb-3 h-6 w-6 text-sky-600" />
                <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl border border-slate-200 bg-white p-4">
                  <QRCodeSVG value={qrValue} size={175} level="M" />
                </div>
                <p className="mt-4 text-sm font-bold">{driver.reference}</p>
                <p className="mt-1 text-xs text-slate-500">
                  QR de identificação pública
                </p>
              </Card>

              <Card className="p-5">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <p className="mt-3 text-sm font-semibold">Referência do sistema</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  A série não pode mudar entre MTX e CDT depois da criação,
                  evitando reutilização ou alteração da identidade institucional.
                </p>
              </Card>
            </div>
          </div>
        </div>
      )}
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function driverTypeLabel(type: string) {
  const labels: Record<string, string> = {
    mototaxista: "Mototaxista",
    taxista: "Taxista",
    condutor: "Condutor",
    outro: "Outro condutor",
  };
  return labels[type] ?? type;
}

function statusLabel(status: DriverStatus) {
  const labels: Record<DriverStatus, string> = {
    activo: "Activo",
    suspenso: "Suspenso",
    bloqueado: "Bloqueado",
    inactivo: "Inactivo",
  };
  return labels[status];
}

function StatusBadge({ status }: { status: DriverStatus }) {
  const className =
    status === "activo"
      ? "bg-emerald-50 text-emerald-700"
      : status === "suspenso"
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";

  return (
    <span className={"rounded-full px-3 py-1 text-xs font-semibold " + className}>
      {statusLabel(status)}
    </span>
  );
}
