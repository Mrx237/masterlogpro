// Constantes business MasterLogPro
export const WHATSAPP_NUMBER = "237679418262"; // sans +
export const MOBILE_MONEY = {
  orange: "659703338",
  mtn: "679418262",
  airtel: "—",
};

export type OfferKey = "formation" | "sub_1m" | "sub_3m" | "sub_6m" | "sub_12m";

// ─── Pricing (promo de lancement) ─────────────────────────────
// Formation : 25 000 FCFA jusqu'au 20 juin 2026, puis 50 000 FCFA
// Mensuel   : 3 500 FCFA jusqu'au 20 juillet 2026, puis 5 000 FCFA
// Abos longue durée recalculés au prorata du nouveau prix mensuel (5 000)
const FORMATION_PROMO_END = new Date("2026-06-20T23:59:59+01:00");
const SUBSCRIPTION_PROMO_END = new Date("2026-07-20T23:59:59+01:00");

const PROMO_PRICES: Record<OfferKey, number> = {
  formation: 25000,
  sub_1m: 3500,
  sub_3m: 10500,   // 3 500 × 3
  sub_6m: 21000,   // 3 500 × 6
  sub_12m: 42000,  // 3 500 × 12
};

const REGULAR_PRICES: Record<OfferKey, number> = {
  formation: 50000,
  sub_1m: 5000,
  sub_3m: 15000,   // 5 000 × 3
  sub_6m: 30000,   // 5 000 × 6
  sub_12m: 60000,  // 5 000 × 12
};

function isPromoActive(key: OfferKey, now: Date = new Date()): boolean {
  const deadline = key === "formation" ? FORMATION_PROMO_END : SUBSCRIPTION_PROMO_END;
  return now <= deadline;
}

export function getOfferPrice(key: OfferKey, now: Date = new Date()): number {
  return isPromoActive(key, now) ? PROMO_PRICES[key] : REGULAR_PRICES[key];
}

export function getPromoInfo(key: OfferKey, now: Date = new Date()) {
  const deadline = key === "formation" ? FORMATION_PROMO_END : SUBSCRIPTION_PROMO_END;
  const active = now <= deadline;
  return {
    active,
    deadline,
    promoPrice: PROMO_PRICES[key],
    regularPrice: REGULAR_PRICES[key],
  };
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
