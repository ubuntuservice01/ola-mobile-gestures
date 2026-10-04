import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { activateAccount } from "../lib/account-activation";
import {
  defaultRouteForProfile,
  loadAccessProfile,
  profileAccessProblem,
} from "../lib/access-control";
import { loadCurrentMunicipalAccess } from "../lib/municipal-access";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/ativar-conta")({
  component: ActivateAccountPage,
});

function ActivateAccountPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const continueToPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const normalizedCode = code.trim().toUpperCase();

    if (!email.includes("@")) {
      setMessage("Introduza um email válido.");
      return;
    }

    if (!/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(normalizedCode)) {
      setMessage("Introduza o código no formato XXXX-XXXX.");
      return;
    }

    setCode(normalizedCode);
    setStep(2);
  };

  const activate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setMessage("A palavra-passe deve ter pelo menos 8 caracteres, incluindo letras e números.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);

    try {
      await activateAccount({
        email,
        code,
        password,
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error || !data.user) {
        window.location.replace("/login?reason=activation_complete");
        return;
      }

      const profile = await loadAccessProfile(data.user.id);
      const problem = profileAccessProblem(profile);

      if (problem || !profile) {
        await supabase.auth.signOut({ scope: "local" });
        window.location.replace("/login");
        return;
      }

      const municipalAccess =
        profile.role === "super_admin"
          ? await loadCurrentMunicipalAccess()
          : null;

      window.location.replace(
        defaultRouteForProfile(profile, Boolean(municipalAccess)),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível activar a conta.",
      );
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <img
            src="/mobigest-logo.svg"
            alt="MobiGest"
            className="h-14 w-fit brightness-0 invert"
          />
          <div className="max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-400">
              Primeiro acesso
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-tight text-white">
              Active a sua conta e defina a sua palavra-passe.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-400">
              Use o código entregue pelo administrador. O código é de uso único e expira automaticamente.
            </p>
          </div>
          <p className="text-sm text-slate-500">
            MobiGest · Gestão de Motos, Carros e Bicicletas
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <a
              href="/login"
              className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-sky-600"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar ao login
            </a>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
              <div className="mb-8">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {step === 1 ? "Activar conta" : "Definir palavra-passe"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {step === 1
                    ? "Introduza o email da conta e o código entregue pelo administrador."
                    : "Escolha a palavra-passe que passará a usar no MobiGest."}
                </p>
              </div>

              {step === 1 ? (
                <form className="space-y-5" onSubmit={continueToPassword}>
                  <div>
                    <label htmlFor="activation-email" className="mb-2 block text-sm font-medium text-slate-700">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="activation-email"
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-300 pl-11 pr-4 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                        placeholder="utilizador@municipio.gov.mz"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="activation-code" className="mb-2 block text-sm font-medium text-slate-700">
                      Código de activação
                    </label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="activation-code"
                        type="text"
                        required
                        value={code}
                        onChange={(event) => setCode(event.target.value.toUpperCase())}
                        className="h-12 w-full rounded-xl border border-slate-300 pl-11 pr-4 font-mono text-sm uppercase tracking-[0.18em] outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                        placeholder="7KFM-92QX"
                        maxLength={9}
                      />
                    </div>
                  </div>

                  {message && (
                    <p className="text-sm font-medium text-red-600">{message}</p>
                  )}

                  <button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-sky-600 text-sm font-semibold text-white hover:bg-sky-700"
                  >
                    Continuar
                  </button>
                </form>
              ) : (
                <form className="space-y-5" onSubmit={activate}>
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                    <p><b>Email:</b> {email.trim().toLowerCase()}</p>
                    <p className="mt-1"><b>Código:</b> {code}</p>
                  </div>

                  <div>
                    <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-slate-700">
                      Nova palavra-passe
                    </label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-300 pl-11 pr-12 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                        placeholder="Mínimo 8 caracteres"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-slate-700">
                      Confirmar palavra-passe
                    </label>
                    <input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                      placeholder="Repita a palavra-passe"
                    />
                  </div>

                  {message && (
                    <p className="text-sm font-medium text-red-600">{message}</p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMessage(null);
                        setStep(1);
                      }}
                      disabled={loading}
                      className="h-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="h-12 rounded-xl bg-sky-600 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                    >
                      {loading ? "A activar..." : "Activar e entrar"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
