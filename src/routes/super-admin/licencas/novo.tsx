import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, KeyRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SuperAdminShell, SuperCard } from "../../../components/SuperAdminShell";
import { createLicense } from "../../../lib/licenses";
import { supabase } from "../../../lib/supabase";
import { useSessionDraft } from "../../../hooks/use-session-draft";
import {
  EmptyState,
  LoadingButton,
  NetworkErrorState,
  ProcessingOverlay,
  SkeletonCard,
  notify,
} from "../../../components/mobigest/Experience";

export const Route = createFileRoute("/super-admin/licencas/novo")({
  component: NovaLicenca,
});

type Municipality = {
  id: string;
  name: string;
  code: string;
  status: string;
};

type Plan = {
  id: string;
  code: string;
  name: string;
  max_users: number | null;
  max_vehicles: number | null;
  active: boolean;
};

function NovaLicenca() {
  const navigate = useNavigate();

  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [municipalityId, setMunicipalityId] = useState("");
  const [planId, setPlanId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState<
    "activa" | "em_configuracao" | "suspensa"
  >("em_configuracao");
  const [maxUsers, setMaxUsers] = useState("");
  const [maxVehicles, setMaxVehicles] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const licenseDraft = useSessionDraft({
    key: "super-admin:licencas:novo",
    value: {
      municipalityId,
      planId,
      start,
      end,
      status,
      maxUsers,
      maxVehicles,
      notes,
    },
    restore: (draft) => {
      setMunicipalityId(draft.municipalityId ?? "");
      setPlanId(draft.planId ?? "");
      setStart(draft.start ?? "");
      setEnd(draft.end ?? "");
      setStatus(draft.status ?? "activa");
      setMaxUsers(draft.maxUsers ?? "");
      setMaxVehicles(draft.maxVehicles ?? "");
      setNotes(draft.notes ?? "");
      notify.info("Rascunho recuperado automaticamente.");
    },
    isMeaningful: (draft) =>
      Boolean(
        draft.municipalityId ||
          draft.planId ||
          draft.start ||
          draft.end ||
          draft.maxUsers ||
          draft.maxVehicles ||
          draft.notes?.trim(),
      ),
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [municipalityResult, planResult, licensesResult] =
        await Promise.all([
          supabase
            .from("municipalities")
            .select("id, name, code, status")
            .neq("status", "inactivo")
            .order("name", { ascending: true }),
          supabase
            .from("license_plans")
            .select("id, code, name, max_users, max_vehicles, active")
            .eq("active", true)
            .order("name", { ascending: true }),
          supabase
            .from("licenses")
            .select("municipality_id, status")
            .in("status", ["em_configuracao", "activa", "suspensa"]),
        ]);

      if (!active) return;

      const error =
        municipalityResult.error ??
        planResult.error ??
        licensesResult.error;

      if (error) {
        console.error("Falha ao preparar nova licença:", error);
        setLoadError("Não foi possível carregar municípios e planos.");
        setLoading(false);
        return;
      }

      const occupied = new Set(
        (licensesResult.data ?? []).map((license) => license.municipality_id),
      );
      const available = ((municipalityResult.data ?? []) as Municipality[]).filter(
        (municipality) => !occupied.has(municipality.id),
      );
      const planRows = (planResult.data ?? []) as Plan[];

      setMunicipalities(available);
      setPlans(planRows);
      if (available[0]) setMunicipalityId(available[0].id);
      if (planRows[0]) setPlanId(planRows[0].id);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const selectedMunicipality = municipalities.find(
    (municipality) => municipality.id === municipalityId,
  );
  const selectedPlan = plans.find((plan) => plan.id === planId);

  const effectiveUsers = useMemo(
    () =>
      maxUsers
        ? Number(maxUsers)
        : selectedPlan?.max_users ?? null,
    [maxUsers, selectedPlan],
  );
  const effectiveVehicles = useMemo(
    () =>
      maxVehicles
        ? Number(maxVehicles)
        : selectedPlan?.max_vehicles ?? null,
    [maxVehicles, selectedPlan],
  );

  const canSave =
    Boolean(municipalityId) &&
    Boolean(planId) &&
    (status !== "activa" || (Boolean(start) && Boolean(end))) &&
    (!start || !end || end >= start) &&
    !saving;

  const save = async () => {
    if (!canSave) return;

    const parsedUsers = maxUsers ? Number(maxUsers) : null;
    const parsedVehicles = maxVehicles ? Number(maxVehicles) : null;

    if (
      (parsedUsers !== null &&
        (!Number.isInteger(parsedUsers) || parsedUsers <= 0)) ||
      (parsedVehicles !== null &&
        (!Number.isInteger(parsedVehicles) || parsedVehicles <= 0))
    ) {
      setSaveError("Os limites personalizados devem ser números inteiros positivos.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const licenseId = await createLicense({
        municipalityId,
        planId,
        startsAt: start || null,
        endsAt: end || null,
        status,
        maxUsers: parsedUsers,
        maxVehicles: parsedVehicles,
        notes: notes.trim() || null,
      });

      licenseDraft.clearDraft();
      notify.success(
        "Licença criada",
        "A licença municipal foi registada com sucesso.",
      );

      await navigate({
        to: "/super-admin/licencas/$id",
        params: { id: licenseId },
        replace: true,
      });
    } catch (error) {
      console.error("Falha ao criar licença:", error);
      const safeMessage = "Não foi possível criar a licença.";
      setSaveError(safeMessage);
      notify.error("Licença não criada", safeMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SuperAdminShell
      title="Nova licença"
      subtitle="Atribuir uma licença de utilização do MobiGest a um município."
    >
      <Link
        to="/super-admin/licencas"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Licenças
      </Link>

      <SuperCard className="mx-auto max-w-4xl p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <KeyRound />
          </div>
          <div>
            <h2 className="text-xl font-bold">Dados da licença</h2>
            <p className="mt-1 text-sm text-slate-500">
              A licença controla acesso, limites e módulos do software para o
              município.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : loadError ? (
          <div className="mt-7">
            <NetworkErrorState
              message={loadError}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </div>
        ) : municipalities.length === 0 ? (
          <EmptyState
            title="Nenhum município disponível para nova licença"
            description="Todos os municípios disponíveis já possuem uma licença corrente. Edite, renove ou cancele a licença existente antes de criar outra."
          />
        ) : plans.length === 0 ? (
          <EmptyState
            title="Não existem planos activos"
            description="Crie ou active um plano de licença antes de emitir uma licença municipal."
            action={
              <Link
                to="/super-admin/licencas/planos"
                className="mobigest-button inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Gerir planos
              </Link>
            }
          />
        ) : (
          <>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium">
                Município *
                <select
                  value={municipalityId}
                  onChange={(event) => setMunicipalityId(event.target.value)}
                  className={inputClass}
                >
                  {municipalities.map((municipality) => (
                    <option key={municipality.id} value={municipality.id}>
                      {municipality.name} · {municipality.code}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Plano *
                <select
                  value={planId}
                  onChange={(event) => {
                    setPlanId(event.target.value);
                    setMaxUsers("");
                    setMaxVehicles("");
                  }}
                  className={inputClass}
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} · {plan.code}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Início
                <input
                  type="date"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-medium">
                Fim
                <input
                  type="date"
                  min={start || undefined}
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-medium">
                Estado inicial
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as
                        | "activa"
                        | "em_configuracao"
                        | "suspensa",
                    )
                  }
                  className={inputClass}
                >
                  <option value="em_configuracao">Em configuração</option>
                  <option value="activa">Activa</option>
                  <option value="suspensa">Suspensa</option>
                </select>
              </label>

              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <p className="text-xs text-slate-400">Município seleccionado</p>
                <p className="mt-1 font-semibold">
                  {selectedMunicipality?.name ?? "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Estado municipal: {selectedMunicipality?.status ?? "—"}
                </p>
              </div>

              <label className="text-sm font-medium">
                Limite personalizado de utilizadores
                <input
                  value={maxUsers}
                  onChange={(event) =>
                    setMaxUsers(event.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder={
                    selectedPlan?.max_users
                      ? "Plano: " + selectedPlan.max_users
                      : "Sem limite no plano"
                  }
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-medium">
                Limite personalizado de veículos
                <input
                  value={maxVehicles}
                  onChange={(event) =>
                    setMaxVehicles(event.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder={
                    selectedPlan?.max_vehicles
                      ? "Plano: " + selectedPlan.max_vehicles
                      : "Sem limite no plano"
                  }
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-medium md:col-span-2">
                Observação
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Informação administrativa opcional"
                />
              </label>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <Info
                label="Utilizadores efectivos"
                value={
                  effectiveUsers === null
                    ? "Sem limite"
                    : effectiveUsers.toLocaleString("pt-MZ")
                }
              />
              <Info
                label="Veículos efectivos"
                value={
                  effectiveVehicles === null
                    ? "Sem limite"
                    : effectiveVehicles.toLocaleString("pt-MZ")
                }
              />
              <Info
                label="Plano"
                value={selectedPlan?.name ?? "—"}
              />
            </div>

            {status === "activa" && (!start || !end) && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Uma licença activa exige data de início e fim.
              </div>
            )}

            {start && end && end < start && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                A data de fim não pode ser anterior ao início.
              </div>
            )}

            {saveError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {saveError}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3">
              <Link
                to="/super-admin/licencas"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
              >
                Cancelar
              </Link>
              <LoadingButton
                onClick={save}
                disabled={!canSave}
                state={saving ? "loading" : "idle"}
                idleLabel="Criar licença"
                loadingLabel="A criar licença..."
                icon={<KeyRound className="h-4 w-4" />}
                className="bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40"
              />
            </div>
          </>
        )}
      </SuperCard>

      <ProcessingOverlay
        open={saving}
        message="A emitir a licença municipal..."
      />
    </SuperAdminShell>
  );
}

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-sky-500";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
