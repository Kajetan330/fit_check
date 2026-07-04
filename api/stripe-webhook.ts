import Stripe from "stripe";

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

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      // Production hook: mark booking payment_status as paid and create a payout ledger row.
      // Requires SUPABASE_SERVICE_ROLE_KEY and the schema in supabase/migrations.
      console.info("FitCheck checkout completed", session.metadata);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook payload.";
    res.status(400).json({ message });
  }
}
