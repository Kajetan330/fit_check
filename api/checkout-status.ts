import { getSupabaseAdmin } from "./_supabaseAdmin.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.VITE_APP_URL || "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req: any, res: any) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
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
