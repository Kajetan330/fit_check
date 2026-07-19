import { track } from "@vercel/analytics";
import { getStoredReferral } from "./sharing";
import { supabase } from "./supabase";

export type AnalyticsEventName =
  | "creator_link_opened"
  | "storefront_viewed"
  | "primary_offer_clicked"
  | "service_viewed"
  | "booking_started"
  | "brief_completed"
  | "auth_completed"
  | "delivery_approved"
  | "repeat_booking_started";

const ANON_SESSION_KEY = "fitcheck:anon-session:v1";

const getAnonymousSessionId = () => {
  if (typeof window === "undefined") return "server-anonymous-session";
  try {
    const existing = localStorage.getItem(ANON_SESSION_KEY);
    if (existing && /^[a-z0-9-]{16,64}$/i.test(existing)) return existing;
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 18)}`;
    localStorage.setItem(ANON_SESSION_KEY, next);
    return next;
  } catch {
    return `anon-${Date.now().toString(36)}`;
  }
};

export async function trackEvent(
  eventName: AnalyticsEventName,
  props: {
    creatorHandle?: string;
    productSlug?: string;
    serviceId?: string;
    referralCode?: string;
    source?: string;
    campaign?: string;
    path?: string;
  } = {},
) {
  track(eventName, props);

  try {
    const storedReferral = getStoredReferral();
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    const token = data.session?.access_token;
    await fetch("/api/track-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        eventName,
        anonymousSessionId: getAnonymousSessionId(),
        path: props.path ?? `${window.location.pathname}${window.location.search}`,
        referralCode: props.referralCode ?? storedReferral?.code,
        source: props.source ?? storedReferral?.source,
        campaign: props.campaign ?? storedReferral?.campaign,
        creatorHandle: props.creatorHandle,
        productSlug: props.productSlug,
        serviceId: props.serviceId,
      }),
      keepalive: true,
    });
  } catch {
    // Analytics is intentionally best effort and must never block conversion.
  }
}
