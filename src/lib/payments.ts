import type { Booking } from "../types";

export interface CheckoutRequest {
  booking: Booking;
  customerEmail?: string;
}

export interface CheckoutResult {
  ok: boolean;
  checkoutUrl?: string;
  message: string;
}

export interface CheckoutStatusResult {
  paymentStatus: "unknown" | "requires_payment" | "paid" | "failed" | "refunded" | "cancelled";
  message?: string;
}

export async function createCheckoutSession({ booking, customerEmail }: CheckoutRequest): Promise<CheckoutResult> {
  void booking;
  void customerEmail;
  return {
    ok: false,
    message: "Payments require a signed-in ByTaste account. Booking was saved in demo mode.",
  };
}

export async function getCheckoutStatus(bookingId: string): Promise<CheckoutStatusResult> {
  try {
    const response = await fetch(`/api/checkout-status?bookingId=${encodeURIComponent(bookingId)}`);
    const payload = (await response.json()) as CheckoutStatusResult;

    if (!response.ok) {
      return {
        paymentStatus: payload.paymentStatus ?? "unknown",
        message: payload.message || "Checkout status is not available yet.",
      };
    }

    return payload;
  } catch {
    return {
      paymentStatus: "unknown",
      message: "Checkout status could not be reached.",
    };
  }
}
