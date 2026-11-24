import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let suffix = "";
  for (let i = 0; i < bytes.length; i += 1) {
    suffix += alphabet[bytes[i] % alphabet.length];
  }
  return `Marcos@${suffix}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server configuration missing" }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return jsonResponse({ error: "Não autenticado." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: callerData, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !callerData?.user) {
    return jsonResponse({ error: "Sessão inválida ou expirada." }, 401);
  }

  const callerId = callerData.user.id;
  const { data: callerProfile, error: profileError } = await admin
    .from("profiles")
    .select("role, active")
    .eq("id", callerId)
    .maybeSingle();

  if (profileError || !callerProfile || callerProfile.role !== "superadmin" || !callerProfile.active) {
    return jsonResponse({ error: "Acesso restrito ao superadmin." }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "JSON inválido." }, 400);
  }

  const action = String(payload.action || "");

  if (action === "list") {
    const [profilesRes, patientsRes, assessmentsRes] = await Promise.all([
      admin.from("profiles").select("*").order("created_at", { ascending: false }),
      admin.from("patients").select("professional_id"),
      admin.from("assessments").select("professional_id")
    ]);

    if (profilesRes.error) {
      return jsonResponse({ error: profilesRes.error.message }, 500);
    }

    const patientCounts: Record<string, number> = {};
    (patientsRes.data || []).forEach((row: { professional_id: string }) => {
      patientCounts[row.professional_id] = (patientCounts[row.professional_id] || 0) + 1;
    });

    const assessmentCounts: Record<string, number> = {};
    (assessmentsRes.data || []).forEach((row: { professional_id: string }) => {
      assessmentCounts[row.professional_id] = (assessmentCounts[row.professional_id] || 0) + 1;
    });

    const professionals = (profilesRes.data || []).map((p: Record<string, unknown>) => ({
      ...p,
      patient_count: patientCounts[String(p.id)] || 0,
      assessment_count: assessmentCounts[String(p.id)] || 0
    }));

    return jsonResponse({ professionals });
  }

  if (action === "create") {
    const fullName = String(payload.full_name || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const crp = String(payload.crp || "").trim();

    if (!fullName || !email || !email.includes("@")) {
      return jsonResponse({ error: "Informe nome completo e um e-mail válido." }, 400);
    }

    const tempPassword = generateTempPassword();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, crp }
    });

    if (createErr || !created?.user) {
      return jsonResponse({ error: createErr?.message || "Erro ao criar usuário." }, 400);
    }

    const { data: profile, error: upsertErr } = await admin
      .from("profiles")
      .upsert({
        id: created.user.id,
        email,
        full_name: fullName,
        crp,
        role: "psychologist",
        must_change_password: true,
        active: true
      })
      .select()
      .single();

    if (upsertErr) {
      return jsonResponse({ error: upsertErr.message }, 500);
    }

    return jsonResponse({
      professional: { ...profile, patient_count: 0, assessment_count: 0 },
      tempPassword
    });
  }

  if (action === "reset_password") {
    const userId = String(payload.user_id || "").trim();
    if (!userId) return jsonResponse({ error: "ID do profissional obrigatório." }, 400);

    const tempPassword = generateTempPassword();
    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      password: tempPassword
    });
    if (updateErr) {
      return jsonResponse({ error: updateErr.message }, 400);
    }

    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", userId)
      .select()
      .single();

    if (profErr) {
      return jsonResponse({ error: profErr.message }, 500);
    }

    return jsonResponse({ professional: profile, tempPassword });
  }

  if (action === "toggle_active") {
    const userId = String(payload.user_id || "").trim();
    const active = Boolean(payload.active);
    if (!userId) return jsonResponse({ error: "ID do profissional obrigatório." }, 400);
    if (userId === callerId) {
      return jsonResponse({ error: "Você não pode bloquear sua própria conta superadmin." }, 400);
    }

    const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: active ? "none" : "876000h"
    });
    if (authErr) {
      return jsonResponse({ error: authErr.message }, 400);
    }

    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .update({ active })
      .eq("id", userId)
      .select()
      .single();

    if (profErr) {
      return jsonResponse({ error: profErr.message }, 500);
    }

    return jsonResponse({ professional: profile });
  }

  if (action === "delete") {
    const userId = String(payload.user_id || "").trim();
    if (!userId) return jsonResponse({ error: "ID do profissional obrigatório." }, 400);
    if (userId === callerId) {
      return jsonResponse({ error: "Você não pode excluir sua própria conta superadmin." }, 400);
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return jsonResponse({ error: delErr.message }, 400);
    }

    return jsonResponse({ deleted: true, user_id: userId });
  }

  return jsonResponse({ error: "Ação inválida." }, 400);
});
