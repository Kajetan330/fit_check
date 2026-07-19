import { getRequester } from "./_auth.js";
import { rateLimit } from "./_rateLimit.js";

const EVENT_NAMES = new Set([
  "creator_link_opened",
  "storefront_viewed",
  "primary_offer_clicked",
  "service_viewed",
  "booking_started",
  "brief_completed",
  "auth_completed",
  "delivery_approved",
  "repeat_booking_started",
]);

const SOURCES = new Set(["instagram_bio", "instagram_story", "tiktok", "youtube", "x", "newsletter", "dm", "other"]);

const isUuid = (value: unknown) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isSlug = (value: unknown) => typeof value === "string" && /^[a-z0-9-]{1,80}$/.test(value);
const isAnonSession = (value: unknown) => typeof value === "string" && /^[a-z0-9-]{16,64}$/i.test(value);

const cleanOptionalSlug = (value: unknown) => (isSlug(value) ? value : null);
const cleanSource = (value: unknown) => (typeof value === "string" && SOURCES.has(value) ? value : null);
const cleanPath = (value: unknown) => {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value.slice(0, 500);
};

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const limited = rateLimit(req, "track-event", 60);
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    res.status(429).json({ message: "Too many events." });
    return;
  }

  const body = req.body || {};
  if (!EVENT_NAMES.has(body.eventName) || !isAnonSession(body.anonymousSessionId)) {
    res.status(400).json({ message: "Invalid event." });
    return;
  }

  const { supabase, user } = await getRequester(req);
  if (!supabase) {
    res.status(204).end();
    return;
  }

  const creatorHandle = cleanOptionalSlug(body.creatorHandle);
  const productSlug = cleanOptionalSlug(body.productSlug);
  const serviceId = isUuid(body.serviceId) ? body.serviceId : null;
  const referralCode = typeof body.referralCode === "string" && body.referralCode !== "direct" ? body.referralCode.slice(0, 80) : null;
  const source = cleanSource(body.source);
  const campaign = cleanOptionalSlug(body.campaign);
  const landingPath = cleanPath(body.path);

  let creatorId: string | null = null;
  let productId: string | null = null;

  if (creatorHandle) {
    const { data: creator } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("handle", creatorHandle)
      .maybeSingle();
    creatorId = creator?.id ?? null;
  }

  if (productSlug && creatorId) {
    const { data: product } = await supabase
      .from("taste_products")
      .select("id")
      .eq("creator_id", creatorId)
      .eq("slug", productSlug)
      .maybeSingle();
    productId = product?.id ?? null;
  }

  const { error } = await supabase.from("commerce_events").insert({
    event_name: body.eventName,
    creator_id: creatorId,
    product_id: productId,
    service_id: serviceId,
    user_id: user?.id ?? null,
    anonymous_session_id: body.anonymousSessionId,
    referral_code: referralCode,
    source,
    campaign,
    landing_path: landingPath,
    metadata: {},
  });

  if (error && error.code !== "42703" && error.code !== "23514") {
    console.error("ByTaste event tracking failed", error.message);
  }

  res.status(204).end();
}
