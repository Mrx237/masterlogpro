// Fapshi MoMo initiate — push USSD vers le téléphone du client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OFFER_PRICES: Record<string, number> = {
  formation: 50000,
  sub_1m: 10000,
  sub_3m: 25000,
  sub_6m: 45000,
  sub_12m: 80000,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: authErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;
    const email = claims.claims.email;

    const body = await req.json();
    const { offer, phone, medium } = body as {
      offer: string;
      phone: string;
      medium?: "mobile money" | "orange money";
    };

    if (!offer || !OFFER_PRICES[offer]) return json({ error: "Offre invalide" }, 400);
    if (!phone || !/^6[0-9]{8}$/.test(phone.replace(/\s/g, "")))
      return json({ error: "Numéro Cameroun invalide (9 chiffres, commence par 6)" }, 400);

    const amount = OFFER_PRICES[offer];
    const cleanPhone = phone.replace(/\s/g, "");
    const apiUser = Deno.env.get("FAPSHI_API_USER");
    const apiKey = Deno.env.get("FAPSHI_API_KEY");
    const sandbox = Deno.env.get("FAPSHI_SANDBOX") === "true";

    if (!apiUser || !apiKey) return json({ error: "Fapshi non configuré" }, 500);

    const baseUrl = sandbox
      ? "https://sandbox.fapshi.com"
      : "https://live.fapshi.com";

    // Insert payment_requests pending
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
        method: medium === "orange money" ? "orange" : "mtn",
        provider: "fapshi",
        payer_phone: cleanPhone,
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !pr) return json({ error: insErr?.message || "DB error" }, 500);

    // Appel Fapshi direct-pay (push USSD)
    const fapRes = await fetch(`${baseUrl}/direct-pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiuser: apiUser,
        apikey: apiKey,
      },
      body: JSON.stringify({
        amount,
        phone: cleanPhone,
        medium: medium || "mobile money",
        name: email || "Client",
        email,
        userId,
        externalId: pr.id,
        message: `MasterLogPro - ${offer}`,
      }),
    });

    const fapData = await fapRes.json();

    if (!fapRes.ok) {
      await admin
        .from("payment_requests")
        .update({
          status: "rejected",
          provider_status: fapData?.message || "fapshi_error",
          metadata: fapData,
        })
        .eq("id", pr.id);
      return json({ error: fapData?.message || "Échec Fapshi" }, 400);
    }

    await admin
      .from("payment_requests")
      .update({
        provider_tx_ref: fapData.transId,
        provider_tx_id: fapData.transId,
        provider_status: fapData.status || "PENDING",
        metadata: fapData,
      })
      .eq("id", pr.id);

    return json({
      success: true,
      payment_id: pr.id,
      transId: fapData.transId,
      message: "Paiement initié — confirme avec ton PIN sur ton téléphone",
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
