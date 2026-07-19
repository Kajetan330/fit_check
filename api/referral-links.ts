import { getRequester } from "./_auth.js";
import { rateLimit } from "./_rateLimit.js";
import { randomBytes } from "node:crypto";

const isUuid = (value: unknown) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);

const isCode = (value: unknown) => typeof value === "string" && /^[a-zA-Z0-9_-]{3,80}$/.test(value);
const isCampaign = (value: unknown) => typeof value === "string" && /^[a-z0-9-]{1,40}$/.test(value);

const randomCode = () => {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const limited = rateLimit(req, "referral-links", 20, 60 * 60 * 1000);
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    res.status(429).json({ message: "Too many link creations. Try again later." });
    return;
  }

  const { supabase, user } = await getRequester(req);
  if (!supabase) {
    res.status(501).json({ message: "Supabase admin client is not configured." });
    return;
  }

  if (!user) {
    res.status(401).json({ message: "Sign in before creating links." });
    return;
  }

  const body = req.body || {};
  const destinationType =
    body.destinationType === "edit" ? "taste_product" : body.destinationType === "service" ? "service" : "storefront";
  const destinationId = isUuid(body.destinationId) ? body.destinationId : null;
  const code = isCode(body.code) ? body.code : randomCode();
  const campaign = isCampaign(body.campaign) ? body.campaign : null;

  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("id,handle")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!creator) {
    res.status(403).json({ message: "No owned creator profile was found." });
    return;
  }

  if ((destinationType === "service" || destinationType === "taste_product") && !destinationId) {
    res.status(400).json({ message: "Destination ID is required for this link type." });
    return;
  }

  if (destinationType === "service") {
    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("id", destinationId)
      .eq("creator_id", creator.id)
      .maybeSingle();
    if (!service) {
      res.status(404).json({ message: "Service destination was not found." });
      return;
    }
  }

  if (destinationType === "taste_product") {
    const { data: product } = await supabase
      .from("taste_products")
      .select("id")
      .eq("id", destinationId)
      .eq("creator_id", creator.id)
      .maybeSingle();
    if (!product) {
      res.status(404).json({ message: "Edit destination was not found." });
      return;
    }
  }

  const { data: link, error } = await supabase
    .from("creator_referral_links")
    .insert({
      creator_id: creator.id,
      code,
      destination_type: destinationType,
      destination_id: destinationId,
      campaign,
      active: true,
    })
    .select("code,destination_type,destination_id,campaign")
    .single();

  if (error?.code === "23505") {
    res.status(409).json({ message: "That referral code already exists." });
    return;
  }

  if (error || !link) {
    res.status(500).json({ message: error?.message || "Referral link could not be created." });
    return;
  }

  res.status(200).json({
    code: link.code,
    destinationType: link.destination_type,
    destinationId: link.destination_id,
    campaign: link.campaign,
  });
}
