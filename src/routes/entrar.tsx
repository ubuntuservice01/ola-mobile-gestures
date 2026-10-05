import { Navigate, createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/entrar")({
  head: () => ({ meta:[{title:"Entrar | MobiGest"},{name:"description",content:"Acesso autorizado à plataforma MobiGest."}] }),
  component: () => <Navigate to="/login" replace />,
});
