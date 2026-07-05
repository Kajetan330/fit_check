import Stripe from "stripe";
import { getSupabaseAdmin, toCents } from "./_supabaseAdmin.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.VITE_APP_URL || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req: any, res: any) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    res.status(501).json({ message: "Stripe is not configured. Add STRIPE_SECRET_KEY in production." });
    return;
  }

  const { bookingId, creatorHandle, serviceTitle, amount, customerEmail } = req.body || {};

  if (!bookingId || !creatorHandle || !serviceTitle || !amount) {
    res.status(400).json({ message: "Missing booking checkout fields." });
    return;
  }

  const appUrl = process.env.VITE_APP_URL || "http://127.0.0.1:5173";
  const stripe = new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" });
  const cents = toCents(amount);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: cents,
          product_data: {
            name: `FitCheck ${serviceTitle}`,
            description: `Booking ${bookingId} with ${creatorHandle}`,
          },
        },
      },
    ],
    metadata: {
      bookingId,
      creatorHandle,
      serviceTitle,
    },
    success_url: `${appUrl}/bookings/${bookingId}?checkout=success`,
    cancel_url: `${appUrl}/bookings/${bookingId}?checkout=cancelled`,
  });

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("checkout_sessions").upsert(
      {
        booking_reference: bookingId,
        stripe_checkout_session_id: session.id,
        creator_handle: creatorHandle,
        service_title: serviceTitle,
        amount_cents: cents,
        customer_email: customerEmail || null,
        payment_status: "requires_payment",
      },
      { onConflict: "booking_reference" },
    );

    if (error) {
      console.error("FitCheck checkout session persistence failed", error.message);
    }
  }

  res.status(200).json({ url: session.url });
}
