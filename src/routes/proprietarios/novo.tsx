import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, Card } from "../../components/MobiGestShell";
import { createOwner } from "../../lib/owners";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/proprietarios/novo")({
  component: NovoProp,
});

type Post = { id: string; name: string; status: string };
type Locality = {
  id: string;
  administrative_post_id: string;
  name: string;
  status: string;
};

function NovoProp() {
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
  const [loadingTerritory, setLoadingTerritory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [postResult, localityResult] = await Promise.all([
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

      if (postResult.error || localityResult.error) {
        console.error(
          "Falha ao carregar estrutura territorial:",
          postResult.error ?? localityResult.error,
        );
        setErrorMessage("Não foi possível carregar postos e localidades.");
      } else {
        setPosts((postResult.data ?? []) as Post[]);
        setLocalities((localityResult.data ?? []) as Locality[]);
      }

      setLoadingTerritory(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const availableLocalities = useMemo(
    () =>
      localities.filter(
        (item) =>
          item.status === "activo" &&
          (!postId || item.administrative_post_id === postId),
      ),
    [localities, postId],
  );

  const selectPost = (value: string) => {
    setPostId(value);
    if (
      localityId &&
      !localities.some(
        (item) => item.id === localityId && item.administrative_post_id === value,
      )
    ) {
      setLocalityId("");
    }
  };

  const save = async () => {
    if (fullName.trim().length < 3 || saving) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      const id = await createOwner({
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
      });

      setCreatedId(id);
    } catch (error) {
      console.error("Falha ao criar proprietário:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar o proprietário.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (createdId) {
    return (
      <MobiGestShell
        title="Proprietário criado"
        subtitle="O cadastro foi gravado e registado na auditoria."
      >
        <Card className="mx-auto max-w-2xl p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-4 text-2xl font-bold">{fullName}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {documentNumber
              ? documentType + " · " + documentNumber.toUpperCase()
              : "Sem documento informado"}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/proprietarios"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
            >
              Voltar à lista
            </Link>
            <Link
              to="/proprietarios/$id"
              params={{ id: createdId }}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Abrir proprietário
            </Link>
          </div>
        </Card>
      </MobiGestShell>
    );
  }

  return (
    <MobiGestShell title="Novo proprietário">
      <Link
        to="/proprietarios"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" /> Proprietários
      </Link>

      <Card className="mx-auto max-w-4xl p-7">
        <h2 className="text-xl font-bold">Dados do proprietário</h2>
        <p className="mt-1 text-sm text-slate-500">
          O município é determinado automaticamente pelo contexto autenticado.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field
            label="Nome completo *"
            value={fullName}
            onChange={setFullName}
            placeholder="Nome completo"
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
            placeholder="Número"
          />
          <Field label="NUIT" value={nuit} onChange={setNuit} placeholder="NUIT" />
          <Field
            label="Telefone"
            value={phone}
            onChange={setPhone}
            placeholder="+258 ..."
          />
          <Field
            label="Telefone alternativo"
            value={alternatePhone}
            onChange={setAlternatePhone}
            placeholder="+258 ..."
          />
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="email@exemplo.mz"
            type="email"
          />
          <Field
            label="Morada"
            value={address}
            onChange={setAddress}
            placeholder="Morada"
          />

          <label className="text-sm font-medium">
            Posto administrativo
            <select
              value={postId}
              disabled={loadingTerritory}
              onChange={(event) => selectPost(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"
            >
              <option value="">Não definido</option>
              {posts
                .filter((item) => item.status === "activo")
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
              disabled={loadingTerritory}
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

          <label className="text-sm font-medium md:col-span-2">
            Observações
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
              placeholder="Observações opcionais"
            />
          </label>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-6">
          <Link
            to="/proprietarios"
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
            {saving ? "A guardar..." : "Guardar proprietário"}
          </button>
        </div>
      </Card>
    </MobiGestShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-sky-500"
      />
    </label>
  );
}
