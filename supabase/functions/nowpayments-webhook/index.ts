// NOWPayments IPN — vérifie signature HMAC SHA-512 puis met à jour le paiement
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";

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

    if (expected !== sig) {
      return json({ error: "Invalid signature" }, 401);
    }

    const { order_id, payment_status, payment_id } = parsed;
    if (!order_id) return json({ error: "Missing order_id" }, 400);

    let newStatus: "approved" | "rejected" | "pending" = "pending";
    if (["finished", "confirmed"].includes(payment_status)) newStatus = "approved";
    else if (["failed", "expired", "refunded"].includes(payment_status))
      newStatus = "rejected";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await admin
      .from("payment_requests")
      .update({
        status: newStatus,
        provider_status: payment_status,
        provider_tx_id: String(payment_id || ""),
        metadata: parsed,
        ...(newStatus === "approved" ? { paid_at: new Date().toISOString() } : {}),
      })
      .eq("id", order_id);

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
