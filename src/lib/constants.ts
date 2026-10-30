// Constantes business MasterLogPro
export const WHATSAPP_NUMBER = "237679418262"; // sans +
export const MOBILE_MONEY = {
  orange: "659703338",
  mtn: "679418262",
  airtel: "—",
};

export type OfferKey = "formation" | "sub_1m" | "sub_3m" | "sub_6m" | "sub_12m";

// ─── Pricing ─────────────────────────────────────────────────
// Formation supprimée. Abonnement unique : 1 500 FCFA / mois pour tous les traders.
export const MONTHLY_PRICE = 1500;
export const PUBLIC_OFFERS: OfferKey[] = ["sub_1m", "sub_3m", "sub_6m", "sub_12m"];
const MONTHS: Record<OfferKey, number> = { formation: 1, sub_1m: 1, sub_3m: 3, sub_6m: 6, sub_12m: 12 };

export function getOfferPrice(key: OfferKey, _now: Date = new Date()): number {
  return MONTHLY_PRICE * MONTHS[key];
}

export function getPromoInfo(key: OfferKey, _now: Date = new Date()) {
  const p = getOfferPrice(key);
  return { active: false, deadline: new Date(0), promoPrice: p, regularPrice: p };
}

type OfferDef = { label: string; price: number; description: string; type: "formation" | "subscription"; durationDays?: number };

export const OFFERS: Record<OfferKey, OfferDef> = new Proxy(
  {
    formation: { label: "Formation complète", price: 0, description: "Accès illimité : journal, stats avancées, exercices, feedback coach. Formation + accès plateforme à vie.", type: "formation" },
    sub_1m: { label: "Abonnement 1 mois", price: 0, description: "Journal de trading complet pendant 1 mois.", type: "subscription", durationDays: 30 },
    sub_3m: { label: "Abonnement 3 mois", price: 0, description: "Journal pendant 3 mois.", type: "subscription", durationDays: 90 },
    sub_6m: { label: "Abonnement 6 mois", price: 0, description: "Journal pendant 6 mois.", type: "subscription", durationDays: 180 },
    sub_12m: { label: "Abonnement 12 mois", price: 0, description: "Journal pendant 12 mois — accès longue durée.", type: "subscription", durationDays: 365 },
  } as Record<OfferKey, OfferDef>,
  {
    get(target, prop: string) {
      const base = (target as any)[prop];
      if (!base) return base;
      return { ...base, price: getOfferPrice(prop as OfferKey) };
    },
  }
);

export const PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD",
  "EUR/JPY", "GBP/JPY", "EUR/GBP",
  "XAU/USD", "XAG/USD",
  "BTC/USD", "ETH/USD",
  "US30", "NAS100", "SPX500",
];

export function buildWhatsAppLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function formatFCFA(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}
