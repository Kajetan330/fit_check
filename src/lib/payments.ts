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
  void booking;
  void customerEmail;
  return {
    ok: false,
    message: "Payments require a signed-in ByTaste account. Booking was saved in demo mode.",
  };
}
