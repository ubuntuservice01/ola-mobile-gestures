import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";
import { updateOwner, type OwnerStatus } from "../../../lib/owners";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/proprietarios/$id/editar")({
  component: Editar,
});

type Post = { id: string; name: string; status: string };
type Locality = {
  id: string;
  administrative_post_id: string;
  name: string;
  status: string;
};

function Editar() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [fullName, setFullName] = useState("");
  const [documentType, setDocumentType] = useState("BI");
  const [documentNumber, setDocumentNumber] = useState("");
  const [nuit, setNuit] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [postId, setPostId] = useState("");
  const [localityId, setLocalityId] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<OwnerStatus>("activo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [ownerResult, postResult, localityResult] = await Promise.all([
        supabase
          .from("owners")
          .select(
            "id, full_name, document_type, document_number, nuit, phone, alternate_phone, email, address, administrative_post_id, locality_id, notes, status",
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

      const error = ownerResult.error ?? postResult.error ?? localityResult.error;
      if (error || !ownerResult.data) {
        console.error("Falha ao carregar proprietário para edição:", error);
        setLoadError("Não foi possível carregar o proprietário.");
        setLoading(false);
        return;
      }

      const owner = ownerResult.data;
      setPosts((postResult.data ?? []) as Post[]);
      setLocalities((localityResult.data ?? []) as Locality[]);
      setFullName(owner.full_name ?? "");
      setDocumentType(owner.document_type ?? "BI");
      setDocumentNumber(owner.document_number ?? "");
      setNuit(owner.nuit ?? "");
      setPhone(owner.phone ?? "");
      setAlternatePhone(owner.alternate_phone ?? "");
      setEmail(owner.email ?? "");
      setAddress(owner.address ?? "");
      setPostId(owner.administrative_post_id ?? "");
      setLocalityId(owner.locality_id ?? "");
      setNotes(owner.notes ?? "");
      setStatus(owner.status as OwnerStatus);
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

  const save = async () => {
    if (fullName.trim().length < 3 || saving) return;

    setSaving(true);
    setSaveError(null);

    try {
      await updateOwner(id, {
        fullName: fullName.trim(),
        documentType: documentType.trim() || null,
        documentNumber: documentNumber.trim() || null,
        nuit: nuit.trim() || null,
        phone: phone.trim() || null,
        alternatePhone: alternatePhone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        administrativePostId: postId || null,
        localityId: localityId || null,
        notes: notes.trim() || null,
        status,
      });

      await navigate({
        to: "/proprietarios/$id",
        params: { id },
        replace: true,
      });
    } catch (error) {
      console.error("Falha ao actualizar proprietário:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar as alterações.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobiGestShell
      title="Editar proprietário"
      subtitle="Actualizar os dados cadastrais do proprietário."
    >
      <Link
        to="/proprietarios/$id"
        params={{ id }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao perfil
      </Link>

      <Card className="mx-auto max-w-4xl p-7">
        {loading ? (
          <p className="text-sm text-slate-500">A carregar proprietário...</p>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {loadError}
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold">Dados cadastrais</h2>
            <p className="mt-1 text-sm text-slate-500">
              As alterações são persistidas no Supabase e registadas na auditoria.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Nome completo *" value={fullName} onChange={setFullName} />

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
              <Field
                label="Telefone alternativo"
                value={alternatePhone}
                onChange={setAlternatePhone}
              />
              <Field label="Email" value={email} onChange={setEmail} type="email" />
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
                  {posts
                    .filter((item) => item.status === "activo" || item.id === postId)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
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
                    const locality = localities.find((item) => item.id === value);
                    if (locality && !postId) {
                      setPostId(locality.administrative_post_id);
                    }
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                >
                  <option value="">Não definida</option>
                  {availableLocalities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Estado
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as OwnerStatus)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="bloqueado">Bloqueado</option>
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
                to="/proprietarios/$id"
                params={{ id }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
              >
                Cancelar
              </Link>
              <button
                type="button"
                disabled={fullName.trim().length < 3 || saving}
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
