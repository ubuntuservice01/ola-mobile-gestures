import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const recipient = "gpalichi27@gmail.com";

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(request: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8" },
  });
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char] ?? char));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, 405, { error: "Método não permitido." });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json(request, 400, { error: "Pedido inválido." }); }

  if (clean(body.website, 200)) {
    return json(request, 200, { received: true, emailSent: false });
  }

  const payload = {
    full_name: clean(body.full_name, 120),
    institution: clean(body.institution, 180),
    role_title: clean(body.role_title, 120) || null,
    phone: clean(body.phone, 30),
    email: clean(body.email, 180) || null,
    subject: clean(body.subject, 120),
    message: clean(body.message, 4000),
    source: "public_website",
  };

  if (
    payload.full_name.length < 2 ||
    payload.institution.length < 2 ||
    payload.phone.length < 7 ||
    payload.subject.length < 2 ||
    payload.message.length < 10
  ) {
    return json(request, 400, { error: "Preencha correctamente os campos obrigatórios." });
  }

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return json(request, 400, { error: "Email inválido." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(request, 500, { error: "Serviço temporariamente indisponível." });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: saved, error: saveError } = await admin
    .from("contact_messages")
    .insert({ ...payload, email_delivery_status: "pending_configuration" })
    .select("id")
    .single();

  if (saveError || !saved?.id) {
    console.error("public-contact save failure", saveError);
    return json(request, 500, { error: "Não foi possível registar a mensagem." });
  }

  let emailSent = false;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("CONTACT_FROM_EMAIL");

  if (resendKey && fromEmail) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient],
          reply_to: payload.email ?? undefined,
          subject: `MobiGest — ${payload.subject}`,
          html: `
            <h2>Novo contacto recebido pelo MobiGest</h2>
            <p><strong>Nome:</strong> ${escapeHtml(payload.full_name)}</p>
            <p><strong>Instituição:</strong> ${escapeHtml(payload.institution)}</p>
            <p><strong>Cargo/Função:</strong> ${escapeHtml(payload.role_title ?? "Não indicado")}</p>
            <p><strong>Telefone:</strong> ${escapeHtml(payload.phone)}</p>
            <p><strong>Email:</strong> ${escapeHtml(payload.email ?? "Não indicado")}</p>
            <p><strong>Assunto:</strong> ${escapeHtml(payload.subject)}</p>
            <p><strong>Mensagem:</strong></p>
            <p>${escapeHtml(payload.message).replace(/\n/g, "<br>")}</p>
          `,
        }),
      });
      emailSent = response.ok;
      await admin.from("contact_messages").update({
        email_delivery_status: emailSent ? "sent" : "failed",
      }).eq("id", saved.id);
      if (!response.ok) console.error("public-contact email failure", await response.text());
    } catch (error) {
      console.error("public-contact email exception", error);
      await admin.from("contact_messages").update({ email_delivery_status: "failed" }).eq("id", saved.id);
    }
  }

  return json(request, 200, { received: true, emailSent });
});
