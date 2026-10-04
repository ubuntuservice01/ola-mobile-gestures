import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/municipios")({
  component: LegacyMunicipiosRedirect,
});

function LegacyMunicipiosRedirect() {
  useEffect(() => {
    window.location.replace("/meu-municipio");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
      A abrir Meu Município...
    </div>
  );
}
