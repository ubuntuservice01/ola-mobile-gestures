import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/municipios")({
  component: LegacyMunicipiosBoundary,
});

function LegacyMunicipiosBoundary() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isLegacyIndex =
    pathname === "/municipios" || pathname === "/municipios/";

  useEffect(() => {
    if (isLegacyIndex) {
      window.location.replace("/meu-municipio");
    }
  }, [isLegacyIndex]);

  if (!isLegacyIndex) {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
      A abrir Meu Município...
    </div>
  );
}
