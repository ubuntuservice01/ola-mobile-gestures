import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/recuperar-password")({
  component: RecoverPasswordPage,
});

function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nova-password`,
    });

    if (error) {
      setMessage("Não foi possível enviar as instruções. Confirme o email e tente novamente.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-md">
        <img src="/mobigest-logo.svg" className="mx-auto mb-8 h-12" alt="MobiGest" />

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-2xl font-bold text-slate-900">Instruções enviadas</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Se existir uma conta associada a <strong className="text-slate-700">{email}</strong>, receberá um email com o link para definir uma nova palavra-passe.
              </p>
              <Link
                to="/login"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Recuperar palavra-passe</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Introduza o email da sua conta para receber as instruções de recuperação.
              </p>

              <form onSubmit={handleSubmit} className="mt-7">
                <label htmlFor="recover-email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="mt-2 flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    id="recover-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 flex-1 px-3 text-sm outline-none"
                    placeholder="nome@municipio.gov.mz"
                  />
                </div>

                {message && <p className="mt-3 text-sm font-medium text-red-600">{message}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-5 w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {loading ? "A enviar..." : "Enviar instruções"}
                </button>
              </form>

              <Link
                to="/login"
                className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
