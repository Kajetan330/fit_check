import { appEnv } from "./env";
import shareConfig from "../../share.config.json";

const REFERRAL_KEY = "fitcheck:referral:v1";
const REFERRAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LAST_CREATOR_KEY = "fitcheck:last-creator:v1";

export type ShareDestination = { type: "service" | "edit"; idOrSlug: string };

export interface StoredReferral {
  code: string;
  creatorHandle?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  landingPath?: string;
  capturedAt: number;
}

const isRecent = (referral: StoredReferral) => Date.now() - referral.capturedAt < REFERRAL_TTL_MS;

const currentLandingPath = () =>
  typeof window === "undefined" ? undefined : `${window.location.pathname}${window.location.search}`;

const creatorHandleFromPath = (path: string) => {
  const match = path.match(/^\/(?:c|creator)\/([^/?#]+)/);
  return match?.[1];
};

/**
 * Attribution rule: first touch wins for the same creator for seven days.
 * A fresh referral for a different creator replaces the stored referral, so
 * social traffic remains attached to the creator whose link the visitor most
 * recently opened.
 */
export function captureReferral(search: string) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(search);
  const code = params.get("ref")?.trim();
  const source = params.get("source") ?? params.get("utm_source") ?? undefined;
  const campaign = params.get("campaign") ?? params.get("utm_campaign") ?? undefined;
  const landingPath = currentLandingPath();
  const creatorHandle = landingPath ? creatorHandleFromPath(landingPath) : undefined;
  const existing = getStoredReferral();

  if (!code && !source && !campaign) return;
  if (existing && isRecent(existing) && existing.creatorHandle === creatorHandle) return;

  const referral: StoredReferral = {
    code: code || existing?.code || "direct",
    creatorHandle,
    source,
    medium: params.get("utm_medium") ?? undefined,
    campaign,
    landingPath,
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

export function rememberLastCreator(handle: string) {
  if (typeof window === "undefined" || !handle) return;
  try {
    localStorage.setItem(LAST_CREATOR_KEY, handle);
  } catch {
    // Non-critical continuity helper.
  }
}

export function getLastCreator() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(LAST_CREATOR_KEY) || "";
  } catch {
    return "";
  }
}

export function createCreatorShareUrl(opts: {
  handle: string;
  destination?: ShareDestination;
  source?: string;
  campaign?: string;
  referralCode?: string;
}): string {
  const base = opts.destination
    ? opts.destination.type === "service"
      ? `/c/${opts.handle}/service/${opts.destination.idOrSlug}`
      : `/creator/${opts.handle}/edit/${opts.destination.idOrSlug}`
    : `/c/${opts.handle}`;
  const params = new URLSearchParams();
  if (opts.referralCode) params.set("ref", opts.referralCode);
  if (opts.source) params.set("source", opts.source);
  if (opts.campaign) params.set("campaign", opts.campaign);
  const query = params.toString();
  return `${appEnv.appUrl}${base}${query ? `?${query}` : ""}`;
}

export function safeRedirectPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function sharePageUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function creatorSharePagePath(handle: string) {
  return `/share/creator-${handle}.html`;
}

export function creatorShareImagePath(handle: string, fallback?: string) {
  return (
    (shareConfig.creators as Record<string, { image?: string }>)[handle]?.image ||
    fallback ||
    "/brand/bytaste-og-default.png"
  );
}

export function editSharePath(handle: string, slug: string) {
  return `/share/edit-${handle}-${slug}.html`;
}

export function serviceSharePath(handle: string, serviceId: string) {
  return `/c/${handle}/service/${serviceId}`;
}
