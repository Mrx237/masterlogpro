// NOWPayments IPN — vérifie signature HMAC SHA-512 puis met à jour le paiement
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac, timingSafeEqual } from "node:crypto";
import { nextCryptoStatus } from "../_shared/cryptoPayments.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-nowpayments-sig",
};

// Tri récursif des clés (requis par NOWPayments pour valider le HMAC)
function sortObject(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sortObject);
  if (obj && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce((acc: any, k) => {
        acc[k] = sortObject(obj[k]);
        return acc;
      }, {});
  }
  return obj;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sig = req.headers.get("x-nowpayments-sig");
    const ipnSecret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");
    if (!sig || !ipnSecret) return json({ error: "Missing signature" }, 401);

    const rawBody = await req.text();
    const parsed = JSON.parse(rawBody);
    const sorted = sortObject(parsed);
    const expected = createHmac("sha512", ipnSecret)
      .update(JSON.stringify(sorted))
      .digest("hex");

    if (!/^[a-f0-9]{128}$/i.test(sig) || !timingSafeEqual(new TextEncoder().encode(expected), new TextEncoder().encode(sig.toLowerCase()))) {
      return json({ error: "Invalid signature" }, 401);
    }

    const { order_id, payment_status, payment_id } = parsed;
    if (!order_id) return json({ error: "Missing order_id" }, 400);

    const backendUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!backendUrl || !serviceKey) return json({ error: "Service unavailable" }, 503);
    const admin = createClient(
      backendUrl,
      serviceKey
    );
    const { data: request, error: lookupError } = await admin.from("payment_requests")
      .select("id,status,amount,currency,provider_tx_ref").eq("id", order_id).eq("provider", "nowpayments").maybeSingle();
    if (lookupError) return json({ error: "Payment lookup failed" }, 500);
    if (!request) return json({ error: "Unknown payment" }, 404);
    if (request.status === "approved" || request.status === "rejected") return json({ success: true });
    if (String(parsed.invoice_id) !== request.provider_tx_ref || String(parsed.price_currency).toUpperCase() !== request.currency || Math.abs(Number(parsed.price_amount) - Number(request.amount)) > 0.01 || !Number.isFinite(Number(parsed.price_amount))) {
      return json({ error: "Invoice amount or currency mismatch" }, 400);
    }
    const newStatus = nextCryptoStatus(request.status, payment_status);
    const { error: updateError } = await admin
      .from("payment_requests")
      .update({
        status: newStatus,
        provider_status: payment_status,
        provider_tx_id: String(payment_id || ""),
        metadata: parsed,
        ...(newStatus === "approved" ? { paid_at: new Date().toISOString() } : {}),
      })
      .eq("id", order_id).eq("provider", "nowpayments").eq("status", "pending");
    if (updateError) return json({ error: "Payment update failed" }, 500);

    return json({ success: true });
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
