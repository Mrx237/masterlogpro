import { describe, expect, it } from "vitest";
import { cryptoOffer, nextCryptoStatus } from "../../supabase/functions/_shared/cryptoPayments";

describe("crypto subscriptions", () => {
  it("charges 2500 FCFA per month for every subscription", () => {
    expect(cryptoOffer("sub_1m")).toEqual({ price_fcfa: 2500, price_usd: 4.17 });
    expect(cryptoOffer("sub_3m")?.price_fcfa).toBe(7500);
    expect(cryptoOffer("sub_6m")?.price_fcfa).toBe(15000);
    expect(cryptoOffer("sub_12m")?.price_fcfa).toBe(30000);
  });
  it("does not sell the removed formation offer", () => {
    expect(cryptoOffer("formation")).toBeNull();
    expect(cryptoOffer("toString")).toBeNull();
  });
  it("activates only a finished payment and never repeats an approved payment", () => {
    expect(nextCryptoStatus("pending", "confirmed")).toBe("pending");
    expect(nextCryptoStatus("pending", "partially_paid")).toBe("pending");
    expect(nextCryptoStatus("pending", "finished")).toBe("approved");
    expect(nextCryptoStatus("approved", "waiting")).toBe("approved");
    expect(nextCryptoStatus("rejected", "finished")).toBe("rejected");
  });
});