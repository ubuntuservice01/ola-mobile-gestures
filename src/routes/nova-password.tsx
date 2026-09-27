import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, LockKeyhole } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/nova-password")({
  component: NewPasswordPage,
});

function NewPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setReady(Boolean(data.session));
      setChecking(false);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!ready) {
      setMessage("O link de recuperação é inválido ou expirou. Solicite um novo link.");
      return;
    }

    if (password.length < 8) {
      setMessage("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setMessage("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage("Não foi possível actualizar a palavra-passe. Solicite um novo link.");
      setLoading(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    setSaved(true);
    setLoading(false);
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">A verificar o link de recuperação...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <img src="/mobigest-logo.svg" className="h-11" alt="MobiGest" />

        {saved ? (
          <div className="mt-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-slate-900">Palavra-passe actualizada</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              A sua palavra-passe foi alterada. Entre novamente com as novas credenciais.
            </p>
            <Link
              to="/login"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Ir para o login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-8 text-2xl font-bold text-slate-900">Definir nova palavra-passe</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Escolha uma nova palavra-passe para a sua conta.
            </p>

            {!ready && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                Este link não tem uma sessão de recuperação válida. Solicite novamente a recuperação da palavra-passe.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label className="mt-5 block text-sm font-medium text-slate-700">
                Nova palavra-passe
                <div className="mt-2 flex items-center rounded-xl border border-slate-300 px-3 focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10">
                  <LockKeyhole className="h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 flex-1 px-3 text-sm outline-none"
                  />
                </div>
              </label>

              <label className="mt-5 block text-sm font-medium text-slate-700">
                Confirmar palavra-passe
                <div className="mt-2 flex items-center rounded-xl border border-slate-300 px-3 focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10">
                  <LockKeyhole className="h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    className="h-12 flex-1 px-3 text-sm outline-none"
                  />
                </div>
              </label>

              {message && <p className="mt-3 text-sm font-medium text-red-600">{message}</p>}

              <button
                type="submit"
                disabled={loading || !ready}
                className="mt-6 w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {loading ? "A actualizar..." : "Guardar nova palavra-passe"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
