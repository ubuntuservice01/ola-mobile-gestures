import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  accessReasonMessage,
  defaultRouteForProfile,
  isPathAllowedForProfile,
  isSafeInternalPath,
  loadAccessProfile,
  profileAccessProblem,
} from "../lib/access-control";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMessage(accessReasonMessage(new URLSearchParams(window.location.search).get("reason")));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <img src="/mobigest-logo.svg" alt="MobiGest" className="h-14 w-fit brightness-0 invert" />
          <div className="max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-400">Gestão Municipal</p>
            <h1 className="mt-5 text-5xl font-bold leading-tight text-white">
              Uma gestão mais simples para a mobilidade do município.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-400">
              Aceda à área administrativa para gerir veículos, proprietários e registos municipais.
            </p>
          </div>
          <p className="text-sm text-slate-500">MobiGest · Gestão de Motos, Carros e Bicicletas</p>
        </section>

        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <a href="/" className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-sky-600">
              <ArrowLeft className="h-4 w-4" /> Voltar à página inicial
            </a>

            <div className="mb-8 lg:hidden">
              <img src="/mobigest-logo.svg" alt="MobiGest" className="h-12 w-auto" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
              <div className="mb-8">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Aceder ao MobiGest</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Entre com as credenciais da sua conta autorizada.</p>
              </div>

              <form
                className="space-y-5"
                onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  setMessage(null);
                  setLoading(true);

                  const { data, error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                  });

                  if (error || !data.user) {
                    setMessage("Email ou palavra-passe inválidos.");
                    setLoading(false);
                    return;
                  }

                  const profile = await loadAccessProfile(data.user.id);
                  const accessProblem = profileAccessProblem(profile);

                  if (accessProblem || !profile) {
                    await supabase.auth.signOut({ scope: "local" });
                    setMessage(accessReasonMessage(accessProblem) ?? "Conta sem acesso autorizado ao MobiGest.");
                    setLoading(false);
                    return;
                  }

                  const redirect = new URLSearchParams(window.location.search).get("redirect");
                  const destination =
                    isSafeInternalPath(redirect) && isPathAllowedForProfile(redirect, profile)
                      ? redirect
                      : defaultRouteForProfile(profile);

                  window.location.replace(destination);
                }}
              >
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input id="email" name="email" type="email" autoComplete="email" placeholder="nome@municipio.gov.mz" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">Palavra-passe</label>
                    <a href="/recuperar-password" className="text-xs font-semibold text-sky-600 hover:text-sky-700">Esqueceu a palavra-passe?</a>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Introduza a sua palavra-passe" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" />
                    <button type="button" aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"} onClick={() => setShowPassword((value) => !value)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {message && <p className="text-sm font-medium text-red-600">{message}</p>}

                <button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-sky-600 text-sm font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-500/20 disabled:opacity-60">
                  {loading ? "A entrar..." : "Entrar"}
                </button>
              </form>

              <p className="mt-7 border-t border-slate-100 pt-6 text-center text-xs leading-5 text-slate-400">
                O acesso à área administrativa é reservado aos utilizadores autorizados.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
