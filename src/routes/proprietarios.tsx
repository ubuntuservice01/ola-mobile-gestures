import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobiGestShell, PageHeader, Card } from "../components/MobiGestShell";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/proprietarios")({
  component: PropsRouteBoundary,
});

type OwnerRow = {
  id: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  status: string;
  vehicles: number;
};

function Props() {
  const [rows, setRows] = useState<OwnerRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("owners")
        .select("id, full_name, document_type, document_number, phone, status")
        .order("full_name", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Falha ao carregar proprietários:", error);
        setLoadError("Não foi possível carregar os proprietários.");
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        (data ?? []).map(async (owner) => {
          const countResult = await supabase
            .from("vehicles")
            .select("id", { count: "exact", head: true })
            .eq("current_owner_id", owner.id);

          if (countResult.error) throw countResult.error;

          return {
            ...owner,
            vehicles: countResult.count ?? 0,
          } as OwnerRow;
        }),
      ).catch((countError) => {
        console.error("Falha ao contar veículos por proprietário:", countError);
        return null;
      });

      if (!active) return;

      if (!enriched) {
        setLoadError("Os proprietários foram encontrados, mas as contagens não puderam ser carregadas.");
        setLoading(false);
        return;
      }

      setRows(enriched);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        [
          row.full_name,
          row.document_type ?? "",
          row.document_number ?? "",
          row.phone ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [rows, query],
  );

  return (
    <MobiGestShell title="Proprietários">
      <PageHeader
        title="Proprietários"
        description="Cidadãos associados aos veículos registados."
        action="+ Novo proprietário"
        actionTo="/proprietarios/novo"
      />

      <Card>
        <div className="flex items-center border-b border-slate-100 p-5">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar por nome, documento ou telefone..."
            className="h-11 flex-1 bg-transparent px-3 text-sm outline-none"
          />
        </div>

        {loadError && (
          <div className="border-b border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {loadError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Nome", "Documento", "Contacto", "Veículos", "Estado", "Acções"].map(
                  (heading) => (
                    <th className="px-5 py-3" key={heading}>
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    A carregar proprietários...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    {rows.length === 0
                      ? "Ainda não existem proprietários registados."
                      : "Nenhum proprietário corresponde à pesquisa."}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-semibold">{row.full_name}</td>
                    <td className="px-5 py-4">
                      {row.document_number
                        ? [row.document_type, row.document_number]
                            .filter(Boolean)
                            .join(" · ")
                        : "—"}
                    </td>
                    <td className="px-5 py-4">{row.phone || "—"}</td>
                    <td className="px-5 py-4">{row.vehicles}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to="/proprietarios/$id"
                        params={{ id: row.id }}
                        className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        aria-label={"Abrir " + row.full_name}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </MobiGestShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "activo"
      ? "bg-emerald-50 text-emerald-700"
      : status === "bloqueado"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + className}>
      {status === "activo"
        ? "Activo"
        : status === "bloqueado"
          ? "Bloqueado"
          : "Inactivo"}
    </span>
  );
}

function PropsRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/proprietarios">
      <Props />
    </RouteIndexBoundary>
  );
}
