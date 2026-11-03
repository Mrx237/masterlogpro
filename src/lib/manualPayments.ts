export type ManualPaymentStatus = "pending" | "approved" | "rejected";

export function canReviewManualPayment(status: string) {
  return status === "pending";
}

export function normalizePaymentPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("237") ? digits.slice(3) : digits;
}