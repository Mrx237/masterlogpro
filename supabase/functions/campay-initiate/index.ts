// Campay initiate — Mobile Money CM (MTN / Orange) — collect automatique
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OFFER_FCFA: Record<string, number> = {
  formation: 50000,
  sub_1m: 10000,
  sub_3m: 25000,
  sub_6m: 45000,
  sub_12m: 80000,
};

const CAMPAY_HOSTS = ["https://www.campay.net", "https://demo.campay.net"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function getCampayToken(): Promise<{ token: string; host: string; environment: "prod" | "demo" }> {
  const username = Deno.env.get("CAMPAY_USERNAME");
  const password = Deno.env.get("CAMPAY_PASSWORD");
  if (!username || !password) throw new Error("Campay credentials missing");

  const preferred = (Deno.env.get("CAMPAY_ENV") || "prod").toLowerCase();
  const hosts = preferred === "demo" ? [...CAMPAY_HOSTS].reverse() : CAMPAY_HOSTS;
  const errors: string[] = [];

  for (const host of hosts) {
    try {
      const res = await fetch(`${host}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await safeJson(res);
      if (res.ok && data.token) {
        return { token: data.token, host, environment: host.includes("demo") ? "demo" : "prod" };
      }
      errors.push(`${host}: ${JSON.stringify(data)}`);
    } catch (error) {
      errors.push(`${host}: ${(error as Error).message}`);
    }
  }

  throw new Error(`Campay auth failed. Vérifie l'App username/App password et l'environnement Campay. Détails: ${errors.join(" | ")}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { offer, phone } = await req.json();
    const amount = OFFER_FCFA[offer];
    if (!amount) return json({ error: "Offre invalide" }, 400);

    // Normalise numéro CM (237xxxxxxxxx)
    let normalized = String(phone || "").replace(/[^\d]/g, "");
    if (normalized.startsWith("00237")) normalized = normalized.slice(2);
    if (!normalized.startsWith("237")) normalized = "237" + normalized.replace(/^0+/, "");
    if (normalized.length !== 12) return json({ error: "Numéro invalide (format 6XXXXXXXX)" }, 400);

    const { token, host, environment } = await getCampayToken();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: pr, error: insErr } = await admin
      .from("payment_requests")
      .insert({
        user_id: userId,
        offer,
        amount_fcfa: amount,
        amount,
        currency: "XAF",
        method: "mtn", // sera ajusté via webhook (operator)
        provider: "campay",
        status: "pending",
        payer_phone: normalized,
      })
      .select("id")
      .single();

    if (insErr || !pr) return json({ error: insErr?.message }, 500);

    const cpRes = await fetch(`${host}/api/collect/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
      body: JSON.stringify({
        amount: String(amount),
        currency: "XAF",
        from: normalized,
        description: `MasterLogPro - ${offer}`,
        external_reference: pr.id,
      }),
    });
    const cpData = await safeJson(cpRes);

    if (!cpRes.ok || !cpData.reference) {
      await admin.from("payment_requests").update({
        status: "rejected",
        provider_status: cpData?.message || "campay_error",
        metadata: { ...cpData, campay_environment: environment },
      }).eq("id", pr.id);
      return json({ error: cpData?.message || "Campay échec" }, 400);
    }

    await admin.from("payment_requests").update({
      provider_tx_ref: pr.id,
      provider_tx_id: cpData.reference,
      provider_status: "PENDING",
      method: cpData.operator?.toLowerCase()?.includes("orange") ? "orange" : "mtn",
      metadata: { ...cpData, campay_environment: environment },
    }).eq("id", pr.id);

    return json({
      success: true,
      payment_id: pr.id,
      reference: cpData.reference,
      ussd_code: cpData.ussd_code,
      operator: cpData.operator,
      environment,
      message: "Compose le code USSD ou valide la notification sur ton téléphone.",
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
