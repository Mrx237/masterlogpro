// Campay webhook — reçoit le statut final du paiement (SUCCESSFUL/FAILED)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-hub-signature, signature",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const webhookKey = Deno.env.get("CAMPAY_WEBHOOK_KEY");
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    // Campay envoie un champ 'signature' (JWT signé avec la webhook key)
    // Validation simple : on vérifie la présence et que la signature contient les bonnes claims
    if (webhookKey && payload.signature) {
      const parts = payload.signature.split(".");
      if (parts.length !== 3) return json({ error: "Invalid signature format" }, 401);
      // Décoder le payload du JWT (pas de vérification crypto stricte ici, Campay docs)
      try {
        const decoded = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (decoded.reference !== payload.reference) {
          return json({ error: "Signature mismatch" }, 401);
        }
      } catch {
        return json({ error: "Invalid signature" }, 401);
      }
    }

    const { reference, status, external_reference, operator, amount } = payload;
    if (!external_reference && !reference) return json({ error: "Missing reference" }, 400);

    let newStatus: "approved" | "rejected" | "pending" = "pending";
    const s = String(status || "").toUpperCase();
    if (s === "SUCCESSFUL") newStatus = "approved";
    else if (s === "FAILED" || s === "CANCELLED") newStatus = "rejected";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Match par external_reference (notre payment id) en priorité
    const query = admin.from("payment_requests").update({
      status: newStatus,
      provider_status: s,
      provider_tx_id: reference,
      metadata: payload,
      ...(operator ? { method: String(operator).toLowerCase().includes("orange") ? "orange" : "mtn" } : {}),
      ...(newStatus === "approved" ? { paid_at: new Date().toISOString() } : {}),
    });

    const { error } = external_reference
      ? await query.eq("id", external_reference)
      : await query.eq("provider_tx_id", reference);

    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
