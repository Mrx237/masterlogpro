import { describe, expect, it } from "vitest";
import { canReviewManualPayment, normalizePaymentPhone } from "@/lib/manualPayments";

describe("manual transfer review", () => {
  it("allows administrator review only while awaiting validation", () => {
    expect(canReviewManualPayment("pending")).toBe(true);
    expect(canReviewManualPayment("approved")).toBe(false);
    expect(canReviewManualPayment("rejected")).toBe(false);
  });
  it("normalizes Cameroon payment numbers", () => {
    expect(normalizePaymentPhone("+237 673 492 015")).toBe("673492015");
    expect(normalizePaymentPhone("659703338")).toBe("659703338");
  });
});