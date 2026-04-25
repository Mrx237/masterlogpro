// Fapshi verify — polling depuis le frontend
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { payment_id } = await req.json();
    if (!payment_id) return json({ error: "payment_id required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: pr } = await admin
      .from("payment_requests")
      .select("*")
      .eq("id", payment_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!pr) return json({ error: "Not found" }, 404);

    // Si déjà finalisé, retourne le statut
    if (pr.status !== "pending") {
      return json({ status: pr.status, provider_status: pr.provider_status });
    }

    // Re-check auprès de Fapshi
    if (pr.provider === "fapshi" && pr.provider_tx_ref) {
      const apiUser = Deno.env.get("FAPSHI_API_USER");
      const apiKey = Deno.env.get("FAPSHI_API_KEY");
      const sandbox = Deno.env.get("FAPSHI_SANDBOX") === "true";
      const baseUrl = sandbox ? "https://sandbox.fapshi.com" : "https://live.fapshi.com";

      const r = await fetch(`${baseUrl}/payment-status/${pr.provider_tx_ref}`, {
        headers: { apiuser: apiUser!, apikey: apiKey! },
      });
      const d = await r.json();

      let newStatus: "approved" | "rejected" | "pending" = "pending";
      if (d.status === "SUCCESSFUL") newStatus = "approved";
      else if (["FAILED", "EXPIRED"].includes(d.status)) newStatus = "rejected";

      if (newStatus !== "pending") {
        await admin
          .from("payment_requests")
          .update({
            status: newStatus,
            provider_status: d.status,
            metadata: d,
            ...(newStatus === "approved" ? { paid_at: new Date().toISOString() } : {}),
          })
          .eq("id", pr.id);
      }

      return json({ status: newStatus, provider_status: d.status });
    }

    return json({ status: pr.status, provider_status: pr.provider_status });
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
