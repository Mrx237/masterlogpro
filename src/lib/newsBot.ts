// Simple deterministic "bot" that turns impact + sentiment + currency
// into a pedagogical analysis. No AI calls.

export type Impact = "high" | "medium" | "low";
export type Sentiment = "bullish" | "bearish" | "neutral";

const PAIRS: Record<string, { up: string[]; down: string[] }> = {
  USD: { up: ["EUR/USD ↓", "GBP/USD ↓", "XAU/USD ↓", "USD/JPY ↑"], down: ["EUR/USD ↑", "GBP/USD ↑", "XAU/USD ↑", "USD/JPY ↓"] },
  EUR: { up: ["EUR/USD ↑", "EUR/GBP ↑", "EUR/JPY ↑"], down: ["EUR/USD ↓", "EUR/GBP ↓", "EUR/JPY ↓"] },
  GBP: { up: ["GBP/USD ↑", "EUR/GBP ↓", "GBP/JPY ↑"], down: ["GBP/USD ↓", "EUR/GBP ↑", "GBP/JPY ↓"] },
  JPY: { up: ["USD/JPY ↓", "EUR/JPY ↓", "GBP/JPY ↓"], down: ["USD/JPY ↑", "EUR/JPY ↑", "GBP/JPY ↑"] },
  CHF: { up: ["USD/CHF ↓", "EUR/CHF ↓"], down: ["USD/CHF ↑", "EUR/CHF ↑"] },
  CAD: { up: ["USD/CAD ↓"], down: ["USD/CAD ↑"] },
  AUD: { up: ["AUD/USD ↑"], down: ["AUD/USD ↓"] },
  NZD: { up: ["NZD/USD ↑"], down: ["NZD/USD ↓"] },
};

export function impactLabel(i: Impact) {
  return i === "high" ? "Fort" : i === "medium" ? "Moyen" : "Faible";
}
export function sentimentLabel(s: Sentiment) {
  return s === "bullish" ? "Haussier" : s === "bearish" ? "Baissier" : "Neutre";
}

export function generateAnalysis(opts: {
  title: string; currency: string; impact: Impact; sentiment: Sentiment;
}): { meaning: string; market: string; direction: string; pairs: string[] } {
  const { title, currency, impact, sentiment } = opts;
  const ccy = currency.toUpperCase();

  const sevText = impact === "high"
    ? "Cet événement a un **impact fort** : volatilité importante attendue, prudence sur les positions ouvertes."
    : impact === "medium"
      ? "Cet événement a un **impact moyen** : mouvements possibles, surtout si le résultat surprend."
      : "Cet événement a un **impact faible** : peu d'effet attendu sur le marché.";

  let meaning = "";
  let direction = "";
  let pairs: string[] = [];

  if (sentiment === "bullish") {
    meaning = `« ${title} » est une nouvelle **positive pour ${ccy}**. Cela renforce la confiance dans cette devise.`;
    direction = `→ ${ccy} peut **monter**.`;
    pairs = PAIRS[ccy]?.up ?? [];
  } else if (sentiment === "bearish") {
    meaning = `« ${title} » est une nouvelle **négative pour ${ccy}**. Cela affaiblit la devise.`;
    direction = `→ ${ccy} peut **baisser**.`;
    pairs = PAIRS[ccy]?.down ?? [];
  } else {
    meaning = `« ${title} » est une nouvelle **neutre pour ${ccy}** : impact limité tant qu'aucune surprise n'apparaît dans les chiffres.`;
    direction = `→ ${ccy} : direction **incertaine**.`;
    pairs = [];
  }

  return { meaning: `${meaning}\n\n${sevText}`, market: `Marché : surveille les paires liées à ${ccy} dans l'heure qui suit la publication.`, direction, pairs };
}
