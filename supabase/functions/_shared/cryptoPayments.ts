const MONTHS: Record<string, number> = { sub_1m: 1, sub_3m: 3, sub_6m: 6, sub_12m: 12 };

// Indicative conversion used for USD invoices; crypto network fees are provider-specific.
export function cryptoOffer(offer: string) {
  const months = Object.prototype.hasOwnProperty.call(MONTHS, offer) ? MONTHS[offer] : 0;
  if (!months) return null;
  const price_fcfa = 2500 * months;
  return { price_fcfa, price_usd: Math.round((price_fcfa / 600) * 100) / 100 };
}

export function nextCryptoStatus(current: string, providerStatus: string) {
  if (current === "approved" || current === "rejected") return current;
  if (providerStatus === "finished") return "approved";
  if (["failed", "expired", "refunded"].includes(providerStatus)) return "rejected";
  return "pending";
}