import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Upload,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadAccessProfile } from "../lib/access-control";
import {
  createDocumentViewUrl,
  uploadDocument,
  validateDocument,
  type DocumentSubjectType,
} from "../lib/documents";
import { supabase } from "../lib/supabase";
import { Card } from "./MobiGestShell";
import {
  EmptyState,
  LoadingButton,
  SkeletonTable,
  StatusBadge,
  notify,
} from "./mobigest/Experience";
import { formatDate } from "../lib/format";

type DocumentRow = {
  id: string;
  document_type: string;
  file_path: string | null;
  document_number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
};

type Requirement = {
  document_code: string;
  label: string;
  required: boolean;
  expiry_required: boolean;
};

export function DocumentManager({
  municipalityId,
  subjectType,
  subjectId,
  vehicleType,
  title = "Documentos",
}: {
  municipalityId: string;
  subjectType: DocumentSubjectType;
  subjectId: string;
  vehicleType?: string | null;
  title?: string;
}) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [canUpload, setCanUpload] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [customType, setCustomType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const subjectColumn =
    subjectType === "owner"
      ? "owner_id"
      : subjectType === "vehicle"
        ? "vehicle_id"
        : "registration_id";

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (user) {
        const profile = await loadAccessProfile(user.id);
        if (!active) return;

        const role = profile?.role;
        setCanUpload(
          role === "super_admin" ||
            role === "admin_municipal" ||
            role === "tecnico",
        );
        setCanValidate(
          role === "super_admin" ||
            role === "admin_municipal" ||
            role === "tecnico",
        );
      }

      const documentQuery = supabase
        .from("documents")
        .select(
          "id, document_type, file_path, document_number, issued_at, expires_at, status, rejection_reason, created_at",
        )
        .eq(subjectColumn, subjectId)
        .order("created_at", { ascending: false });

      let requirementQuery = supabase
        .from("document_requirements")
        .select("document_code, label, required, expiry_required")
        .eq("municipality_id", municipalityId)
        .eq("active", true)
        .order("label", { ascending: true });

      if (vehicleType) {
        requirementQuery = requirementQuery.or(
          "vehicle_type.is.null,vehicle_type.eq." + vehicleType,
        );
      } else {
        requirementQuery = requirementQuery.is("vehicle_type", null);
      }

      const [documentsResult, requirementsResult] = await Promise.all([
        documentQuery,
        requirementQuery,
      ]);

      if (!active) return;

      const error = documentsResult.error ?? requirementsResult.error;
      if (error) {
        console.error("Falha ao carregar documentos:", error);
        setErrorMessage("Não foi possível carregar os documentos.");
        setLoading(false);
        return;
      }

      const requirementRows =
        (requirementsResult.data ?? []) as Requirement[];

      setDocuments((documentsResult.data ?? []) as DocumentRow[]);
      setRequirements(requirementRows);

      if (!selectedType && requirementRows[0]) {
        setSelectedType(requirementRows[0].document_code);
      }

      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [
    municipalityId,
    subjectId,
    subjectColumn,
    vehicleType,
    refreshToken,
    selectedType,
  ]);

  const requirementMap = useMemo(
    () =>
      new Map(
        requirements.map((requirement) => [
          requirement.document_code,
          requirement,
        ]),
      ),
    [requirements],
  );

  const documentType =
    selectedType === "__custom__" ? customType.trim() : selectedType.trim();

  const submitUpload = async () => {
    if (!file || !documentType || uploading) return;

    setUploading(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      await uploadDocument({
        municipalityId,
        subjectType,
        subjectId,
        documentType,
        file,
        documentNumber: documentNumber.trim() || null,
        issuedAt: issuedAt || null,
        expiresAt: expiresAt || null,
      });

      setFile(null);
      setDocumentNumber("");
      setIssuedAt("");
      setExpiresAt("");
      setCustomType("");
      setMessage("Documento carregado e enviado para validação.");
      notify.success("Documento carregado", "O ficheiro foi enviado para validação.");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha no upload documental:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o documento.";
      setErrorMessage(message);
      notify.error("Não foi possível carregar o documento", message);
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (document: DocumentRow) => {
    if (!document.file_path) {
      setErrorMessage("Este documento não possui ficheiro associado.");
      return;
    }

    setActionId(document.id);
    setErrorMessage(null);

    try {
      const url = await createDocumentViewUrl(document.file_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Falha ao abrir documento:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o documento.",
      );
    } finally {
      setActionId(null);
    }
  };

  const approveDocument = async (documentId: string) => {
    setActionId(documentId);
    setErrorMessage(null);
    setMessage(null);

    try {
      await validateDocument({
        documentId,
        status: "validado",
      });
      setMessage("Documento validado.");
      notify.success("Documento validado");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao validar documento:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível validar o documento.",
      );
    } finally {
      setActionId(null);
    }
  };

  const rejectDocument = async (documentId: string) => {
    if (rejectReason.trim().length < 4) return;

    setActionId(documentId);
    setErrorMessage(null);
    setMessage(null);

    try {
      await validateDocument({
        documentId,
        status: "rejeitado",
        reason: rejectReason.trim(),
      });
      setRejectingId(null);
      setRejectReason("");
      setMessage("Documento rejeitado com fundamentação.");
      notify.info("Documento rejeitado", "A fundamentação ficou registada.");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Falha ao rejeitar documento:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível rejeitar o documento.",
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 p-6">
        <h3 className="font-bold">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">
          Ficheiros privados. O acesso é temporário e controlado por município.
        </p>
      </div>

      {loading ? (
        <div className="p-4">
          <SkeletonTable rows={4} columns={4} />
        </div>
      ) : (
        <>
          {canUpload && (
            <div className="border-b border-slate-100 bg-slate-50/60 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">
                  Tipo de documento *
                  <select
                    value={selectedType}
                    onChange={(event) => setSelectedType(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                  >
                    {requirements.length === 0 && (
                      <option value="">Seleccione</option>
                    )}
                    {requirements.map((requirement) => (
                      <option
                        key={requirement.document_code}
                        value={requirement.document_code}
                      >
                        {requirement.label}
                        {requirement.required ? " *" : ""}
                      </option>
                    ))}
                    <option value="__custom__">Outro documento</option>
                  </select>
                </label>

                {selectedType === "__custom__" && (
                  <label className="text-sm font-medium">
                    Nome/tipo do documento *
                    <input
                      value={customType}
                      onChange={(event) => setCustomType(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                      placeholder="Ex.: declaração"
                    />
                  </label>
                )}

                <label className="text-sm font-medium">
                  Número do documento
                  <input
                    value={documentNumber}
                    onChange={(event) => setDocumentNumber(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                  />
                </label>

                <label className="text-sm font-medium">
                  Ficheiro *
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setFile(event.target.files?.[0] ?? null)
                    }
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm font-medium">
                  Data de emissão
                  <input
                    type="date"
                    value={issuedAt}
                    onChange={(event) => setIssuedAt(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                  />
                </label>

                <label className="text-sm font-medium">
                  Validade
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                  />
                </label>
              </div>

              {file && (
                <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      {file.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(file.type || "Ficheiro").replace("application/", "").replace("image/", "").toUpperCase()}
                      {" · "}
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {uploading ? "A carregar..." : "Pronto para enviar"}
                  </span>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <LoadingButton
                  onClick={submitUpload}
                  disabled={!file || !documentType}
                  state={uploading ? "loading" : "idle"}
                  idleLabel="Carregar documento"
                  loadingLabel="A carregar..."
                  icon={<Upload className="h-4 w-4" />}
                  className="bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40"
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="border-b border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          {message && (
            <div className="border-b border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {documents.length === 0 ? (
              <EmptyState
                title="Ainda não existem documentos"
                description="Os documentos carregados nesta entidade aparecerão aqui com o respectivo estado de validação."
              />
            ) : (
              documents.map((document) => {
                const requirement = requirementMap.get(
                  document.document_type,
                );

                return (
                  <div key={document.id} className="p-5">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50">
                        <FileText className="h-5 w-5 text-slate-500" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {requirement?.label || document.document_type}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {document.document_number || "Sem número"}
                          {document.expires_at
                            ? " · Validade: " +
                              formatDate(document.expires_at)
                            : ""}
                        </p>
                        {document.rejection_reason && (
                          <p className="mt-2 text-xs font-medium text-rose-700">
                            {document.rejection_reason}
                          </p>
                        )}
                      </div>

                      <StatusBadge
                        status={document.status}
                        label={documentStatusLabel(document.status)}
                      />

                      <button
                        type="button"
                        disabled={
                          !document.file_path || actionId === document.id
                        }
                        onClick={() => openDocument(document)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver
                      </button>
                    </div>

                    {canValidate &&
                      document.status !== "validado" &&
                      rejectingId !== document.id && (
                        <div className="mt-4 flex flex-wrap gap-2 pl-0 sm:pl-14">
                          <button
                            type="button"
                            disabled={actionId === document.id}
                            onClick={() => approveDocument(document.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-40"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Validar
                          </button>
                          <button
                            type="button"
                            disabled={actionId === document.id}
                            onClick={() => {
                              setRejectingId(document.id);
                              setRejectReason("");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-40"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Rejeitar
                          </button>
                        </div>
                      )}

                    {rejectingId === document.id && (
                      <div className="mt-4 rounded-xl bg-rose-50 p-4 sm:ml-14">
                        <label className="text-xs font-semibold text-rose-900">
                          Fundamentação da rejeição
                          <textarea
                            value={rejectReason}
                            onChange={(event) =>
                              setRejectReason(event.target.value)
                            }
                            rows={2}
                            className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-normal"
                          />
                        </label>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={
                              rejectReason.trim().length < 4 ||
                              actionId === document.id
                            }
                            onClick={() => rejectDocument(document.id)}
                            className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                          >
                            Confirmar rejeição
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason("");
                            }}
                            className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function documentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    nao_apresentado: "Não apresentado",
    em_validacao: "Em validação",
    validado: "Validado",
    rejeitado: "Rejeitado",
    expirado: "Expirado",
  };
  return labels[status] ?? status;
}


function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return kilobytes.toFixed(kilobytes >= 100 ? 0 : 1) + " KB";
  const megabytes = kilobytes / 1024;
  return megabytes.toFixed(megabytes >= 100 ? 0 : 1) + " MB";
}
