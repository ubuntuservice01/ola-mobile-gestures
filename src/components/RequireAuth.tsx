import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  defaultRouteForProfile,
  isPathAllowedForProfile,
  loadAccessProfile,
  profileAccessProblem,
} from "../lib/access-control";
import { supabase } from "../lib/supabase";

const PUBLIC_PATHS = ["/", "/login", "/recuperar-password", "/nova-password", "/consulta", "/q"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    let redirecting = false;

    const redirectToLogin = (reason?: string) => {
      redirecting = true;
      const params = new URLSearchParams({ redirect: location.pathname });
      if (reason) params.set("reason", reason);
      window.location.replace(`/login?${params.toString()}`);
    };

    const checkSessionAndAccess = async () => {
      if (isPublicPath(location.pathname)) {
        if (active) {
          setAuthenticated(true);
          setChecking(false);
        }
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error || !data.session) {
        redirectToLogin();
        return;
      }

      const profile = await loadAccessProfile(data.session.user.id);

      if (!active) return;

      const accessProblem = profileAccessProblem(profile);

      if (accessProblem || !profile) {
        redirecting = true;
        await supabase.auth.signOut({ scope: "local" });
        if (active) {
          const params = new URLSearchParams({
            redirect: location.pathname,
            reason: accessProblem ?? "missing_profile",
          });
          window.location.replace(`/login?${params.toString()}`);
        }
        return;
      }

      if (!isPathAllowedForProfile(location.pathname, profile)) {
        redirecting = true;
        window.location.replace(defaultRouteForProfile(profile));
        return;
      }

      setAuthenticated(true);
      setChecking(false);
    };

    void checkSessionAndAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || redirecting || isPublicPath(location.pathname)) return;

      if (event === "SIGNED_OUT" || !session) {
        redirectToLogin();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [location.pathname]);

  if (checking || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <img src="/mobigest-logo.svg" alt="MobiGest" className="mx-auto h-12 w-auto" />
          <p className="mt-5 text-sm text-slate-500">A verificar o acesso...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
