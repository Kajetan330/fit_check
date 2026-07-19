import Stripe from "stripe";
import { getSupabaseAdmin } from "./_supabaseAdmin.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    res.status(501).json({ message: "Stripe webhook is not configured." });
    return;
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" });
  const signature = req.headers["stripe-signature"];

  try {
    const rawBody = await readRawBody(req);
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error: eventInsertError } = await supabase.from("stripe_events").insert({
        id: event.id,
        event_type: event.type,
      });

      if (eventInsertError?.code === "23505") {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      if (eventInsertError && eventInsertError.code !== "42P01") {
        console.error("ByTaste Stripe event log failed", eventInsertError.message);
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const checkoutType = session.metadata?.checkoutType;

      if (supabase && checkoutType === "taste_product" && session.metadata?.purchaseId) {
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

        const { data: purchase, error: purchaseReadError } = await supabase
          .from("purchases")
          .select("id,customer_id,product_id,amount_cents,currency")
          .eq("id", session.metadata.purchaseId)
          .maybeSingle();

        if (purchaseReadError || !purchase) {
          console.error("ByTaste purchase lookup failed", purchaseReadError?.message ?? "missing purchase");
        } else if (session.amount_total !== purchase.amount_cents || session.currency !== purchase.currency) {
          console.error("ByTaste purchase amount mismatch", {
            purchaseId: purchase.id,
            expected: `${purchase.amount_cents} ${purchase.currency}`,
            actual: `${session.amount_total} ${session.currency}`,
          });
        } else {
          const { error: purchaseUpdateError } = await supabase
            .from("purchases")
            .update({
              payment_status: "paid",
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId,
              purchased_at: new Date().toISOString(),
              raw_event: event as unknown as Record<string, unknown>,
            })
            .eq("id", purchase.id);

          if (purchaseUpdateError) {
            console.error("ByTaste purchase update failed", purchaseUpdateError.message);
          } else {
            const { data: existingEntitlement } = await supabase
              .from("product_entitlements")
              .select("id")
              .eq("customer_id", purchase.customer_id)
              .eq("product_id", purchase.product_id)
              .is("revoked_at", null)
              .maybeSingle();

            const { error: entitlementError } = existingEntitlement
              ? await supabase
                  .from("product_entitlements")
                  .update({ purchase_id: purchase.id })
                  .eq("id", existingEntitlement.id)
              : await supabase.from("product_entitlements").insert({
                  customer_id: purchase.customer_id,
                  product_id: purchase.product_id,
                  purchase_id: purchase.id,
                });

            if (entitlementError) {
              console.error("ByTaste entitlement grant failed", entitlementError.message);
            }

            await supabase.from("commerce_events").insert({
              event_name: "checkout_completed",
              creator_id: session.metadata?.creatorId || null,
              product_id: purchase.product_id,
              user_id: purchase.customer_id,
              referral_code: session.metadata?.referralCode || null,
              source: session.metadata?.source || null,
              campaign: session.metadata?.campaign || null,
              metadata: { purchaseId: purchase.id },
            });
          }
        }

        res.status(200).json({ received: true });
        return;
      }

      if (supabase && checkoutType === "booking" && session.metadata?.bookingId) {
        const { error: bookingUpdateError } = await supabase
          .from("bookings")
          .update({
            payment_status: "paid",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id:
              typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
          })
          .eq("id", session.metadata.bookingId);

        if (bookingUpdateError) {
          console.error("ByTaste booking payment update failed", bookingUpdateError.message);
        }

        await supabase.from("commerce_events").insert({
          event_name: "checkout_completed",
          creator_id: session.metadata.creatorId || null,
          service_id: session.metadata.serviceId || null,
          user_id: session.metadata.customerId || null,
          referral_code: session.metadata.referralCode || null,
          source: session.metadata.source || null,
          campaign: session.metadata.campaign || null,
          metadata: { bookingId: session.metadata.bookingId },
        });

        res.status(200).json({ received: true });
        return;
      }

      const bookingReference = session.metadata?.bookingId;

      if (supabase && bookingReference) {
        const { error } = await supabase
          .from("checkout_sessions")
          .update({
            payment_status: "paid",
            stripe_payment_intent_id:
              typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
            raw_event: event as unknown as Record<string, unknown>,
          })
          .eq("booking_reference", bookingReference);

        if (error) {
          console.error("ByTaste checkout session update failed", error.message);
        }
      }

      console.info("ByTaste checkout completed", session.metadata);
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      if (supabase) {
        await supabase
          .from("bookings")
          .update({
            payment_status: "failed",
            stripe_payment_intent_id: paymentIntent.id,
          })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        await supabase
          .from("purchases")
          .update({
            payment_status: "failed",
            stripe_payment_intent_id: paymentIntent.id,
            raw_event: event as unknown as Record<string, unknown>,
          })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        const { error } = await supabase
          .from("checkout_sessions")
          .update({
            payment_status: "failed",
            raw_event: event as unknown as Record<string, unknown>,
          })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        if (error) {
          console.error("ByTaste payment failure update failed", error.message);
        }
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;

      if (supabase && paymentIntentId) {
        await supabase
          .from("bookings")
          .update({
            payment_status: "refunded",
          })
          .eq("stripe_payment_intent_id", paymentIntentId);

        const { data: refundedPurchases } = await supabase
          .from("purchases")
          .update({
            payment_status: "refunded",
            raw_event: event as unknown as Record<string, unknown>,
          })
          .eq("stripe_payment_intent_id", paymentIntentId)
          .select("id");

        if (refundedPurchases?.length) {
          await supabase
            .from("product_entitlements")
            .update({ revoked_at: new Date().toISOString() })
            .in(
              "purchase_id",
              refundedPurchases.map((purchase) => purchase.id),
            );
        }

        const { error } = await supabase
          .from("checkout_sessions")
          .update({
            payment_status: "refunded",
            raw_event: event as unknown as Record<string, unknown>,
          })
          .eq("stripe_payment_intent_id", paymentIntentId);

        if (error) {
          console.error("ByTaste refund update failed", error.message);
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook payload.";
    res.status(400).json({ message });
  }
}
