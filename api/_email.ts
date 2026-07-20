import { getSupabaseAdmin } from "./_supabaseAdmin.js";
import { bookingEmailTemplate, type EmailKind } from "./_emailTemplates.js";

async function recipientFor(kind: EmailKind, booking: any, creatorOwnerEmail?: string) {
  if (kind === "customer_message" || kind === "revision_requested" || kind === "booking_approved") {
    return creatorOwnerEmail || "";
  }
  return booking.customer_email || booking.customer?.email || "";
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function sendBookingEmail(kind: EmailKind, bookingId: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.VITE_APP_URL || "https://fit-check-ecru.vercel.app";
  if (!apiKey || !from) return false;

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;
    const { data: rawBooking } = await supabase
      .from("bookings")
      .select("id,customer_id,creator_id,profiles:customer_id(email),creator_profiles:creator_id(display_name,user_id)")
      .eq("id", bookingId)
      .maybeSingle();
    const booking = rawBooking as any;
    if (!booking) return false;

    const creatorProfile = firstRelated<any>(booking.creator_profiles);
    const customerProfile = firstRelated<any>(booking.profiles);
    const creatorName = creatorProfile?.display_name;
    let creatorOwnerEmail = "";
    if (creatorProfile?.user_id) {
      const { data } = await supabase.from("profiles").select("email").eq("id", creatorProfile.user_id).maybeSingle();
      creatorOwnerEmail = data?.email || "";
    }
    const to = await recipientFor(kind, { ...booking, customer_email: customerProfile?.email }, creatorOwnerEmail);
    if (!to) return false;

    const template = bookingEmailTemplate(kind, { appUrl, bookingId, creatorName });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: template.subject,
        text: template.text,
      }),
    });

    if (!response.ok) {
      console.error("ByTaste email failed", kind, bookingId, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("ByTaste email error", kind, bookingId, error instanceof Error ? error.message : error);
    return false;
  }
}
