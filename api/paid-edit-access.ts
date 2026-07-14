import { getRequester } from "./_auth.js";

const setCorsHeaders = (res: any, appUrl: string) => {
  res.setHeader("Access-Control-Allow-Origin", appUrl);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!appUrl) {
    res.status(501).json({ state: "network_error", message: "App URL is not configured." });
    return;
  }

  const purchaseId = typeof req.query?.purchaseId === "string" ? req.query.purchaseId : "";
  if (!purchaseId) {
    res.status(400).json({ state: "missing_purchase", message: "Missing purchaseId." });
    return;
  }

  const { supabase, user } = await getRequester(req);
  if (!supabase) {
    res.status(501).json({ state: "network_error", message: "Supabase admin client is not configured." });
    return;
  }

  if (!user) {
    res.status(401).json({ state: "not_signed_in", message: "Sign in to open this edit." });
    return;
  }

  const { data: purchase, error } = await supabase
    .from("purchases")
    .select("id,customer_id,product_id,payment_status,amount_cents,currency,purchased_at")
    .eq("id", purchaseId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ state: "network_error", message: error.message });
    return;
  }

  if (!purchase) {
    res.status(404).json({ state: "missing_product", message: "Purchase was not found for this account." });
    return;
  }

  if (purchase.payment_status === "requires_payment") {
    res.status(402).json({ state: "purchase_pending", purchase });
    return;
  }

  if (purchase.payment_status === "refunded") {
    res.status(403).json({ state: "refunded", purchase });
    return;
  }

  if (purchase.payment_status !== "paid" && purchase.payment_status !== "released") {
    res.status(403).json({ state: "revoked", purchase });
    return;
  }

  const { data: entitlement } = await supabase
    .from("product_entitlements")
    .select("id,revoked_at")
    .eq("purchase_id", purchase.id)
    .eq("customer_id", user.id)
    .eq("product_id", purchase.product_id)
    .is("revoked_at", null)
    .maybeSingle();

  if (!entitlement) {
    res.status(403).json({ state: "revoked", purchase });
    return;
  }

  const [{ data: product }, { data: items }, { data: outfits }] = await Promise.all([
    supabase.from("taste_products").select("*").eq("id", purchase.product_id).maybeSingle(),
    supabase.from("taste_product_items").select("*").eq("product_id", purchase.product_id).order("sort_order"),
    supabase.from("taste_product_outfits").select("*").eq("product_id", purchase.product_id).order("sort_order"),
  ]);

  res.status(200).json({ state: "entitled", purchase, entitlement, product, items: items ?? [], outfits: outfits ?? [] });
}
