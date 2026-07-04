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

export async function createCheckoutSession({ booking, customerEmail }: CheckoutRequest): Promise<CheckoutResult> {
  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: booking.id,
        creatorHandle: booking.creatorHandle,
        serviceTitle: booking.serviceTitle,
        amount: booking.price,
        customerEmail,
      }),
    });

    const payload = (await response.json()) as { url?: string; message?: string };

    if (!response.ok || !payload.url) {
      return {
        ok: false,
        message: payload.message || "Stripe is not configured yet. Booking was saved in demo mode.",
      };
    }

    return {
      ok: true,
      checkoutUrl: payload.url,
      message: "Checkout session created.",
    };
  } catch {
    return {
      ok: false,
      message: "Payments are unavailable in local demo mode. Booking was saved without charging.",
    };
  }
}
