import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "../lib/supabase";

const PUBLIC_PATHS = ["/", "/login", "/recuperar-password", "/nova-password", "/consulta"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      if (isPublicPath(location.pathname)) {
        if (active) {
          setAuthenticated(true);
          setChecking(false);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (!active) return;

      if (!data.session) {
        window.location.replace(`/login?redirect=${encodeURIComponent(location.pathname)}`);
        return;
      }

      setAuthenticated(true);
      setChecking(false);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || isPublicPath(location.pathname)) return;

      if (event === "SIGNED_OUT" || !session) {
        window.location.replace(`/login?redirect=${encodeURIComponent(location.pathname)}`);
        return;
      }

      setAuthenticated(true);
      setChecking(false);
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
