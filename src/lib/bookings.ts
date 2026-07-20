import { getStoredReferral } from "./sharing";
import { supabase } from "./supabase";

export interface CreateRemoteBookingInput {
  creatorHandle: string;
  serviceId: string;
  answers: Record<string, string>;
  closetItemIds: string[];
}

export async function createRemoteBooking(input: CreateRemoteBookingInput): Promise<{ ok: boolean; bookingId?: string; message: string }> {
  try {
    const referral = getStoredReferral();
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    const token = data.session?.access_token;
    const response = await fetch("/api/create-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        creatorHandle: input.creatorHandle,
        serviceId: input.serviceId,
        answers: input.answers,
        closetItemIds: input.closetItemIds,
        referralCode: referral?.code === "direct" ? undefined : referral?.code,
        source: referral?.source,
        campaign: referral?.campaign,
      }),
    });
    const payload = (await response.json()) as { bookingId?: string; message?: string };
    if (!response.ok || !payload.bookingId) {
      return { ok: false, message: payload.message || "Booking could not be created." };
    }
    return { ok: true, bookingId: payload.bookingId, message: "Booking created." };
  } catch {
    return { ok: false, message: "Booking could not be reached. Try again in a moment." };
  }
}

export async function recordBookingUpload(bookingId: string, storagePath: string, contentType?: string) {
  if (!supabase || !storagePath) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("booking_uploads").insert({
    booking_id: bookingId,
    user_id: data.user.id,
    storage_path: storagePath,
    content_type: contentType ?? null,
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadDraftImage(file: File, draftToken: string): Promise<{ ok: boolean; uploadId?: string; message: string }> {
  try {
    const data = await fileToBase64(file);
    const response = await fetch("/api/draft-uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftToken,
        contentType: file.type || "image/jpeg",
        data,
      }),
    });
    const payload = (await response.json()) as { uploadId?: string; message?: string };
    if (!response.ok || !payload.uploadId) {
      return { ok: false, message: payload.message || "Draft upload failed." };
    }
    return { ok: true, uploadId: payload.uploadId, message: "Uploaded." };
  } catch {
    return { ok: false, message: "Draft upload could not be reached." };
  }
}

export async function claimDraftUploads(draftToken: string, bookingId: string): Promise<{ ok: boolean; claimed: number; message: string }> {
  try {
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    const token = data.session?.access_token;
    const response = await fetch("/api/draft-uploads", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ draftToken, bookingId }),
    });
    const payload = (await response.json()) as { claimed?: number; message?: string };
    if (!response.ok) {
      return { ok: false, claimed: 0, message: payload.message || "Draft uploads could not be claimed." };
    }
    return { ok: true, claimed: payload.claimed ?? 0, message: "Draft uploads claimed." };
  } catch {
    return { ok: false, claimed: 0, message: "Draft uploads could not be reached." };
  }
}
