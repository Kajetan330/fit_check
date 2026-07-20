import { getRequester } from "./_auth.js";
import { rateLimit } from "./_rateLimit.js";
import { sendBookingEmail } from "./_email.js";

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const isEmail = (value: unknown): value is string =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const isSlug = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9-]{1,80}$/.test(value);
const cleanText = (value: unknown, max = 4000) => (typeof value === "string" ? value.trim().slice(0, max) : "");

const setCorsHeaders = (res: any, appUrl: string) => {
  res.setHeader("Access-Control-Allow-Origin", appUrl);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

async function recordEvent(supabase: any, booking: any, eventName: string, userId: string | null, metadata = {}) {
  const { error } = await supabase.from("commerce_events").insert({
    event_name: eventName,
    creator_id: booking.creator_id,
    service_id: booking.service_id,
    user_id: userId,
    referral_code: booking.referral_code,
    source: booking.source,
    campaign: booking.campaign,
    metadata: { bookingId: booking.id, ...metadata },
  });
  if (error && error.code !== "23514" && error.code !== "42P01") {
    console.error("ByTaste booking event failed", eventName, error.message);
  }
}

async function loadBooking(supabase: any, bookingId: string) {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      "id,customer_id,creator_id,service_id,status,payment_status,delivered_at,approved_at,approval_deadline,problem_reported_at,source,campaign,referral_code",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !booking) return { booking: null, creatorOwnerId: "" };

  const { data: creator } = await supabase.from("creator_profiles").select("user_id").eq("id", booking.creator_id).maybeSingle();
  return { booking, creatorOwnerId: creator?.user_id ?? "" };
}

export default async function handler(req: any, res: any) {
  const appUrl = process.env.VITE_APP_URL;
  if (appUrl) setCorsHeaders(res, appUrl);
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(appUrl ? 204 : 501).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const body = req.body || {};
  const action = body.action;

  if (action === "waitlist") {
    const limited = rateLimit(req, "waitlist", 10, 60 * 60 * 1000);
    if (!limited.ok) {
      res.setHeader("Retry-After", String(limited.retryAfter));
      res.status(429).json({ message: "Too many waitlist attempts. Try again later." });
      return;
    }

    const { supabase } = await getRequester(req);
    if (!supabase) {
      res.status(501).json({ message: "Waitlist is not configured." });
      return;
    }
    if (!isSlug(body.creatorHandle) || !isEmail(body.email)) {
      res.status(400).json({ message: "Add a valid email for this creator waitlist." });
      return;
    }

    const { data: creator } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("handle", body.creatorHandle)
      .maybeSingle();
    if (!creator) {
      res.status(404).json({ message: "Creator was not found." });
      return;
    }

    const { error } = await supabase
      .from("waitlist_signups")
      .upsert({ creator_id: creator.id, email: body.email.toLowerCase() }, { onConflict: "creator_id,email" });
    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  const limited = rateLimit(req, "booking-actions", 60, 60 * 60 * 1000);
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    res.status(429).json({ message: "Too many booking actions. Try again later." });
    return;
  }

  const { supabase, user } = await getRequester(req);
  if (!supabase) {
    res.status(501).json({ message: "Supabase admin client is not configured." });
    return;
  }
  if (!user) {
    res.status(401).json({ message: "Sign in before updating a booking." });
    return;
  }
  if (!isUuid(body.bookingId)) {
    res.status(400).json({ message: "Missing booking." });
    return;
  }

  const { booking, creatorOwnerId } = await loadBooking(supabase, body.bookingId);
  if (!booking) {
    res.status(404).json({ message: "Booking was not found." });
    return;
  }

  const isCustomer = booking.customer_id === user.id;
  const isCreator = creatorOwnerId === user.id;
  if (!isCustomer && !isCreator) {
    res.status(403).json({ message: "You are not allowed to update this booking." });
    return;
  }

  const now = new Date();
  const note = cleanText(body.note || body.body);

  if (action === "message") {
    if (!note) {
      res.status(400).json({ message: "Message is required." });
      return;
    }
    const { error } = await supabase.from("booking_messages").insert({
      booking_id: booking.id,
      sender_id: user.id,
      body: note,
    });
    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }
    await recordEvent(supabase, booking, "booking_message_sent", user.id);
    await sendBookingEmail(isCreator ? "creator_message" : "customer_message", booking.id);
    res.status(200).json({ ok: true });
    return;
  }

  if (action === "deliver" || action === "redeliver") {
    if (!isCreator) {
      res.status(403).json({ message: "Only the booked creator can deliver this booking." });
      return;
    }
    if (booking.payment_status !== "paid") {
      res.status(409).json({ message: `Cannot deliver while payment is ${booking.payment_status}.` });
      return;
    }
    const approvalDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
    const update =
      action === "deliver"
        ? { status: "ready", delivered_at: now.toISOString(), approval_deadline: approvalDeadline }
        : { status: "ready", delivered_at: now.toISOString(), approval_deadline: approvalDeadline };
    const { error } = await supabase.from("bookings").update(update).eq("id", booking.id);
    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }
    if (action === "redeliver") {
      await supabase
        .from("revision_requests")
        .update({ status: "delivered", resolved_at: now.toISOString() })
        .eq("booking_id", booking.id)
        .eq("status", "open");
    }
    await recordEvent(supabase, booking, action === "deliver" ? "delivery_ready" : "redelivery_ready", user.id);
    const emailSent = await sendBookingEmail(action === "deliver" ? "delivery_ready" : "redelivery_ready", booking.id);
    if (emailSent) {
      await supabase.from("bookings").update({ delivery_email_sent_at: now.toISOString() }).eq("id", booking.id);
    }
    res.status(200).json({ ok: true, approvalDeadline });
    return;
  }

  if (action === "revision") {
    if (!isCustomer) {
      res.status(403).json({ message: "Only the customer can request a revision." });
      return;
    }
    if (booking.status !== "ready" || booking.approved_at) {
      res.status(409).json({ message: `Cannot request a revision while booking is ${booking.status}.` });
      return;
    }
    if (!note) {
      res.status(400).json({ message: "Revision note is required." });
      return;
    }
    const { count } = await supabase
      .from("revision_requests")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", booking.id);
    if ((count ?? 0) >= 1) {
      res.status(409).json({ message: "The included revision has already been used." });
      return;
    }
    const { error } = await supabase.from("revision_requests").insert({
      booking_id: booking.id,
      requested_by: user.id,
      note,
    });
    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }
    await supabase.from("bookings").update({ status: "revision_requested", revision_requested_at: now.toISOString() }).eq("id", booking.id);
    await recordEvent(supabase, booking, "revision_requested", user.id);
    await sendBookingEmail("revision_requested", booking.id);
    res.status(200).json({ ok: true });
    return;
  }

  if (action === "approve") {
    if (!isCustomer) {
      res.status(403).json({ message: "Only the customer can approve delivery." });
      return;
    }
    if (booking.status !== "ready" || booking.problem_reported_at) {
      res.status(409).json({ message: `Cannot approve while booking is ${booking.status}.` });
      return;
    }
    const { error } = await supabase
      .from("bookings")
      .update({ status: "completed", approved_at: now.toISOString(), completed_at: now.toISOString() })
      .eq("id", booking.id);
    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }
    await recordEvent(supabase, booking, "delivery_approved", user.id);
    await sendBookingEmail("booking_approved", booking.id);
    res.status(200).json({ ok: true });
    return;
  }

  if (action === "report") {
    if (!isCustomer) {
      res.status(403).json({ message: "Only the customer can report a problem." });
      return;
    }
    if (!note) {
      res.status(400).json({ message: "Problem note is required." });
      return;
    }
    const { error } = await supabase
      .from("bookings")
      .update({ status: "disputed", problem_reported_at: now.toISOString() })
      .eq("id", booking.id);
    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }
    await supabase.from("disputes").insert({ booking_id: booking.id, opened_by: user.id, reason: note });
    await recordEvent(supabase, booking, "problem_reported", user.id);
    await sendBookingEmail("dispute_update", booking.id);
    res.status(200).json({ ok: true });
    return;
  }

  if (action === "review") {
    if (!isCustomer) {
      res.status(403).json({ message: "Only the customer can review this booking." });
      return;
    }
    const rating = Number(body.rating);
    if (!booking.approved_at || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(409).json({ message: "Reviews require an approved booking and a 1-5 rating." });
      return;
    }
    const { error } = await supabase.from("reviews").insert({
      booking_id: booking.id,
      creator_id: booking.creator_id,
      customer_id: user.id,
      rating,
      body: cleanText(body.body, 2000),
      published: true,
      verified: true,
    });
    if (error) {
      res.status(error.code === "23505" ? 409 : 500).json({ message: error.message });
      return;
    }
    await recordEvent(supabase, booking, "booking_reviewed", user.id);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(400).json({ message: "Unknown booking action." });
}
