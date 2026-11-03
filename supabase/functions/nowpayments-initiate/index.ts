// NOWPayments initiate — crée une facture crypto, retourne URL hosted checkout
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { cryptoOffer } from "../_shared/cryptoPayments.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const backendUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!backendUrl || !anonKey || !serviceKey) return json({ error: "Service de paiement indisponible" }, 503);

    const supabase = createClient(
      backendUrl,
      anonKey,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;
    const email = userData.user.email;

    const { offer, success_url, cancel_url } = await req.json();
    const cfg = typeof offer === "string" ? cryptoOffer(offer) : null;
    if (!cfg) return json({ error: "Offre invalide" }, 400);

    const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
    if (!apiKey) return json({ error: "NOWPayments non configuré" }, 500);
    if (!Deno.env.get("NOWPAYMENTS_IPN_SECRET")) return json({ error: "Confirmation crypto non configurée" }, 503);

    const admin = createClient(
      backendUrl,
      serviceKey
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

    if (typeof npData.invoice_url !== "string" || !npData.invoice_url.startsWith("https://nowpayments.io/") || !npData.id) {
      await admin.from("payment_requests").update({ status: "rejected", provider_status: "invalid_invoice" }).eq("id", pr.id);
      return json({ error: "NOWPayments n’a pas fourni de facture valide" }, 502);
    }
    const { error: saveError } = await admin
      .from("payment_requests")
      .update({
        provider_tx_ref: String(npData.id),
        provider_tx_id: String(npData.id),
        provider_status: "waiting",
        metadata: npData,
      })
      .eq("id", pr.id);
    if (saveError) return json({ error: "Impossible d’enregistrer la facture crypto" }, 500);

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
