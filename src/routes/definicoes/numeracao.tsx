import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Hash,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  MobiGestShell,
  PageHeader,
  Card,
} from "../../components/MobiGestShell";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/definicoes/numeracao")({
  component: Numeracao,
});

type NumberingStatus = {
  municipality_id: string;
  municipality_name: string;
  municipality_code: string;
  current_value: number;
  next_value: number;
  current_number: string | null;
  next_number: string;
};

function Numeracao() {
  const [status, setStatus] = useState<NumberingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase.rpc(
      "current_mobigest_numbering_status",
    );

    if (error) {
      console.error("Falha ao carregar numeração MobiGest:", error);
      setStatus(null);
      setLoadError(
        error.message ||
          "Não foi possível consultar a numeração do município.",
      );
      setLoading(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setStatus((row as NumberingStatus | undefined) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <MobiGestShell
      title="Numeração"
      subtitle="Estado real da sequência municipal MobiGest."
    >
      <PageHeader
        title="Numeração MobiGest"
        description="A sequência é controlada pelo PostgreSQL e atribuída apenas na aprovação do registo."
      />

      <div className="mb-5 flex justify-end">
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          <RefreshCw
            className={"h-4 w-4 " + (loading ? "animate-spin" : "")}
          />
          Actualizar
        </button>
      </div>

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      {loading ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          A consultar contador municipal...
        </Card>
      ) : !status ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          Não foi possível obter o estado da numeração.
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <Hash className="h-5 w-5 text-sky-600" />
              <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">
                Formato
              </p>
              <p className="mt-1 text-2xl font-bold">
                MZ-{status.municipality_code}-000001
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Prefixo MZ + código do município + sequência de seis
                dígitos.
              </p>
            </Card>

            <Card className="p-6">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">
                Município
              </p>
              <p className="mt-1 text-2xl font-bold">
                {status.municipality_name}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Código institucional: {status.municipality_code}.
              </p>
            </Card>

            <Card className="p-6">
              <LockKeyhole className="h-5 w-5 text-amber-600" />
              <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">
                Próximo número
              </p>
              <p className="mt-1 text-2xl font-bold">
                {status.next_number}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Valor indicativo; a atribuição real ocorre
                atomicamente dentro da aprovação.
              </p>
            </Card>
          </div>

          <Card className="mt-6 p-6">
            <h3 className="font-bold">Estado do contador</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Info
                label="Último valor utilizado"
                value={status.current_value.toLocaleString("pt-MZ")}
              />
              <Info
                label="Último número atribuído"
                value={status.current_number ?? "Ainda nenhum"}
              />
              <Info
                label="Próxima sequência"
                value={status.next_value.toLocaleString("pt-MZ")}
              />
            </div>
          </Card>

          <Card className="mt-6 p-6">
            <h3 className="font-bold">Regras efectivas</h3>
            <div className="mt-5 space-y-4">
              {[
                "A sequência é independente por município.",
                "O número MobiGest é atribuído apenas quando o processo de registo é aprovado.",
                "A geração ocorre numa função PostgreSQL transaccional para evitar duplicação em aprovações simultâneas.",
                "A sequência é única por município e não depende do tipo de veículo.",
                "Depois de atribuído, o número permanece associado ao veículo mesmo após transferência de proprietário.",
                "O contador não é reiniciado anualmente.",
                "O número atribuído é protegido por restrição de unicidade na base de dados.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            O próximo número apresentado é apenas uma leitura do contador
            neste instante. Não deve ser reservado manualmente nem usado
            antes da aprovação, porque outro processo pode ser aprovado
            primeiro.
          </div>
        </>
      )}
    </MobiGestShell>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-all font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}
