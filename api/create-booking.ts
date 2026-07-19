import { getRequester } from "./_auth.js";
import { rateLimit } from "./_rateLimit.js";

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);

const isSlug = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9-]{1,80}$/.test(value);
const cleanOptionalSlug = (value: unknown) => (isSlug(value) ? value : null);

const dueDateFromTurnaround = (turnaround: string) => {
  const days = turnaround.includes("24") ? 1 : turnaround.includes("5") ? 5 : 3;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const cleanAnswers = (answers: unknown): Record<string, string> => {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return {};
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers as Record<string, unknown>)) {
    if (!/^[a-z0-9_-]{1,40}$/i.test(key) || typeof value !== "string") continue;
    const text = value.trim().slice(0, 1000);
    if (text) cleaned[key] = text;
  }
  return cleaned;
};

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const limited = rateLimit(req, "create-booking", 10, 60 * 60 * 1000);
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    res.status(429).json({ message: "Too many booking attempts. Try again later." });
    return;
  }

  const { supabase, user } = await getRequester(req);
  if (!supabase) {
    res.status(501).json({ message: "Supabase admin client is not configured." });
    return;
  }

  if (!user) {
    res.status(401).json({ message: "Sign in before creating a booking." });
    return;
  }

  const body = req.body || {};
  const creatorHandle = cleanOptionalSlug(body.creatorHandle);
  const serviceRef = typeof body.serviceId === "string" ? body.serviceId.trim() : "";
  const answers = cleanAnswers(body.answers);
  const closetItemIds: string[] = Array.isArray(body.closetItemIds)
    ? body.closetItemIds.filter(isUuid).slice(0, 24)
    : [];
  const referralCode = typeof body.referralCode === "string" && body.referralCode !== "direct" ? body.referralCode.slice(0, 80) : null;
  const source = cleanOptionalSlug(body.source);
  const campaign = cleanOptionalSlug(body.campaign);

  if (!creatorHandle || !serviceRef || !Object.keys(answers).length) {
    res.status(400).json({ message: "Missing booking details." });
    return;
  }

  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("handle", creatorHandle)
    .eq("published", true)
    .maybeSingle();

  if (!creator) {
    res.status(404).json({ message: "Creator was not found." });
    return;
  }

  const serviceQuery = supabase
    .from("services")
    .select("id,creator_id,title,price_cents,turnaround,active")
    .eq("creator_id", creator.id)
    .eq("active", true);
  const { data: service } = isUuid(serviceRef)
    ? await serviceQuery.eq("id", serviceRef).maybeSingle()
    : await serviceQuery.eq("slug", serviceRef).maybeSingle();

  if (!service) {
    res.status(404).json({ message: "Service is not active." });
    return;
  }

  const brief = Object.values(answers).join(" / ").slice(0, 4000);
  const budget = typeof answers.budget === "string" ? answers.budget.slice(0, 500) : null;

  const bookingInsert = {
    customer_id: user.id,
    creator_id: creator.id,
    service_id: service.id,
    status: "intake",
    payment_status: "requires_payment",
    price_cents: service.price_cents,
    platform_fee_cents: 0,
    creator_payout_cents: service.price_cents,
    brief,
    budget,
    due_at: dueDateFromTurnaround(service.turnaround),
    source,
    campaign,
    referral_code: referralCode,
  };

  let { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert(bookingInsert)
    .select("id")
    .single();

  if (bookingError?.code === "42703") {
    const { source: _source, campaign: _campaign, referral_code: _referralCode, ...legacyBookingInsert } = bookingInsert;
    const retry = await supabase.from("bookings").insert(legacyBookingInsert).select("id").single();
    booking = retry.data;
    bookingError = retry.error;
  }

  if (bookingError || !booking) {
    res.status(500).json({ message: bookingError?.message || "Booking could not be created." });
    return;
  }

  if (closetItemIds.length) {
    await supabase.from("booking_closet_items").insert(
      closetItemIds.map((closetItemId) => ({
        booking_id: booking.id,
        closet_item_id: closetItemId,
      })),
    );
  }

  await supabase.from("commerce_events").insert({
    event_name: "booking_started",
    creator_id: creator.id,
    service_id: service.id,
    user_id: user.id,
    referral_code: referralCode,
    source,
    campaign,
    landing_path: `/book/${creatorHandle}/${serviceRef}`,
    metadata: {},
  });

  res.status(200).json({ bookingId: booking.id });
}
