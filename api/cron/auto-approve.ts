import { getSupabaseAdmin } from "../_supabaseAdmin.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization || req.headers.Authorization;
  if (!cronSecret) {
    res.status(501).json({ message: "CRON_SECRET is not configured." });
    return;
  }

  if (authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(501).json({ message: "Supabase admin client is not configured." });
    return;
  }

  const now = new Date().toISOString();
  const { data: approved, error } = await supabase
    .from("bookings")
    .update({
      approved_at: now,
      status: "completed",
      updated_at: now,
    })
    .is("approved_at", null)
    .is("problem_reported_at", null)
    .lt("approval_deadline", now)
    .select("id,creator_id,service_id,customer_id,source,campaign,referral_code");

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  if (approved?.length) {
    await supabase.from("commerce_events").insert(
      approved.map((booking) => ({
        event_name: "delivery_approved",
        creator_id: booking.creator_id,
        service_id: booking.service_id,
        user_id: booking.customer_id,
        referral_code: booking.referral_code,
        source: booking.source,
        campaign: booking.campaign,
        metadata: { bookingId: booking.id, autoApproved: true },
      })),
    );
  }

  res.status(200).json({ approved: approved?.length ?? 0 });
}
