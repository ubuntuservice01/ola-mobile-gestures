import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
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
import { loadCurrentMunicipalAccess } from "../lib/municipal-access";

export const Route = createFileRoute("/login")({
  head: () => ({ meta:[{title:"Entrar | MobiGest"},{name:"description",content:"Aceda à plataforma de gestão municipal de mobilidade MobiGest."}] }),
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
        <section className="relative hidden overflow-hidden bg-[#0B172A] lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="public-grid absolute inset-0 opacity-30" />
          <div className="public-orb public-orb-a" />
          <div className="relative"><a href="/" aria-label="Voltar ao MobiGest"><img src="/mobigest-logo.svg" alt="MobiGest" className="h-14 w-fit brightness-0 invert" /></a></div>
          <div className="relative max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Gestão Municipal</p>
            <h1 className="font-display mt-5 text-5xl font-bold leading-tight text-white">Bem-vindo ao MobiGest</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">Aceda à plataforma de gestão municipal de mobilidade.</p>
            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              {["Gestão centralizada","Acesso por perfil","Informação organizada","Fiscalização apoiada por dados"].map(item=><div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm font-semibold text-slate-200"><CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300"/>{item}</div>)}
            </div>
            <p className="mt-9 font-display text-xl font-bold text-white">Uma plataforma para transformar dados em melhor gestão municipal.</p>
          </div>
          <p className="relative text-sm text-slate-500">Uma plataforma desenvolvida pela Ubuntu Service, Lda.</p>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <a href="/" className="mb-9 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-500 transition hover:text-[#147D92] focus:outline-none focus:ring-4 focus:ring-sky-500/10">
              <ArrowLeft className="h-4 w-4" /> Voltar à página inicial
            </a>

            <div className="mb-8 lg:hidden">
              <img src="/mobigest-logo.svg" alt="MobiGest" className="h-12 w-auto" />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-[#147D92]"><LockKeyhole className="h-5 w-5" /></div>
                <h2 className="font-display text-3xl font-bold text-slate-950">Entrar</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Use as credenciais da sua conta autorizada.</p>
              </div>

              <form className="space-y-5" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                setMessage(null);
                setLoading(true);

                const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
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

                const municipalAccess = profile.role === "super_admin" ? await loadCurrentMunicipalAccess() : null;
                const hasMunicipalAccess = Boolean(municipalAccess);
                const redirect = new URLSearchParams(window.location.search).get("redirect");
                const destination =
                  isSafeInternalPath(redirect) && isPathAllowedForProfile(redirect, profile, hasMunicipalAccess)
                    ? redirect
                    : defaultRouteForProfile(profile, hasMunicipalAccess);

                window.location.replace(destination);
              }}>
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="public-input pl-11" />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Palavra-passe</label>
                    <a href="/recuperar-password" className="text-xs font-semibold text-[#147D92] hover:underline">Recuperar palavra-passe</a>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="public-input pl-11 pr-12" />
                    <button type="button" aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"} onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {message && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{message}</p>}

                <button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[#147D92] text-sm font-bold text-white transition hover:bg-[#106a7c] focus:outline-none focus:ring-4 focus:ring-sky-500/20 disabled:opacity-60">
                  {loading ? "A entrar..." : "Entrar"}
                </button>

                <a href="/ativar-conta" className="block text-center text-sm font-semibold text-[#147D92] hover:underline">Primeiro acesso? Activar conta</a>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
