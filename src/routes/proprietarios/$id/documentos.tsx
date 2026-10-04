import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DocumentManager } from "../../../components/DocumentManager";
import { MobiGestShell, Card } from "../../../components/MobiGestShell";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/proprietarios/$id/documentos")({
  component: Documentos,
});

type OwnerContext = {
  id: string;
  municipality_id: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
};

function Documentos() {
  const { id } = Route.useParams();
  const [owner, setOwner] = useState<OwnerContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("owners")
        .select(
          "id, municipality_id, full_name, document_type, document_number",
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        console.error(
          "Falha ao carregar proprietário para documentos:",
          error,
        );
        setLoadError("Proprietário não encontrado ou fora do seu âmbito.");
        setLoading(false);
        return;
      }

      setOwner(data as OwnerContext);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <MobiGestShell
      title="Documentos do proprietário"
      subtitle="Ficheiros privados associados ao cadastro pessoal."
    >
      <Link
        to="/proprietarios/$id"
        params={{ id }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao proprietário
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Documentação pessoal</h2>
          <p className="mt-1 text-sm text-slate-500">
            Documentos de identificação e comprovativos do proprietário.
          </p>
        </div>
        <Link
          to="/definicoes/documentos"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
        >
          <Settings2 className="h-4 w-4" />
          Matriz de requisitos
        </Link>
      </div>

      {loading ? (
        <Card className="p-8 text-sm text-slate-500">
          A carregar proprietário...
        </Card>
      ) : loadError || !owner ? (
        <Card className="p-8 text-sm font-medium text-red-700">
          {loadError ?? "Proprietário não encontrado."}
        </Card>
      ) : (
        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Proprietário
            </p>
            <p className="mt-1 text-lg font-bold">{owner.full_name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {owner.document_number
                ? [owner.document_type, owner.document_number]
                    .filter(Boolean)
                    .join(" · ")
                : "Documento principal não informado"}
            </p>
          </Card>

          <DocumentManager
            municipalityId={owner.municipality_id}
            subjectType="owner"
            subjectId={owner.id}
            title="Documentos do proprietário"
          />
        </div>
      )}
    </MobiGestShell>
  );
}
