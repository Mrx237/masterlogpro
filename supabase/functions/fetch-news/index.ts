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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Free public calendar (Forex Factory weekly feed). Finnhub's calendar is premium-only (403).
    const CCY_TO_COUNTRY: Record<string, string> = {
      USD: "US", EUR: "EU", GBP: "GB", JPY: "JP", CHF: "CH", CAD: "CA", AUD: "AU", NZD: "NZ", CNY: "CN",
    };
    const feeds = ["https://nfs.faireconomy.media/ff_calendar_thisweek.json"];
    const all: any[] = [];
    for (const f of feeds) {
      const r = await fetch(f, { headers: { "User-Agent": "Mozilla/5.0 MasterLogPro" } });
      if (!r.ok) throw new Error(`Calendrier ${r.status}`);
      const j = await r.json();
      if (Array.isArray(j)) all.push(...j);
    }
    const events = all.filter((e) => e?.title && e?.date && e?.impact !== "Holiday");

    const rows = events.map((ev: any) => {
      const ccy = String(ev.country ?? "USD").toUpperCase();
      const eventAt = new Date(ev.date).toISOString();
      const imp = normalizeImpact(ev.impact);
      return {
        external_id: `ff:${ccy}:${ev.title}:${eventAt}`,
        title: ev.title,
        currency: ccy,
        country: CCY_TO_COUNTRY[ccy] ?? ccy,
        event_at: eventAt,
        summary: `Indicateur économique ${ccy}. Prévision: ${ev.forecast || "—"} · Précédent: ${ev.previous || "—"}`,
        actual: null,
        forecast: ev.forecast || null,
        previous: ev.previous || null,
        impact: imp,
        sentiment: "neutral" as const,
        source: "forexfactory",
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
