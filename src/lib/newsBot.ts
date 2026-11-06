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
  indicator: { name: string; explain: string; why: string };
  scenarios: { label: string; tone: "up" | "down" | "flat"; text: string }[];
  checklist: string[];
  surprise: string | null;
};

const INDICATORS: { re: RegExp; name: string; explain: string; why: string; higherIsGood: boolean }[] = [
  { re: /non-?farm|nfp|payrolls|employment change|emploi/i, name: "Emploi", explain: "Mesure le nombre d'emplois créés sur le mois.", why: "Plus d'emplois = économie solide = banque centrale plus ferme → devise soutenue.", higherIsGood: true },
  { re: /unemployment|chômage|jobless|claims/i, name: "Chômage", explain: "Part de la population active sans emploi (ou nouvelles inscriptions).", why: "Un chômage qui baisse est positif pour la devise ; qui monte, négatif.", higherIsGood: false },
  { re: /cpi|inflation|ppi|pce|prix/i, name: "Inflation", explain: "Mesure la hausse des prix dans l'économie.", why: "Inflation élevée → la banque centrale peut monter ses taux → devise plus forte.", higherIsGood: true },
  { re: /rate|taux|fomc|ecb|boe|boj|monetary|policy/i, name: "Taux directeur / Banque centrale", explain: "Décision ou discours sur le niveau des taux d'intérêt.", why: "Hausse des taux ou ton ferme (hawkish) → devise forte ; ton accommodant (dovish) → devise faible.", higherIsGood: true },
  { re: /gdp|pib/i, name: "Croissance (PIB)", explain: "Mesure la croissance totale de l'économie.", why: "Croissance supérieure aux attentes → confiance → devise soutenue.", higherIsGood: true },
  { re: /pmi|ism/i, name: "Indice PMI / ISM", explain: "Sondage auprès des directeurs d'achat. Au-dessus de 50 = expansion.", why: "Un PMI qui dépasse 50 et les prévisions est positif pour la devise.", higherIsGood: true },
  { re: /retail|ventes au détail/i, name: "Ventes au détail", explain: "Mesure la consommation des ménages.", why: "Consommation forte = économie dynamique → devise soutenue.", higherIsGood: true },
  { re: /speak|speech|discours|testimony|press conference/i, name: "Discours officiel", explain: "Intervention d'un responsable (banque centrale, gouvernement).", why: "Le ton du discours peut faire bouger fortement le marché, sans chiffre publié.", higherIsGood: true },
];

function num(v?: string | null) {
  if (!v) return null;
  const m = v.replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  let n = parseFloat(m[0]);
  if (/k$/i.test(v.trim())) n *= 1e3;
  if (/m$/i.test(v.trim())) n *= 1e6;
  return n;
}

export function generateAnalysis(opts: {
  title: string; currency: string; impact: Impact; sentiment: Sentiment;
  actual?: string | null; forecast?: string | null; previous?: string | null;
}): ExpertAnalysis {
  const { currency, impact, sentiment } = opts;
  const ind = INDICATORS.find((i) => i.re.test(opts.title));
  const indicator = ind
    ? { name: ind.name, explain: ind.explain, why: ind.why }
    : { name: "Indicateur économique", explain: "Donnée publiée qui renseigne sur la santé de l'économie.", why: "Un chiffre meilleur que prévu soutient en général la devise ; moins bon, il la pénalise." };
  const good = ind?.higherIsGood ?? true;
  const c0 = currency.toUpperCase();
  const up = (PAIRS[c0]?.up ?? []).slice(0, 2).join(", ");
  const dn = (PAIRS[c0]?.down ?? []).slice(0, 2).join(", ");
  const scenarios: ExpertAnalysis["scenarios"] = [
    { label: good ? "Réel > Prévision" : "Réel < Prévision", tone: "up", text: `Surprise positive → ${c0} probablement en hausse${up ? ` (${up})` : ""}.` },
    { label: "Réel ≈ Prévision", tone: "flat", text: "Déjà anticipé par le marché → mouvement limité, attendre la direction." },
    { label: good ? "Réel < Prévision" : "Réel > Prévision", tone: "down", text: `Surprise négative → ${c0} probablement en baisse${dn ? ` (${dn})` : ""}.` },
  ];
  let surprise: string | null = null;
  const a = num(opts.actual), f = num(opts.forecast);
  if (a !== null && f !== null) {
    const better = good ? a > f : a < f;
    surprise = a === f ? "Le chiffre publié est **conforme** aux prévisions."
      : better ? `Le chiffre publié (${opts.actual}) est **meilleur** que prévu (${opts.forecast}).`
      : `Le chiffre publié (${opts.actual}) est **moins bon** que prévu (${opts.forecast}).`;
  }
  const checklist = [
    "Note l'heure de publication et mets une alerte 15 min avant.",
    impact === "high" ? "Ferme ou protège (stop loss) tes positions ouvertes sur les paires concernées." : "Vérifie que tes positions ont un stop loss.",
    "Repère les niveaux clés (supports / résistances) avant l'annonce.",
    "Attends 5 à 15 min après la publication : laisse passer le premier pic de volatilité.",
    "Entre seulement si le prix confirme la direction attendue, avec un risque ≤ 1-2 % du capital.",
    "Note ce trade dans ton journal pour analyser ta réaction aux news.",
  ];
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
    indicator,
    scenarios,
    checklist,
    surprise,
  };
}
