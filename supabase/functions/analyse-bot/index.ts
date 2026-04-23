// Bot d'analyse hebdo : agrège les news des 7 prochains jours et produit
// une synthèse "expert finance" par devise (biais, news clés, paires).
// PUBLIC : accessible aux élèves & abonnés sans rôle admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const ZONE: Record<string, { flag: string; name: string }> = {
  USD: { flag: "🇺🇸", name: "États-Unis" },
  EUR: { flag: "🇪🇺", name: "Zone Euro" },
  GBP: { flag: "🇬🇧", name: "Royaume-Uni" },
  JPY: { flag: "🇯🇵", name: "Japon" },
  CHF: { flag: "🇨🇭", name: "Suisse" },
  CAD: { flag: "🇨🇦", name: "Canada" },
  AUD: { flag: "🇦🇺", name: "Australie" },
  NZD: { flag: "🇳🇿", name: "Nouvelle-Zélande" },
  CNY: { flag: "🇨🇳", name: "Chine" },
};

const PAIRS_UP: Record<string, string[]> = {
  USD: ["EUR/USD ↓", "GBP/USD ↓", "XAU/USD ↓", "USD/JPY ↑"],
  EUR: ["EUR/USD ↑", "EUR/GBP ↑", "EUR/JPY ↑"],
  GBP: ["GBP/USD ↑", "GBP/JPY ↑"],
  JPY: ["USD/JPY ↓", "EUR/JPY ↓"],
};
const PAIRS_DOWN: Record<string, string[]> = {
  USD: ["EUR/USD ↑", "GBP/USD ↑", "XAU/USD ↑", "USD/JPY ↓"],
  EUR: ["EUR/USD ↓", "EUR/GBP ↓", "EUR/JPY ↓"],
  GBP: ["GBP/USD ↓", "GBP/JPY ↓"],
  JPY: ["USD/JPY ↑", "EUR/JPY ↑"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(start.getDate() + 7);

    const { data: news, error } = await admin
      .from("economic_news")
      .select("title,currency,event_at,impact,sentiment,actual,forecast")
      .gte("event_at", start.toISOString())
      .lt("event_at", end.toISOString())
      .order("event_at", { ascending: true });
    if (error) throw error;

    type N = { title: string; currency: string; event_at: string; impact: string; sentiment: string; actual: string|null; forecast: string|null };
    const items = (news ?? []) as N[];

    // Score par devise : +2 bullish high, +1 bullish med, -2 bearish high, -1 bearish med…
    const scoreByCcy: Record<string, number> = {};
    const eventsByCcy: Record<string, N[]> = {};
    for (const n of items) {
      const w = n.impact === "high" ? 2 : n.impact === "medium" ? 1 : 0.5;
      const s = n.sentiment === "bullish" ? w : n.sentiment === "bearish" ? -w : 0;
      scoreByCcy[n.currency] = (scoreByCcy[n.currency] ?? 0) + s;
      (eventsByCcy[n.currency] ??= []).push(n);
    }

    // Top devises traitées
    const ccyOrder = Object.keys(eventsByCcy)
      .map((c) => ({ c, count: eventsByCcy[c].length, abs: Math.abs(scoreByCcy[c] ?? 0) }))
      .sort((a, b) => b.abs - a.abs || b.count - a.count)
      .slice(0, 6)
      .map((x) => x.c);

    const zones = ccyOrder.map((ccy) => {
      const score = scoreByCcy[ccy] ?? 0;
      const bias: "bullish" | "bearish" | "neutral" =
        score >= 1.5 ? "bullish" : score <= -1.5 ? "bearish" : "neutral";
      const list = eventsByCcy[ccy].filter((e) => e.impact !== "low").slice(0, 4)
        .map((e) => ({
          title: e.title,
          when: e.event_at,
          impact: e.impact,
          sentiment: e.sentiment,
        }));
      const pairs = bias === "bullish" ? PAIRS_UP[ccy] ?? []
        : bias === "bearish" ? PAIRS_DOWN[ccy] ?? []
        : [];
      const z = ZONE[ccy] ?? { flag: "🌍", name: ccy };

      let interpretation = "";
      let conclusion = "";
      if (bias === "bullish") {
        interpretation = `Les indicateurs prévus sur le ${ccy} sont globalement **positifs** : la devise pourrait se renforcer.`;
        conclusion = `📈 Biais **haussier** sur ${ccy}`;
      } else if (bias === "bearish") {
        interpretation = `Les indicateurs prévus sur le ${ccy} sont globalement **négatifs** : la devise pourrait s'affaiblir.`;
        conclusion = `📉 Biais **baissier** sur ${ccy}`;
      } else {
        interpretation = `Le ${ccy} reste en zone **neutre** : pas de signal directionnel clair, attendre confirmation.`;
        conclusion = `⚖️ Direction **incertaine** sur ${ccy}`;
      }

      return { currency: ccy, flag: z.flag, name: z.name, score, bias, interpretation, conclusion, pairs, events: list };
    });

    const totalHigh = items.filter((n) => n.impact === "high").length;
    const summary = items.length === 0
      ? "Aucune news majeure prévue cette semaine — marché probablement calme."
      : `${items.length} évènements suivis cette semaine, dont **${totalHigh} à fort impact**. Concentration sur ${zones.slice(0, 3).map((z) => `${z.flag} ${z.currency}`).join(", ") || "—"}.`;

    return new Response(JSON.stringify({
      week_start: start.toISOString().slice(0, 10),
      week_end: end.toISOString().slice(0, 10),
      total_events: items.length,
      high_impact: totalHigh,
      summary,
      zones,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("analyse-bot error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
