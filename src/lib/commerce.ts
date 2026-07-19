import { getStoredReferral } from "./sharing";
import { supabase } from "./supabase";

/**
 * Paid-edit purchasing is frozen until the Supabase commerce migration (0003)
 * is applied and seeded. Flip on with VITE_COMMERCE_ENABLED="true" in Vercel.
 * Bookings are unaffected by this flag.
 */
export const isCommerceEnabled = import.meta.env.VITE_COMMERCE_ENABLED === "true";

export type CommerceCheckoutType = "booking" | "taste_product";

export interface CommerceCheckoutResult {
  ok: boolean;
  checkoutUrl?: string;
  message: string;
}

export async function createCommerceCheckout({
  checkoutType,
  referenceId,
}: {
  checkoutType: CommerceCheckoutType;
  referenceId: string;
}): Promise<CommerceCheckoutResult> {
  try {
    const referral = getStoredReferral();
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    const token = data.session?.access_token;
    const response = await fetch("/api/create-commerce-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        checkoutType,
        referenceId,
        referralCode: referral?.code === "direct" ? undefined : referral?.code,
        source: referral?.source,
        campaign: referral?.campaign,
      }),
    });
    const payload = (await response.json()) as { url?: string; message?: string };

    if (!response.ok || !payload.url) {
      return { ok: false, message: payload.message || "Checkout is not available for this item yet." };
    }

    return { ok: true, checkoutUrl: payload.url, message: "Checkout session created." };
  } catch {
    return { ok: false, message: "Checkout could not be reached. Try again in a moment." };
  }
}
