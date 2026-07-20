import { getSupabaseAdmin } from "../_supabaseAdmin.js";
import { sendBookingEmail } from "../_email.js";

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

  const nowDate = new Date();
  const now = nowDate.toISOString();
  const reminderCutoff = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data: reminders } = await supabase
    .from("bookings")
    .select("id")
    .is("approved_at", null)
    .is("problem_reported_at", null)
    .is("reminder_sent_at", null)
    .not("delivery_email_sent_at", "is", null)
    .lt("approval_deadline", reminderCutoff)
    .gt("approval_deadline", now);

  let reminded = 0;
  for (const booking of reminders ?? []) {
    const sent = await sendBookingEmail("approval_reminder", booking.id);
    if (sent) {
      await supabase.from("bookings").update({ reminder_sent_at: now }).eq("id", booking.id);
      reminded += 1;
    }
  }

  const { data: approved, error } = await supabase
    .from("bookings")
    .update({
      approved_at: now,
      status: "completed",
      updated_at: now,
    })
    .is("approved_at", null)
    .is("problem_reported_at", null)
    .not("delivery_email_sent_at", "is", null)
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

  const inactiveCutoff = new Date(nowDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const draftCutoff = new Date(nowDate.getTime() - 48 * 60 * 60 * 1000).toISOString();

  const { data: deletedBookings } = await supabase
    .from("bookings")
    .delete()
    .is("activated_at", null)
    .lt("created_at", inactiveCutoff)
    .select("id");

  const { data: staleDrafts } = await supabase
    .from("draft_uploads")
    .select("id,storage_path")
    .is("claimed_booking_id", null)
    .lt("created_at", draftCutoff);
  const stalePaths = staleDrafts?.map((draft) => draft.storage_path).filter(Boolean) ?? [];
  if (stalePaths.length) {
    await supabase.storage.from("private-booking-uploads").remove(stalePaths);
    await supabase
      .from("draft_uploads")
      .delete()
      .in(
        "id",
        staleDrafts!.map((draft) => draft.id),
      );
  }

  res.status(200).json({
    reminded,
    approved: approved?.length ?? 0,
    deletedInactiveBookings: deletedBookings?.length ?? 0,
    deletedDraftUploads: stalePaths.length,
  });
}
