import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OFFER_DAYS: Record<string, number | null> = {
  formation: null, // illimité
  sub_1m: 30,
  sub_3m: 90,
  sub_6m: 180,
  sub_12m: 365,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: userData.user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Accès refusé : admin requis" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const offer = String(body.offer ?? "sub_1m");
    const role = String(body.role ?? "subscriber") as "admin" | "student" | "subscriber";
    const customDays = body.custom_days ? Number(body.custom_days) : null;

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Email invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!(offer in OFFER_DAYS)) {
      return new Response(JSON.stringify({ error: "Offre invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if user already exists
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let targetUser = existing?.users.find((u) => u.email?.toLowerCase() === email);
    let tempPassword: string | null = null;

    if (!targetUser) {
      // Create new user with temp password
      tempPassword = `MLP-${Math.random().toString(36).slice(2, 10)}-${Math.floor(Math.random() * 9999)}`;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createErr || !created.user) {
        return new Response(JSON.stringify({ error: "Échec création : " + (createErr?.message ?? "inconnu") }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      targetUser = created.user;
    }

    const userId = targetUser!.id;

    // Compute expiry
    const days = customDays ?? OFFER_DAYS[offer];
    const ends = days ? new Date(Date.now() + days * 86400000).toISOString() : null;

    // Update profile (active + expiry + name)
    await admin.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: fullName || targetUser!.user_metadata?.full_name || null,
        status: "active",
        subscription_ends_at: ends,
      },
      { onConflict: "id" }
    );

    // Assign role
    await admin.from("user_roles").upsert(
      { user_id: userId, role },
      { onConflict: "user_id,role" }
    );

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email,
        temp_password: tempPassword,
        is_new: !!tempPassword,
        expires_at: ends,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Erreur serveur" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
