import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

type AdminClient = ReturnType<typeof createClient<any>>;

type Role = "super_admin" | "admin_municipal" | "tecnico" | "fiscal" | "financeiro";
type Status = "activo" | "suspenso" | "inactivo";

type ActorProfile = {
  id: string;
  role: Role;
  status: Status;
  municipality_id: string | null;
};

type TargetProfile = ActorProfile & {
  full_name: string;
  phone: string | null;
  administrative_post_id: string | null;
};

const municipalRoles: Role[] = ["admin_municipal", "tecnico", "fiscal", "financeiro"];
const subordinateRoles: Role[] = ["tecnico", "fiscal", "financeiro"];

function configuredOrigins() {
  return (Deno.env.get("MOBIGEST_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = configuredOrigins();
  const allowOrigin =
    allowed.length === 0 ? "*" : allowed.includes(origin) ? origin : allowed[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
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

function isRole(value: unknown): value is Role {
  return typeof value === "string" &&
    ["super_admin", "admin_municipal", "tecnico", "fiscal", "financeiro"].includes(value);
}

function isStatus(value: unknown): value is Status {
  return typeof value === "string" && ["activo", "suspenso", "inactivo"].includes(value);
}

function canManageTarget(actor: ActorProfile, targetRole: Role, municipalityId: string | null) {
  if (targetRole === "super_admin") return false;

  if (actor.role === "super_admin") {
    return municipalRoles.includes(targetRole) && Boolean(municipalityId);
  }

  if (actor.role === "admin_municipal") {
    return (
      Boolean(actor.municipality_id) &&
      actor.municipality_id === municipalityId &&
      subordinateRoles.includes(targetRole)
    );
  }

  return false;
}


async function validateSuperAdminMunicipalSession(
  admin: AdminClient,
  actor: ActorProfile,
  accessSessionId: string | null,
  municipalityId: string | null,
) {
  if (actor.role !== "super_admin" || !accessSessionId) return;

  if (!municipalityId) {
    throw new Error("Município obrigatório no contexto municipal.");
  }

  const { data: session, error } = await admin
    .from("municipal_access_sessions")
    .select("id, municipality_id, mode, status, expires_at, ended_at")
    .eq("id", accessSessionId)
    .eq("super_admin_id", actor.id)
    .maybeSingle();

  if (error || !session) {
    throw new Error("Sessão municipal não encontrada.");
  }

  if (
    session.status !== "activa" ||
    session.ended_at ||
    new Date(session.expires_at).getTime() <= Date.now()
  ) {
    throw new Error("A sessão municipal expirou ou já foi encerrada.");
  }

  if (session.mode !== "assistencia") {
    throw new Error("Esta operação exige uma sessão municipal em modo Assistência.");
  }

  if (session.municipality_id !== municipalityId) {
    throw new Error("O município da operação não corresponde à sessão activa.");
  }
}

async function validateTerritory(
  admin: AdminClient,
  municipalityId: string,
  postId: string | null,
) {
  const { data: municipality, error: municipalityError } = await admin
    .from("municipalities")
    .select("id, status")
    .eq("id", municipalityId)
    .maybeSingle();

  if (municipalityError || !municipality) {
    throw new Error("Município não encontrado.");
  }

  if (municipality.status === "inactivo") {
    throw new Error("Não é permitido gerir utilizadores de um município inactivo.");
  }

  if (!postId) return;

  const { data: post, error: postError } = await admin
    .from("administrative_posts")
    .select("id, municipality_id, status")
    .eq("id", postId)
    .maybeSingle();

  if (postError || !post) {
    throw new Error("Posto administrativo não encontrado.");
  }

  if (post.municipality_id !== municipalityId) {
    throw new Error("O posto administrativo não pertence ao município seleccionado.");
  }

  if (post.status !== "activo") {
    throw new Error("O posto administrativo seleccionado está inactivo.");
  }
}

async function audit(
  admin: AdminClient,
  actor: ActorProfile,
  municipalityId: string | null,
  action: string,
  entityId: string,
  oldValues: unknown,
  newValues: unknown,
  observation: string,
) {
  const { error } = await admin.from("audit_logs").insert({
    actor_user_id: actor.id,
    actor_role: actor.role,
    municipality_id: municipalityId,
    module: "users",
    action,
    entity_type: "profile",
    entity_id: entityId,
    result: "success",
    old_values: oldValues,
    new_values: newValues,
    observation,
    origin: "edge_function",
  });

  if (error) throw error;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return response(request, 405, { error: "Método não permitido." });
  }

  const allowedOrigins = configuredOrigins();
  const requestOrigin = request.headers.get("origin") ?? "";
  if (allowedOrigins.length > 0 && requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    return response(request, 403, { error: "Origem não autorizada." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return response(request, 500, { error: "Configuração segura do serviço incompleta." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return response(request, 401, { error: "Sessão inválida." });
  }

  const { data: actorData, error: actorError } = await admin
    .from("profiles")
    .select("id, role, status, municipality_id")
    .eq("id", user.id)
    .maybeSingle();

  if (actorError || !actorData || actorData.status !== "activo") {
    return response(request, 403, { error: "Utilizador sem autorização administrativa." });
  }

  const actor = actorData as ActorProfile;

  if (!["super_admin", "admin_municipal"].includes(actor.role)) {
    return response(request, 403, { error: "Perfil sem permissão para gerir utilizadores." });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (error) {
    console.error("admin-users invalid JSON body", {
      contentType: request.headers.get("content-type"),
      contentLength: request.headers.get("content-length"),
      error: error instanceof Error ? error.message : "unknown",
    });
    return response(request, 400, {
      error: "Pedido inválido.",
      code: "INVALID_JSON_BODY",
    });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";

  try {
    if (action === "create") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
      const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
      const role = typeof body.role === "string" ? body.role.trim() : body.role;
      const municipalityId =
        typeof body.municipalityId === "string"
          ? body.municipalityId.trim()
          : typeof body.municipality_id === "string"
            ? body.municipality_id.trim()
            : null;
      const postId = typeof body.administrativePostId === "string"
        ? body.administrativePostId.trim() || null
        : typeof body.administrative_post_id === "string"
          ? body.administrative_post_id.trim() || null
          : null;
      const accessSessionId =
        typeof body.accessSessionId === "string"
          ? body.accessSessionId.trim() || null
          : typeof body.access_session_id === "string"
            ? body.access_session_id.trim() || null
            : null;

      if (!email || !email.includes("@") || !fullName || !isRole(role) || !municipalityId) {
        console.error("admin-users invalid create payload", {
          action,
          hasEmail: Boolean(email && email.includes("@")),
          hasFullName: Boolean(fullName),
          role: typeof role === "string" ? role : typeof role,
          hasMunicipalityId: Boolean(municipalityId),
        });
        return response(request, 400, {
          error: "Dados obrigatórios do utilizador estão incompletos.",
          code: "INVALID_CREATE_PAYLOAD",
        });
      }

      if (!canManageTarget(actor, role, municipalityId)) {
        return response(request, 403, { error: "Não tem permissão para criar este perfil." });
      }

      await validateSuperAdminMunicipalSession(
        admin,
        actor,
        accessSessionId,
        municipalityId,
      );
      await validateTerritory(admin, municipalityId, postId);

      const siteUrl =
        (Deno.env.get("MOBIGEST_SITE_URL") ?? requestOrigin).replace(/\/$/, "");
      const redirectTo = siteUrl ? siteUrl + "/nova-password" : undefined;

      const { data: inviteData, error: inviteError } =
        await admin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo,
        });

      if (inviteError || !inviteData.user) {
        const rawMessage = inviteError?.message?.toLowerCase() ?? "";
        const rawCode = (inviteError as { code?: string } | null)?.code ?? "";

        const message =
          rawCode === "over_email_send_rate_limit" ||
          rawMessage.includes("rate limit") ||
          rawMessage.includes("email send")
            ? "O limite temporário de envio de emails do Supabase foi atingido. Aguarde alguns minutos e tente novamente."
            : rawMessage.includes("already")
              ? "Já existe uma conta com este email."
              : "Não foi possível criar e convidar o utilizador.";

        return response(request, 400, {
          error: message,
          code: rawCode || "INVITE_FAILED",
        });
      }

      const newUserId = inviteData.user.id;

      const { error: profileError } = await admin.from("profiles").insert({
        id: newUserId,
        full_name: fullName,
        phone,
        role,
        municipality_id: municipalityId,
        administrative_post_id: postId,
        status: "activo",
      });

      if (profileError) {
        await admin.auth.admin.deleteUser(newUserId);
        throw profileError;
      }

      try {
        await audit(
          admin,
          actor,
          municipalityId,
          "create",
          newUserId,
          null,
          {
            full_name: fullName,
            role,
            municipality_id: municipalityId,
            administrative_post_id: postId,
            status: "activo",
          },
          "Utilizador criado e convite enviado.",
        );
      } catch (auditError) {
        await admin.from("profiles").delete().eq("id", newUserId);
        await admin.auth.admin.deleteUser(newUserId);
        throw auditError;
      }

      return response(request, 200, {
        id: newUserId,
        email,
        invited: true,
      });
    }

    if (action === "update_profile") {
      const targetUserId =
        typeof body.userId === "string" ? body.userId : "";
      const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
      const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
      const role = body.role;
      const municipalityId =
        typeof body.municipalityId === "string" ? body.municipalityId : null;
      const postId = typeof body.administrativePostId === "string"
        ? body.administrativePostId || null
        : null;
      const accessSessionId =
        typeof body.accessSessionId === "string" ? body.accessSessionId : null;

      if (!targetUserId || !fullName || !isRole(role) || !municipalityId) {
        return response(request, 400, { error: "Dados de actualização incompletos." });
      }

      const { data: targetData, error: targetError } = await admin
        .from("profiles")
        .select("id, full_name, phone, role, status, municipality_id, administrative_post_id")
        .eq("id", targetUserId)
        .maybeSingle();

      if (targetError || !targetData) {
        return response(request, 404, { error: "Utilizador não encontrado." });
      }

      const target = targetData as TargetProfile;

      if (!canManageTarget(actor, role, municipalityId) ||
          !canManageTarget(actor, target.role, target.municipality_id)) {
        return response(request, 403, { error: "Não tem permissão para alterar este utilizador." });
      }

      await validateSuperAdminMunicipalSession(
        admin,
        actor,
        accessSessionId,
        municipalityId,
      );
      await validateTerritory(admin, municipalityId, postId);

      const oldValues = {
        full_name: target.full_name,
        phone: target.phone,
        role: target.role,
        municipality_id: target.municipality_id,
        administrative_post_id: target.administrative_post_id,
      };

      const newValues = {
        full_name: fullName,
        phone,
        role,
        municipality_id: municipalityId,
        administrative_post_id: postId,
      };

      const { error: updateError } = await admin
        .from("profiles")
        .update(newValues)
        .eq("id", targetUserId);

      if (updateError) throw updateError;

      await audit(
        admin,
        actor,
        municipalityId,
        "update_profile",
        targetUserId,
        oldValues,
        newValues,
        "Perfil e âmbito institucional actualizados.",
      );

      return response(request, 200, { id: targetUserId, updated: true });
    }

    if (action === "set_status") {
      const targetUserId =
        typeof body.userId === "string" ? body.userId : "";
      const status = body.status;
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      const accessSessionId =
        typeof body.accessSessionId === "string" ? body.accessSessionId : null;

      if (!targetUserId || !isStatus(status) || reason.length < 4) {
        return response(request, 400, { error: "Estado ou motivo inválido." });
      }

      if (targetUserId === actor.id) {
        return response(request, 400, { error: "Não pode alterar o estado da própria conta." });
      }

      const { data: targetData, error: targetError } = await admin
        .from("profiles")
        .select("id, full_name, phone, role, status, municipality_id, administrative_post_id")
        .eq("id", targetUserId)
        .maybeSingle();

      if (targetError || !targetData) {
        return response(request, 404, { error: "Utilizador não encontrado." });
      }

      const target = targetData as TargetProfile;

      if (!canManageTarget(actor, target.role, target.municipality_id)) {
        return response(request, 403, { error: "Não tem permissão para alterar este utilizador." });
      }

      await validateSuperAdminMunicipalSession(
        admin,
        actor,
        accessSessionId,
        target.municipality_id,
      );

      if (target.status === status) {
        return response(request, 400, { error: "O utilizador já possui este estado." });
      }

      const { error: updateError } = await admin
        .from("profiles")
        .update({ status })
        .eq("id", targetUserId);

      if (updateError) throw updateError;

      await audit(
        admin,
        actor,
        target.municipality_id,
        "set_status",
        targetUserId,
        { status: target.status },
        { status },
        reason,
      );

      return response(request, 200, { id: targetUserId, status });
    }

    return response(request, 400, { error: "Acção administrativa desconhecida." });
  } catch (error) {
    console.error("admin-users failure", error);
    return response(request, 500, {
      error: error instanceof Error
        ? error.message
        : "Falha interna ao gerir utilizador.",
    });
  }
});
