import { getRequester, isAdmin } from "../_auth.js";
import { rateLimit } from "../_rateLimit.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.VITE_APP_URL || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(req: any, res: any) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const limited = rateLimit(req, "signed-media", 40);
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    res.status(429).json({ message: "Too many media requests. Try again shortly." });
    return;
  }

  const { supabase, user } = await getRequester(req);
  if (!supabase) {
    res.status(501).json({ message: "Supabase admin client is not configured." });
    return;
  }
  if (!user) {
    res.status(401).json({ message: "Sign in to view private media." });
    return;
  }

  const { bookingId, storagePath } = req.body || {};
  if (typeof bookingId !== "string" || typeof storagePath !== "string" || storagePath.includes("..")) {
    res.status(400).json({ message: "Invalid media request." });
    return;
  }

  const { data: upload } = await supabase
    .from("booking_uploads")
    .select("booking_id,user_id,storage_path")
    .eq("booking_id", bookingId)
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (!upload) {
    res.status(404).json({ message: "Upload was not found for this booking." });
    return;
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id,customer_id,creator_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    res.status(404).json({ message: "Booking was not found." });
    return;
  }

  const requesterIsCreator = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("id", booking.creator_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const allowed = booking.customer_id === user.id || Boolean(requesterIsCreator.data) || (await isAdmin(user.id));
  if (!allowed) {
    res.status(403).json({ message: "You are not allowed to view this upload." });
    return;
  }

  const expiresIn = 10 * 60;
  const { data, error } = await supabase.storage
    .from("private-booking-uploads")
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    res.status(500).json({ message: error?.message || "Signed URL could not be created." });
    return;
  }

  res.status(200).json({ signedUrl: data.signedUrl, expiresIn });
}
