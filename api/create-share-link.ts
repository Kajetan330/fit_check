import { getRequester, isAdmin } from "./_auth.js";
import { randomToken, sha256 } from "./_crypto.js";
import { rateLimit } from "./_rateLimit.js";
import { randomBytes } from "node:crypto";

const setCorsHeaders = (res: any, appUrl: string) => {
  res.setHeader("Access-Control-Allow-Origin", appUrl);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const isUuid = (value: unknown) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const isCode = (value: unknown) => typeof value === "string" && /^[a-zA-Z0-9_-]{3,80}$/.test(value);
const isCampaign = (value: unknown) => typeof value === "string" && /^[a-z0-9-]{1,40}$/.test(value);

const randomCode = () => {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};

export default async function handler(req: any, res: any) {
  const appUrl = process.env.VITE_APP_URL;
  if (appUrl) {
    setCorsHeaders(res, appUrl);
  }
  res.setHeader("Cache-Control", "no-store");

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

  const limited = rateLimit(req, "create-share-link", 20);
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    res.status(429).json({ message: "Too many share links requested. Try again shortly." });
    return;
  }

  const { supabase, user } = await getRequester(req);
  if (!supabase) {
    res.status(501).json({ message: "Supabase admin client is not configured." });
    return;
  }
  if (!user) {
    res.status(401).json({ message: "Sign in to create a controlled share link." });
    return;
  }

  const body = req.body || {};

  if (body.kind === "referral") {
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
    return;
  }

  const { resourceType, resourceId, expiresInMinutes, maxViews } = body;
  if ((resourceType !== "lookbook" && resourceType !== "paid_edit") || !isUuid(resourceId)) {
    res.status(400).json({ message: "Invalid share-link request." });
    return;
  }

  let allowed = await isAdmin(user.id);

  if (!allowed && resourceType === "paid_edit") {
    const { data: product } = await supabase
      .from("taste_products")
      .select("id,creator_id")
      .eq("id", resourceId)
      .maybeSingle();

    if (product?.creator_id) {
      const { data: creator } = await supabase
        .from("creator_profiles")
        .select("user_id")
        .eq("id", product.creator_id)
        .maybeSingle();
      allowed = creator?.user_id === user.id;
    }
  }

  if (!allowed && resourceType === "lookbook") {
    const { data: lookbook } = await supabase
      .from("lookbooks")
      .select("id,booking_id")
      .eq("id", resourceId)
      .maybeSingle();

    if (lookbook?.booking_id) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("customer_id,creator_id")
        .eq("id", lookbook.booking_id)
        .maybeSingle();
      let creatorOwnerId = "";
      if (booking?.creator_id) {
        const { data: creator } = await supabase
          .from("creator_profiles")
          .select("user_id")
          .eq("id", booking.creator_id)
          .maybeSingle();
        creatorOwnerId = creator?.user_id ?? "";
      }
      allowed = booking?.customer_id === user.id || creatorOwnerId === user.id;
    }
  }

  if (!allowed) {
    res.status(403).json({ message: "You are not allowed to create a share link for this resource." });
    return;
  }

  const token = randomToken();
  const expiresAt =
    typeof expiresInMinutes === "number" && expiresInMinutes > 0
      ? new Date(Date.now() + expiresInMinutes * 60_000).toISOString()
      : null;

  const { data: link, error } = await supabase
    .from("controlled_share_links")
    .insert({
      owner_user_id: user.id,
      resource_type: resourceType,
      resource_id: resourceId,
      token_hash: sha256(token),
      expires_at: expiresAt,
      max_views: typeof maxViews === "number" && maxViews > 0 ? Math.floor(maxViews) : null,
    })
    .select("id,expires_at,max_views")
    .single();

  if (error || !link) {
    res.status(500).json({ message: error?.message || "Share link could not be created." });
    return;
  }

  res.status(200).json({
    id: link.id,
    token,
    path: `/share/${token}`,
    expiresAt: link.expires_at,
    maxViews: link.max_views,
  });
}
