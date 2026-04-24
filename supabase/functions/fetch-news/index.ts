// Sync economic calendar from Finnhub into economic_news.
// PUBLIC endpoint (no auth) so cron + frontend refresh button can call it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FinnhubEvent {
  actual: number | null;
  country: string;
  estimate: number | null;
  event: string;
  impact: string;
  prev: number | null;
  time: string;
  unit: string;
}

const COUNTRY_TO_CCY: Record<string, string> = {
  US: "USD", EU: "EUR", GB: "GBP", JP: "JPY", CH: "CHF", CA: "CAD", AU: "AUD", NZ: "NZD", CN: "CNY",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
};

function inferSentiment(ev: FinnhubEvent): "bullish" | "bearish" | "neutral" {
  if (ev.actual == null || ev.estimate == null) return "neutral";
  if (ev.actual > ev.estimate) return "bullish";
  if (ev.actual < ev.estimate) return "bearish";
  return "neutral";
}

function normalizeImpact(i: string): "high" | "medium" | "low" {
  const v = (i || "").toLowerCase();
  if (v === "high") return "high";
  if (v === "low") return "low";
  return "medium";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const FINNHUB_API_KEY = Deno.env.get("FINNHUB_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!FINNHUB_API_KEY) {
      return new Response(JSON.stringify({ error: "FINNHUB_API_KEY non configurée" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const parseDateInput = (value: unknown) => {
      if (typeof value !== "string") return null;
      const normalized = value.trim().slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
    };

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const now = new Date();
    const fallbackFrom = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const fallbackTo = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const from = parseDateInput(body?.from) ?? fallbackFrom;
    const to = parseDateInput(body?.to) ?? fallbackTo;

    const url = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`Finnhub ${r.status}: ${txt}`);
    }
    const json = await r.json();
    const events: FinnhubEvent[] = json?.economicCalendar ?? [];

    const rows = events.map((ev) => {
      const ccy = COUNTRY_TO_CCY[ev.country] ?? ev.country ?? "USD";
      const eventAt = new Date(ev.time.replace(" ", "T") + "Z").toISOString();
      const ext = `finnhub:${ev.country}:${ev.event}:${ev.time}`;
      return {
        external_id: ext,
        title: ev.event,
        currency: ccy,
        country: ev.country,
        event_at: eventAt,
        summary: `Indicateur économique ${ccy}. Prévision: ${ev.estimate ?? "—"} · Précédent: ${ev.prev ?? "—"}${ev.actual != null ? ` · Réel: ${ev.actual}` : ""}`,
        actual: ev.actual?.toString() ?? null,
        forecast: ev.estimate?.toString() ?? null,
        previous: ev.prev?.toString() ?? null,
        impact: normalizeImpact(ev.impact),
        sentiment: inferSentiment(ev),
        source: "finnhub",
      };
    });

    let upserted = 0;
    if (rows.length) {
      // Upsert par lots de 500 pour éviter les payloads trop gros
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await admin
          .from("economic_news")
          .upsert(batch, { onConflict: "external_id" });
        if (error) throw error;
        upserted += batch.length;
      }
    }

    return new Response(JSON.stringify({ ok: true, fetched: events.length, upserted, from, to }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("fetch-news error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
