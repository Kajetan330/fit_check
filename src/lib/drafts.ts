export type BookingStep = "service" | "goal" | "photos" | "review" | "pay";

export interface GuestBookingDraft {
  version: 1;
  handle: string;
  serviceId: string;
  draftToken: string;
  step: BookingStep;
  answers: Record<string, string>;
  closetItemIds: string[];
  uploads: Array<{ name: string; size: number; localId: string; uploadId?: string }>;
  updatedAt: string;
}

const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const draftKey = (handle: string, serviceId: string) =>
  `fitcheck:guest-booking-draft:v1:${handle}:${serviceId}`;

export function createDraftToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const isBookingStep = (value: unknown): value is BookingStep =>
  value === "service" || value === "goal" || value === "photos" || value === "review" || value === "pay";

export function saveDraft(draft: GuestBookingDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(draftKey(draft.handle, draft.serviceId), JSON.stringify(draft));
  } catch {
    // Drafts are a convenience only; checkout must still work without them.
  }
}

export function loadDraft(handle: string, serviceId: string): GuestBookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftKey(handle, serviceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestBookingDraft>;
    if (
      parsed.version !== 1 ||
      parsed.handle !== handle ||
      parsed.serviceId !== serviceId ||
      !isBookingStep(parsed.step) ||
      !parsed.updatedAt ||
      Date.now() - new Date(parsed.updatedAt).getTime() > DRAFT_TTL_MS
    ) {
      return null;
    }
    return {
      version: 1,
      handle,
      serviceId,
      draftToken:
        typeof parsed.draftToken === "string" && /^[a-f0-9]{64}$/i.test(parsed.draftToken)
          ? parsed.draftToken
          : createDraftToken(),
      step: parsed.step,
      answers: parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {},
      closetItemIds: Array.isArray(parsed.closetItemIds) ? parsed.closetItemIds.filter(Boolean) : [],
      uploads: Array.isArray(parsed.uploads)
        ? parsed.uploads
            .filter((item) => item && typeof item.name === "string" && typeof item.size === "number")
            .map((item) => ({
              name: item.name,
              size: item.size,
              localId: item.localId || `${item.name}-${item.size}`,
              uploadId: typeof item.uploadId === "string" ? item.uploadId : undefined,
            }))
        : [],
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function clearDraft(handle: string, serviceId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(draftKey(handle, serviceId));
  } catch {
    // Non-critical cleanup.
  }
}
