// Constantes business MasterLogPro
export const WHATSAPP_NUMBER = "237679418262"; // sans +
export const MOBILE_MONEY = {
  orange: "659703338",
  mtn: "679418262",
  airtel: "—",
};

export type OfferKey = "formation" | "sub_1m" | "sub_3m" | "sub_6m" | "sub_12m";

export const OFFERS: Record<OfferKey, { label: string; price: number; description: string; type: "formation" | "subscription"; durationDays?: number }> = {
  formation: { label: "Formation complète", price: 70000, description: "Accès illimité : journal, stats avancées, exercices, feedback coach. Formation 50 000 + accès plateforme 20 000.", type: "formation" },
  sub_1m: { label: "Abonnement 1 mois", price: 5000, description: "Journal de trading complet pendant 1 mois.", type: "subscription", durationDays: 30 },
  sub_3m: { label: "Abonnement 3 mois", price: 12500, description: "Journal pendant 3 mois — économisez 17%.", type: "subscription", durationDays: 90 },
  sub_6m: { label: "Abonnement 6 mois", price: 25000, description: "Journal pendant 6 mois — économisez 17%.", type: "subscription", durationDays: 180 },
  sub_12m: { label: "Abonnement 12 mois", price: 100000, description: "Journal pendant 12 mois — accès longue durée.", type: "subscription", durationDays: 365 },
};

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
