import Stripe from "stripe";
import { getRequester } from "./_auth.js";
import { rateLimit } from "./_rateLimit.js";
import { sendBookingEmail } from "./_email.js";

const setCorsHeaders = (res: any, appUrl: string) => {
  res.setHeader("Access-Control-Allow-Origin", appUrl);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isSlug = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9-]{1,80}$/.test(value);
const cleanOptionalSlug = (value: unknown) => (isSlug(value) ? value : null);

export default async function handler(req: any, res: any) {
  const appUrl = process.env.VITE_APP_URL;
  if (appUrl) {
    setCorsHeaders(res, appUrl);
  }

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

  const limited = rateLimit(req, "commerce-checkout", 12);
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    res.status(429).json({ message: "Too many checkout attempts. Try again shortly." });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    res.status(501).json({ message: "Stripe is not configured." });
    return;
  }

  const { checkoutType, referenceId, referralCode } = req.body || {};
  const source = cleanOptionalSlug(req.body?.source);
  const campaign = cleanOptionalSlug(req.body?.campaign);
  if ((checkoutType !== "taste_product" && checkoutType !== "booking") || !isUuid(referenceId)) {
    res.status(400).json({ message: "Invalid checkout request." });
    return;
  }

  const { supabase, user } = await getRequester(req);
  if (!supabase) {
    res.status(501).json({ message: "Supabase admin client is not configured." });
    return;
  }

  if (!user) {
    res.status(401).json({ message: "Sign in before checkout." });
    return;
  }

  if (checkoutType === "booking") {
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id,customer_id,creator_id,service_id,price_cents,payment_status")
      .eq("id", referenceId)
      .eq("customer_id", user.id)
      .maybeSingle();

    if (bookingError || !booking) {
      res.status(404).json({ message: "Booking was not found for this account." });
      return;
    }

    if (booking.payment_status === "paid" || booking.payment_status === "released") {
      res.status(409).json({ message: "This booking is already paid." });
      return;
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" });
    const { data: service } = await supabase.from("services").select("title").eq("id", booking.service_id).maybeSingle();
    const serviceTitle = service?.title ?? "Styling service";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: booking.price_cents,
            product_data: {
              name: `ByTaste ${serviceTitle}`,
            },
          },
        },
      ],
      metadata: {
        checkoutType: "booking",
        bookingId: booking.id,
        serviceId: booking.service_id,
        creatorId: booking.creator_id,
        customerId: user.id,
        referralCode: typeof referralCode === "string" ? referralCode : "",
        source: source ?? "",
        campaign: campaign ?? "",
      },
      success_url: `${appUrl}/bookings/${booking.id}?checkout=success`,
      cancel_url: `${appUrl}/bookings/${booking.id}?checkout=cancelled`,
    });

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        stripe_checkout_session_id: session.id,
        activated_at: new Date().toISOString(),
        source,
        campaign,
        referral_code: typeof referralCode === "string" ? referralCode : null,
      })
      .eq("id", booking.id);

    if (updateError?.code === "42703") {
      const { error: retryError } = await supabase
        .from("bookings")
        .update({ stripe_checkout_session_id: session.id })
        .eq("id", booking.id);
      if (retryError) {
        res.status(500).json({ message: retryError.message });
        return;
      }
    } else if (updateError) {
      res.status(500).json({ message: updateError.message });
      return;
    }

    await supabase.from("commerce_events").insert({
      event_name: "checkout_started",
      creator_id: booking.creator_id,
      service_id: booking.service_id,
      user_id: user.id,
      referral_code: typeof referralCode === "string" ? referralCode : null,
      source,
      campaign,
    });

    await sendBookingEmail("booking_created", booking.id);

    res.status(200).json({ url: session.url });
    return;
  }

  const { data: product, error: productError } = await supabase
    .from("taste_products")
    .select("id,creator_id,title,price_cents,currency,status,access_type")
    .eq("id", referenceId)
    .maybeSingle();

  if (productError || !product || product.status !== "published" || product.access_type !== "paid") {
    res.status(404).json({ message: "This paid edit is not available for checkout." });
    return;
  }

  const { data: existingEntitlement } = await supabase
    .from("product_entitlements")
    .select("id")
    .eq("customer_id", user.id)
    .eq("product_id", product.id)
    .is("revoked_at", null)
    .maybeSingle();

  if (existingEntitlement) {
    res.status(409).json({ message: "You already have access to this edit." });
    return;
  }

  const { data: referral } = referralCode
    ? await supabase
        .from("creator_referral_links")
        .select("creator_id,code")
        .eq("code", referralCode)
        .eq("active", true)
        .maybeSingle()
    : { data: null };

  const purchaseInsert = {
    customer_id: user.id,
    product_id: product.id,
    payment_status: "requires_payment",
    amount_cents: product.price_cents,
    currency: product.currency,
    referral_creator_id: referral?.creator_id ?? null,
    referral_code: referral?.code ?? null,
    source,
    campaign,
  };
  let { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert(purchaseInsert)
    .select("id")
    .single();

  if (purchaseError?.code === "42703") {
    const { source: _source, campaign: _campaign, ...legacyPurchaseInsert } = purchaseInsert;
    const retry = await supabase.from("purchases").insert(legacyPurchaseInsert).select("id").single();
    purchase = retry.data;
    purchaseError = retry.error;
  }

  if (purchaseError || !purchase) {
    res.status(500).json({ message: purchaseError?.message || "Purchase could not be created." });
    return;
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" });
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: product.currency,
          unit_amount: product.price_cents,
          product_data: {
            name: `ByTaste ${product.title}`,
          },
        },
      },
    ],
    metadata: {
      checkoutType: "taste_product",
      purchaseId: purchase.id,
      productId: product.id,
      creatorId: product.creator_id,
      customerId: user.id,
      referralCode: referral?.code ?? "",
      source: source ?? "",
      campaign: campaign ?? "",
    },
    success_url: `${appUrl}/library/edits/${purchase.id}?checkout=success`,
    cancel_url: `${appUrl}/library?checkout=cancelled`,
  });

  const { error: updateError } = await supabase
    .from("purchases")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", purchase.id);

  if (updateError) {
    res.status(500).json({ message: updateError.message });
    return;
  }

  await supabase.from("commerce_events").insert({
    event_name: "checkout_started",
    creator_id: product.creator_id,
    product_id: product.id,
    user_id: user.id,
    referral_code: referral?.code ?? null,
    source,
    campaign,
  });

  res.status(200).json({ url: session.url });
}
