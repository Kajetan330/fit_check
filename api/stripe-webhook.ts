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

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
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
          console.error("FitCheck checkout session update failed", error.message);
        }
      }

      console.info("FitCheck checkout completed", session.metadata);
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      if (supabase) {
        const { error } = await supabase
          .from("checkout_sessions")
          .update({
            payment_status: "failed",
            raw_event: event as unknown as Record<string, unknown>,
          })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        if (error) {
          console.error("FitCheck payment failure update failed", error.message);
        }
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;

      if (supabase && paymentIntentId) {
        const { error } = await supabase
          .from("checkout_sessions")
          .update({
            payment_status: "refunded",
            raw_event: event as unknown as Record<string, unknown>,
          })
          .eq("stripe_payment_intent_id", paymentIntentId);

        if (error) {
          console.error("FitCheck refund update failed", error.message);
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook payload.";
    res.status(400).json({ message });
  }
}
