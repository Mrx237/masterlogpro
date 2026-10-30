import { describe, it, expect } from "vitest";
import { getOfferPrice } from "@/lib/constants";

describe("pricing", () => {
  it("monthly subscription is 1500 FCFA", () => {
    expect(getOfferPrice("sub_1m")).toBe(1500);
  });
  it("longer subscriptions are 1500 FCFA per month", () => {
    expect(getOfferPrice("sub_3m")).toBe(4500);
    expect(getOfferPrice("sub_12m")).toBe(18000);
  });
});
