// Bot d'analyse fondamentale "expert" — déterministe, pédagogique.
// Génère : zone, interprétation, impact marché, conclusion + paires.

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

export function impactLabel(i: Impact) {
  return i === "high" ? "Fort" : i === "medium" ? "Moyen" : "Faible";
}
export function sentimentLabel(s: Sentiment) {
  return s === "bullish" ? "Haussier" : s === "bearish" ? "Baissier" : "Neutre";
}

export type ExpertAnalysis = {
  zone: { flag: string; name: string; currency: string };
  interpretation: string;     // Ce que ça veut dire pour la devise
  marketImpact: string;       // Ce que le marché peut faire
  conclusion: {
    icon: "buy" | "sell" | "wait";
    label: string;            // "Opportunité d'achat" / etc.
    bias: string;              // "biais haussier sur USD"
  };
  pairs: string[];
  warning: string;            // Note prudence (selon impact)
};

export function generateAnalysis(opts: {
  title: string; currency: string; impact: Impact; sentiment: Sentiment;
}): ExpertAnalysis {
  const { currency, impact, sentiment } = opts;
  const ccy = currency.toUpperCase();
  const zone = ZONE[ccy] ?? { flag: "🌍", name: "International" };

  let interpretation = "";
  let marketImpact = "";
  let conclusion: ExpertAnalysis["conclusion"];
  let pairs: string[] = [];

  if (sentiment === "bullish") {
    interpretation = `Cette donnée est **positive pour le ${ccy}**. Elle renforce la confiance des investisseurs dans cette devise.`;
    marketImpact = `Le **${ccy} peut monter** face aux autres devises.`;
    pairs = PAIRS[ccy]?.up ?? [];
    conclusion = { icon: "buy", label: "Opportunité d'achat sur " + ccy, bias: `Biais **haussier** sur ${ccy}` };
  } else if (sentiment === "bearish") {
    interpretation = `Cette donnée est **négative pour le ${ccy}**. Elle affaiblit la confiance des investisseurs.`;
    marketImpact = `Le **${ccy} peut baisser** face aux autres devises.`;
    pairs = PAIRS[ccy]?.down ?? [];
    conclusion = { icon: "sell", label: "Opportunité de vente sur " + ccy, bias: `Biais **baissier** sur ${ccy}` };
  } else {
    interpretation = `Cette donnée est **neutre pour le ${ccy}** : elle est conforme aux attentes du marché.`;
    marketImpact = `Peu d'effet attendu sur le ${ccy} sauf surprise dans les chiffres.`;
    pairs = [];
    conclusion = { icon: "wait", label: "Attendre la confirmation", bias: `Direction **incertaine** sur ${ccy}` };
  }

  const warning = impact === "high"
    ? "⚠️ **Impact fort** : forte volatilité attendue. Évite d'ouvrir une position juste avant la publication."
    : impact === "medium"
      ? "ℹ️ **Impact moyen** : des mouvements sont possibles, surtout en cas de surprise."
      : "✅ **Impact faible** : peu d'effet sur le marché.";

  return {
    zone: { ...zone, currency: ccy },
    interpretation,
    marketImpact,
    conclusion,
    pairs,
    warning,
  };
}
