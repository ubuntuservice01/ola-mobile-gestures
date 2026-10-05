import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { RequireAuth } from "../components/RequireAuth";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">A página que procura não existe ou foi movida.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({
  error,
  reset,
}: {
  error: unknown;
  reset?: () => void;
}) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(err);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(err, { boundary: "tanstack_root_error_component" });
  }, [err]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Não foi possível carregar</h1>
        <p className="mt-2 text-sm text-muted-foreground">Não foi possível concluir o carregamento. Pode tentar novamente sem sair desta página.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset?.(); }} className="mobigest-button rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Tentar novamente</button>
          <a href="/" className="mobigest-button rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground">Início</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MobiGest | Gestão Municipal de Mobilidade" },
      { name: "description", content: "Sistema municipal de gestão de motorizadas, carros e bicicletas." },
      { name: "author", content: "MobiGest" },
      { property: "og:title", content: "MobiGest | Gestão Municipal de Mobilidade" },
      { property: "og:description", content: "Gestão municipal de motorizadas, carros e bicicletas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-MZ">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const homeHasIntegratedFooter = pathname === "/";

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        </div>

        {!homeHasIntegratedFooter && (
          <footer className="mobigest-no-print border-t border-slate-200 bg-white px-5 py-4 text-center text-xs text-slate-400">
            Uma plataforma desenvolvida pela Ubuntu Service, Lda.
          </footer>
        )}
      </div>

      <Toaster
        position="top-right"
        richColors
        closeButton
        visibleToasts={3}
        duration={4000}
      />
    </QueryClientProvider>
  );
}
