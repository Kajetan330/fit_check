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
