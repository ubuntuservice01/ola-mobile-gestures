import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function response(request: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function validPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    /[A-Za-z]/.test(value) &&
    /[0-9]/.test(value)
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return response(request, 405, { error: "Método não permitido." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return response(request, 500, {
      error: "Configuração segura do serviço incompleta.",
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return response(request, 400, { error: "Pedido inválido." });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code =
    typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const password = body.password;

  if (!email || !email.includes("@") || !code) {
    return response(request, 400, {
      error: "Informe o email e o código de activação.",
    });
  }

  if (!validPassword(password)) {
    return response(request, 400, {
      error: "A palavra-passe deve ter pelo menos 8 caracteres, incluindo letras e números.",
    });
  }

  const { data: claimRows, error: claimError } = await admin.rpc(
    "claim_user_activation_code",
    {
      p_email: email,
      p_code: code,
    },
  );

  if (claimError) {
    console.error("activate-user claim failure", claimError);
    return response(request, 500, {
      error: "Não foi possível validar o código de activação.",
    });
  }

  const claim = Array.isArray(claimRows) ? claimRows[0] : null;

  if (!claim || claim.status !== "valid") {
    const messages: Record<string, string> = {
      invalid: "Email ou código de activação inválido.",
      expired: "O código de activação expirou. Solicite um novo código ao administrador.",
      locked: "O código foi bloqueado após várias tentativas. Solicite um novo código ao administrador.",
      busy: "Já existe uma activação em curso. Aguarde alguns minutos e tente novamente.",
    };

    return response(request, 400, {
      error: messages[claim?.status] ?? "Código de activação inválido.",
      code: claim?.status ?? "invalid",
      attemptsRemaining: claim?.attempts_remaining ?? 0,
    });
  }

  const activationId = claim.activation_id as string;
  const userId = claim.user_id as string;
  const claimToken = claim.claim_token as string;

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    user_metadata: {
      activation_required: false,
      activated_at: new Date().toISOString(),
    },
  });

  if (authError) {
    await admin.rpc("release_user_activation_claim", {
      p_activation_id: activationId,
      p_claim_token: claimToken,
    });

    console.error("activate-user auth failure", authError);
    return response(request, 500, {
      error: "Não foi possível definir a palavra-passe. Tente novamente.",
    });
  }

  const { data: finalizedUserId, error: finalizeError } = await admin.rpc(
    "finalize_user_activation",
    {
      p_activation_id: activationId,
      p_claim_token: claimToken,
    },
  );

  if (finalizeError || finalizedUserId !== userId) {
    console.error("activate-user finalize failure", finalizeError);
    return response(request, 500, {
      error: "A palavra-passe foi definida, mas a activação não pôde ser concluída. Contacte o administrador.",
    });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("municipality_id, role")
    .eq("id", userId)
    .maybeSingle();

  await admin.from("audit_logs").insert({
    actor_user_id: userId,
    actor_role: profile?.role ?? null,
    municipality_id: profile?.municipality_id ?? null,
    module: "users",
    action: "activate_account",
    entity_type: "profile",
    entity_id: userId,
    result: "success",
    reference: "ACCOUNT-ACTIVATION",
    new_values: {
      activated: true,
    },
    observation: "Conta activada através de código de uso único.",
    origin: "edge_function",
  });

  return response(request, 200, {
    activated: true,
    email,
  });
});
