import { sha256 } from "./_crypto.js";
import { getSupabaseAdmin } from "./_supabaseAdmin.js";
import { rateLimit } from "./_rateLimit.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const limited = rateLimit(req, "shared-resource", 60);
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    res.status(429).json({ state: "rate_limited", message: "Too many share-link requests." });
    return;
  }

  const token = typeof req.query?.token === "string" ? req.query.token : "";
  if (token.length < 24) {
    res.status(400).json({ state: "invalid", message: "Invalid share link." });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(501).json({ state: "network_error", message: "Supabase admin client is not configured." });
    return;
  }

  const { data: link, error } = await supabase
    .from("controlled_share_links")
    .select("id,resource_type,resource_id,expires_at,revoked_at,max_views,view_count")
    .eq("token_hash", sha256(token))
    .maybeSingle();

  if (error) {
    res.status(500).json({ state: "network_error", message: error.message });
    return;
  }

  if (!link || link.revoked_at) {
    res.status(404).json({ state: "revoked", message: "This share link is no longer active." });
    return;
  }

  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    res.status(410).json({ state: "expired", message: "This share link has expired." });
    return;
  }

  if (link.max_views && link.view_count >= link.max_views) {
    res.status(410).json({ state: "expired", message: "This share link has reached its view limit." });
    return;
  }

  await supabase.rpc("increment_share_view", { share_id: link.id });

  if (link.resource_type === "paid_edit") {
    const { data: product } = await supabase
      .from("taste_products")
      .select("id,title,subtitle,cover_url,preview_text,creator_id")
      .eq("id", link.resource_id)
      .maybeSingle();

    res.status(200).json({
      state: "active",
      resourceType: "paid_edit",
      resource: product
        ? {
            title: product.title,
            subtitle: product.subtitle,
            coverUrl: product.cover_url,
            previewText: product.preview_text,
          }
        : null,
    });
    return;
  }

  const { data: lookbook } = await supabase
    .from("lookbooks")
    .select("title,notes,published")
    .eq("id", link.resource_id)
    .maybeSingle();

  res.status(200).json({
    state: "active",
    resourceType: "lookbook",
    resource: lookbook?.published ? { title: lookbook.title, notes: lookbook.notes } : null,
  });
}
