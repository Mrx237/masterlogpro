// NOWPayments initiate — crée une facture crypto, retourne URL hosted checkout
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Prix offres en USD (≈ équivalent FCFA / 600)
const OFFER_USD: Record<string, { price_usd: number; price_fcfa: number }> = {
  formation: { price_usd: 85, price_fcfa: 50000 },
  sub_1m: { price_usd: 17, price_fcfa: 10000 },
  sub_3m: { price_usd: 42, price_fcfa: 25000 },
  sub_6m: { price_usd: 75, price_fcfa: 45000 },
  sub_12m: { price_usd: 135, price_fcfa: 80000 },
};

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
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;
    const email = claims.claims.email;

    const { offer, success_url, cancel_url } = await req.json();
    const cfg = OFFER_USD[offer];
    if (!cfg) return json({ error: "Offre invalide" }, 400);

    const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
    if (!apiKey) return json({ error: "NOWPayments non configuré" }, 500);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Créer payment_request pending
    const { data: pr, error: insErr } = await admin
      .from("payment_requests")
      .insert({
        user_id: userId,
        offer,
        amount_fcfa: cfg.price_fcfa,
        amount: cfg.price_usd,
        currency: "USD",
        method: "crypto",
        provider: "nowpayments",
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !pr) return json({ error: insErr?.message }, 500);

    // Crée invoice NOWPayments (hosted checkout)
    const npRes = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        price_amount: cfg.price_usd,
        price_currency: "usd",
        order_id: pr.id,
        order_description: `MasterLogPro - ${offer}`,
        ipn_callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/nowpayments-webhook`,
        success_url,
        cancel_url,
        customer_email: email,
      }),
    });

    const npData = await npRes.json();
    if (!npRes.ok) {
      await admin.from("payment_requests").update({
        status: "rejected",
        provider_status: npData?.message || "np_error",
        metadata: npData,
      }).eq("id", pr.id);
      return json({ error: npData?.message || "NOWPayments échec" }, 400);
    }

    await admin
      .from("payment_requests")
      .update({
        provider_tx_ref: String(npData.id),
        provider_tx_id: String(npData.id),
        provider_status: "waiting",
        metadata: npData,
      })
      .eq("id", pr.id);

    return json({
      success: true,
      payment_id: pr.id,
      invoice_url: npData.invoice_url,
      invoice_id: npData.id,
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
