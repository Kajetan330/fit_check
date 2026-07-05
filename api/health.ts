import { getSupabaseAdmin } from "./_supabaseAdmin";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  let supabaseAdminConfigured = false;
  let checkoutSessionsReachable = false;
  let checkoutSessionsMessage = "Supabase admin client is not configured.";

  try {
    const supabase = getSupabaseAdmin();
    supabaseAdminConfigured = Boolean(supabase);

    if (supabase) {
      const { error } = await supabase.from("checkout_sessions").select("booking_reference").limit(1);
      checkoutSessionsReachable = !error;
      checkoutSessionsMessage = error?.message ?? "checkout_sessions table is reachable.";
    }
  } catch (error) {
    checkoutSessionsMessage =
      error instanceof Error ? `Health check failed: ${error.message}` : "Health check failed unexpectedly.";
  }

  res.status(200).json({
    appUrlConfigured: Boolean(process.env.VITE_APP_URL),
    stripeSecretConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    supabaseAdminConfigured,
    checkoutSessionsReachable,
    checkoutSessionsMessage,
  });
}
