import { randomUUID, createHash } from "node:crypto";
import { getRequester } from "./_auth.js";
import { rateLimit } from "./_rateLimit.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
  },
};

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const isDraftToken = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const extensionFor = (contentType: string) =>
  contentType === "image/png"
    ? "png"
    : contentType === "image/webp"
      ? "webp"
      : contentType === "image/heic" || contentType === "image/heif"
        ? "heic"
        : "jpg";

function decodeBase64(value: unknown): Buffer | null {
  if (typeof value !== "string") return null;
  const stripped = value.includes(",") ? value.split(",").pop() || "" : value;
  try {
    return Buffer.from(stripped, "base64");
  } catch {
    return null;
  }
}

function sniffImage(buffer: Buffer, contentType: string) {
  if (contentType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (contentType === "image/heic" || contentType === "image/heif") return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  return false;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST" && req.method !== "PUT") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const { supabase, user } = await getRequester(req);
  if (!supabase) {
    res.status(501).json({ message: "Supabase admin client is not configured." });
    return;
  }

  if (req.method === "POST") {
    const limited = rateLimit(req, "draft-uploads", 20, 60 * 60 * 1000);
    if (!limited.ok) {
      res.setHeader("Retry-After", String(limited.retryAfter));
      res.status(429).json({ message: "Too many draft uploads. Try again later." });
      return;
    }

    const { draftToken, contentType, data } = req.body || {};
    if (!isDraftToken(draftToken) || typeof contentType !== "string" || !ALLOWED_TYPES.has(contentType)) {
      res.status(400).json({ message: "Invalid draft upload." });
      return;
    }
    const buffer = decodeBase64(data);
    if (!buffer || buffer.length < 1 || buffer.length > MAX_BYTES || !sniffImage(buffer, contentType)) {
      res.status(400).json({ message: "Upload must be a valid image under 10 MB." });
      return;
    }

    const hash = tokenHash(draftToken);
    const { count } = await supabase
      .from("draft_uploads")
      .select("id", { count: "exact", head: true })
      .eq("draft_token_hash", hash);
    if ((count ?? 0) >= 8) {
      res.status(409).json({ message: "This draft already has the maximum number of uploads." });
      return;
    }

    const id = randomUUID();
    const storagePath = `drafts/${hash}/${id}.${extensionFor(contentType)}`;
    const { error: uploadError } = await supabase.storage
      .from("private-booking-uploads")
      .upload(storagePath, buffer, { contentType, upsert: false });
    if (uploadError) {
      res.status(500).json({ message: uploadError.message });
      return;
    }

    const { error } = await supabase.from("draft_uploads").insert({
      id,
      draft_token_hash: hash,
      storage_path: storagePath,
      content_type: contentType,
      byte_size: buffer.length,
    });
    if (error) {
      await supabase.storage.from("private-booking-uploads").remove([storagePath]);
      res.status(500).json({ message: error.message });
      return;
    }

    res.status(201).json({ uploadId: id });
    return;
  }

  if (!user) {
    res.status(401).json({ message: "Sign in before claiming draft uploads." });
    return;
  }

  const { draftToken, bookingId } = req.body || {};
  if (!isDraftToken(draftToken) || typeof bookingId !== "string") {
    res.status(400).json({ message: "Invalid draft claim." });
    return;
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id,customer_id")
    .eq("id", bookingId)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!booking) {
    res.status(403).json({ message: "You cannot claim uploads for this booking." });
    return;
  }

  const hash = tokenHash(draftToken);
  const { data: uploads, error } = await supabase
    .from("draft_uploads")
    .select("id,storage_path,content_type")
    .eq("draft_token_hash", hash)
    .is("claimed_booking_id", null);
  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  let claimed = 0;
  for (const upload of uploads ?? []) {
    const ext = upload.storage_path.split(".").pop() || "jpg";
    const finalPath = `${user.id}/${booking.id}/${upload.id}.${ext}`;
    const move = await supabase.storage.from("private-booking-uploads").move(upload.storage_path, finalPath);
    if (move.error) continue;
    const insert = await supabase.from("booking_uploads").insert({
      booking_id: booking.id,
      user_id: user.id,
      storage_path: finalPath,
      content_type: upload.content_type,
    });
    if (insert.error) continue;
    await supabase.from("draft_uploads").update({ claimed_booking_id: booking.id }).eq("id", upload.id);
    claimed += 1;
  }

  res.status(200).json({ claimed });
}
