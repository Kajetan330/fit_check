const REFERRAL_KEY = "fitcheck:referral:v1";
const REFERRAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredReferral {
  code: string;
  source?: string;
  medium?: string;
  campaign?: string;
  capturedAt: number;
}

const isRecent = (referral: StoredReferral) => Date.now() - referral.capturedAt < REFERRAL_TTL_MS;

export function captureReferral(search: string) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(search);
  const code = params.get("ref")?.trim();
  const existing = getStoredReferral();

  if (!code || (existing && isRecent(existing) && existing.code === code)) return;
  if (existing && isRecent(existing) && !params.get("utm_campaign")) return;

  const referral: StoredReferral = {
    code,
    source: params.get("utm_source") ?? undefined,
    medium: params.get("utm_medium") ?? undefined,
    campaign: params.get("utm_campaign") ?? undefined,
    capturedAt: Date.now(),
  };
  localStorage.setItem(REFERRAL_KEY, JSON.stringify(referral));
}

export function getStoredReferral(): StoredReferral | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REFERRAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReferral;
    if (!parsed.code || !isRecent(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function safeRedirectPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function sharePageUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function creatorSharePath(handle: string) {
  return `/share/creator-${handle}.html`;
}

export function editSharePath(handle: string, slug: string) {
  return `/share/edit-${handle}-${slug}.html`;
}

export function serviceSharePath(handle: string, serviceId: string) {
  return `/creator/${handle}/service/${serviceId}`;
}
