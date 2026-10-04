import { Outlet, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

function normalize(pathname: string) {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "");
}

function matchesPatternExactly(pattern: string, pathname: string) {
  const patternParts = normalize(pattern).split("/").filter(Boolean);
  const pathParts = normalize(pathname).split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) return false;

  return patternParts.every((part, index) => {
    if (part.startsWith("$")) return Boolean(pathParts[index]);
    return part === pathParts[index];
  });
}

export function RouteIndexBoundary({
  pattern,
  children,
}: {
  pattern: string;
  children: ReactNode;
}) {
  const location = useLocation();

  if (!matchesPatternExactly(pattern, location.pathname)) {
    return <Outlet />;
  }

  return <>{children}</>;
}
