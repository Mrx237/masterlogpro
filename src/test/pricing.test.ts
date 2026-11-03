import { describe, it, expect } from "vitest";
import { getOfferPrice } from "@/lib/constants";

describe("pricing", () => {
  it("monthly subscription is 2500 FCFA", () => {
    expect(getOfferPrice("sub_1m")).toBe(2500);
  });
  it("longer subscriptions are 2500 FCFA per month", () => {
    expect(getOfferPrice("sub_3m")).toBe(7500);
    expect(getOfferPrice("sub_12m")).toBe(30000);
  });
});
