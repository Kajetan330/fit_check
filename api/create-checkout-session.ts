import Stripe from "stripe";
import { getSupabaseAdmin, toCents } from "./_supabaseAdmin.js";
import { rateLimit } from "./_rateLimit.js";

const serviceCatalog = [
  ["amara-okafor", "Quick Take", 25],
  ["amara-okafor", "Style Diagnosis", 65],
  ["amara-okafor", "Wardrobe Audit", 95],
  ["amara-okafor", "Capsule Build", 165],
  ["lena-park", "Quick Take", 25],
  ["lena-park", "Style Diagnosis", 65],
  ["lena-park", "Wardrobe Audit", 115],
  ["lena-park", "Capsule Build", 145],
  ["noor-hassan", "Quick Take", 25],
  ["noor-hassan", "Style Diagnosis", 65],
  ["noor-hassan", "Wardrobe Audit", 115],
  ["noor-hassan", "Capsule Build", 165],
  ["ivy-marlowe", "Style Diagnosis", 65],
  ["ivy-marlowe", "Wardrobe Audit", 115],
  ["ivy-marlowe", "Capsule Build", 165],
] as const;

const servicePriceByKey = new Map(serviceCatalog.map(([creatorHandle, serviceTitle, price]) => [`${creatorHandle}:${serviceTitle}`, price]));

const setCorsHeaders = (res: any, appUrl: string) => {
  res.setHeader("Access-Control-Allow-Origin", appUrl);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

export default async function handler(req: any, res: any) {
  const appUrl = process.env.VITE_APP_URL;
  if (appUrl) {
    setCorsHeaders(res, appUrl);
  }

  if (req.method === "OPTIONS") {
    res.status(appUrl ? 204 : 501).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!appUrl) {
    res.status(501).json({ message: "App URL is not configured." });
    return;
  }

  const limited = rateLimit(req, "legacy-booking-checkout", 12);
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    res.status(429).json({ message: "Too many checkout attempts. Try again shortly." });
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

  const trustedAmount = servicePriceByKey.get(`${creatorHandle}:${serviceTitle}`);
  if (!trustedAmount) {
    res.status(400).json({ message: "Unknown service selection." });
    return;
  }

  if (toCents(amount) !== toCents(trustedAmount)) {
    res.status(400).json({ message: "Booking price does not match the service catalogue." });
    return;
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" });
  const cents = toCents(trustedAmount);

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
