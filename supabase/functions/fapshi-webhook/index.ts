// Fapshi webhook — reçoit confirmation de paiement
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { transId, status } = body as { transId?: string; status?: string };

    if (!transId) return json({ error: "Missing transId" }, 400);

    const apiUser = Deno.env.get("FAPSHI_API_USER");
    const apiKey = Deno.env.get("FAPSHI_API_KEY");
    const sandbox = Deno.env.get("FAPSHI_SANDBOX") === "true";
    const baseUrl = sandbox
      ? "https://sandbox.fapshi.com"
      : "https://live.fapshi.com";

    // Re-verify auprès de Fapshi (ne JAMAIS faire confiance au webhook seul)
    const verifyRes = await fetch(`${baseUrl}/payment-status/${transId}`, {
      headers: { apiuser: apiUser!, apikey: apiKey! },
    });
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok) return json({ error: "Verification failed" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const finalStatus = verifyData.status; // SUCCESSFUL | FAILED | EXPIRED | PENDING
    let newStatus: "approved" | "rejected" | "pending" = "pending";
    if (finalStatus === "SUCCESSFUL") newStatus = "approved";
    else if (["FAILED", "EXPIRED"].includes(finalStatus)) newStatus = "rejected";

    const { error } = await admin
      .from("payment_requests")
      .update({
        status: newStatus,
        provider_status: finalStatus,
        metadata: verifyData,
        ...(newStatus === "approved" ? { paid_at: new Date().toISOString() } : {}),
      })
      .eq("provider_tx_ref", transId);

    if (error) return json({ error: error.message }, 500);

    return json({ success: true, status: newStatus });
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
