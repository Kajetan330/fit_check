import { getSupabaseAdmin } from "./_supabaseAdmin.js";

const setCorsHeaders = (res: any, appUrl: string) => {
  res.setHeader("Access-Control-Allow-Origin", appUrl);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
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

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!appUrl) {
    res.status(501).json({ paymentStatus: "unknown", message: "App URL is not configured." });
    return;
  }

  const bookingId = typeof req.query?.bookingId === "string" ? req.query.bookingId : "";

  if (!bookingId) {
    res.status(400).json({ message: "Missing bookingId." });
    return;
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    res.status(200).json({ paymentStatus: "unknown", message: "Supabase admin client is not configured." });
    return;
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("payment_status,stripe_checkout_session_id,updated_at")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError && bookingError.code !== "22P02") {
    res.status(200).json({ paymentStatus: "unknown", message: bookingError.message });
    return;
  }

  if (booking) {
    res.status(200).json({
      paymentStatus: booking.payment_status,
      stripeCheckoutSessionId: booking.stripe_checkout_session_id,
      updatedAt: booking.updated_at,
    });
    return;
  }

  const { data, error } = await supabase
    .from("checkout_sessions")
    .select("payment_status,stripe_checkout_session_id,updated_at")
    .eq("booking_reference", bookingId)
    .maybeSingle();

  if (error) {
    res.status(200).json({ paymentStatus: "unknown", message: error.message });
    return;
  }

  if (!data) {
    res.status(404).json({ paymentStatus: "unknown", message: "Checkout session not found." });
    return;
  }

  res.status(200).json({
    paymentStatus: data.payment_status,
    stripeCheckoutSessionId: data.stripe_checkout_session_id,
    updatedAt: data.updated_at,
  });
}
