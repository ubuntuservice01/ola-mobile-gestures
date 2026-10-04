import { supabase } from "./supabase";

type ActivationResponse = {
  activated?: boolean;
  email?: string;
  error?: string;
  code?: string;
  attemptsRemaining?: number;
};

async function edgeErrorMessage(error: unknown) {
  const fallback = "Não foi possível activar a conta.";

  if (!error || typeof error !== "object") return fallback;

  const context = (error as { context?: Response }).context;
  if (context && typeof context.clone === "function") {
    try {
      const payload = await context.clone().json() as ActivationResponse;
      if (payload?.error) return payload.error;
    } catch {
      // Mantém a mensagem segura e genérica.
    }
  }

  const message = (error as { message?: string }).message;
  return message || fallback;
}

export async function activateAccount(input: {
  email: string;
  code: string;
  password: string;
}) {
  const { data, error } = await supabase.functions.invoke<ActivationResponse>(
    "activate-user",
    {
      body: {
        email: input.email.trim().toLowerCase(),
        code: input.code.trim().toUpperCase(),
        password: input.password,
      },
    },
  );

  if (error) {
    throw new Error(await edgeErrorMessage(error));
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.activated) {
    throw new Error("A activação não foi concluída.");
  }

  return data;
}
