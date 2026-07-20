import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppState, Booking, ClosetItem, CreatorApplication, CreatorDraft, Post, Role, User } from "./types";
import { bookingSeed, closetSeed, entitlementSeed, purchaseSeed } from "./data";
import { supabaseSignOut, userFromSession } from "./lib/auth";
import { supabase } from "./lib/supabase";

const STORAGE_KEY = "fitcheck-state-v1";
export const demoMode = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === "true";
const SEED_IDS = new Set(
  [...bookingSeed, ...closetSeed, ...purchaseSeed, ...entitlementSeed].map((item) => item.id),
);

const defaultState: AppState = {
  user: null,
  savedCreatorHandles: [],
  savedPostIds: [],
  closet: demoMode ? closetSeed : [],
  bookings: demoMode ? bookingSeed : [],
  creatorApplications: demoMode
    ? [
        {
          id: "application-demo-01",
          handle: "city-archive",
          aesthetic: "plus-size city capsule",
          links: "instagram.com/cityarchive",
          status: "reviewing",
          createdAt: "2026-07-01",
        },
      ]
    : [],
  creatorDrafts: {},
  studioPosts: [],
  purchases: demoMode ? purchaseSeed : [],
  entitlements: demoMode ? entitlementSeed : [],
};

interface AppStateContextValue {
  state: AppState;
  signIn: (name: string, role: Role, email?: string) => void;
  signOut: () => void;
  setMode: (mode: User["mode"]) => void;
  toggleCreator: (handle: string) => void;
  togglePost: (postId: string) => void;
  addClosetItem: (item: ClosetItem) => void;
  addBooking: (booking: Booking) => void;
  updateBookingStatus: (bookingId: string, status: Booking["status"]) => void;
  updateBookingPaymentStatus: (bookingId: string, paymentStatus: NonNullable<Booking["paymentStatus"]>) => void;
  addCreatorApplication: (application: CreatorApplication) => void;
  updateCreatorApplicationStatus: (applicationId: string, status: CreatorApplication["status"]) => void;
  saveCreatorDraft: (handle: string, draft: CreatorDraft) => void;
  addStudioPost: (post: Post) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

const loadState = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const closet = parsed.closet ?? defaultState.closet;
    const bookings = parsed.bookings ?? defaultState.bookings;
    const purchases = parsed.purchases ?? defaultState.purchases;
    const entitlements = parsed.entitlements ?? defaultState.entitlements;
    return {
      ...defaultState,
      ...parsed,
      closet: demoMode ? closet : closet.filter((item) => !SEED_IDS.has(item.id)),
      bookings: demoMode ? bookings : bookings.filter((item) => !SEED_IDS.has(item.id)),
      creatorApplications: parsed.creatorApplications ?? defaultState.creatorApplications,
      creatorDrafts: parsed.creatorDrafts ?? defaultState.creatorDrafts,
      studioPosts: parsed.studioPosts ?? defaultState.studioPosts,
      purchases: demoMode ? purchases : purchases.filter((item) => !SEED_IDS.has(item.id)),
      entitlements: demoMode ? entitlements : entitlements.filter((item) => !SEED_IDS.has(item.id)),
    };
  } catch {
    return defaultState;
  }
};

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    // Identity is never persisted here: Supabase owns real sessions, and demo
    // users are intentionally ephemeral per-tab.
    const { user: _omitted, ...persistable } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  }, [state]);

  // Real identity: mirror the Supabase session into app state. Demo sign-in
  // (no supabaseId) is left untouched so local prototype flows keep working.
  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    const applySession = async (session: import("@supabase/supabase-js").Session | null) => {
      if (cancelled) return;
      if (session) {
        const user = await userFromSession(session);
        if (cancelled) return;
        setState((current) => ({
          ...current,
          user:
            current.user && current.user.supabaseId === user.supabaseId
              ? { ...user, mode: current.user.mode }
              : user,
        }));
      } else {
        setState((current) => (current.user?.supabaseId ? { ...current, user: null } : current));
      }
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AppStateContextValue>(
    () => ({
      state,
      signIn: (name, role, email) => {
        setState((current) => ({
          ...current,
          user: {
            name: name.trim() || "Maya",
            email: email?.trim() || undefined,
            role,
            mode: role === "creator" || role === "admin" ? "studio" : "browse",
          },
        }));
      },
      signOut: () => {
        void supabaseSignOut();
        setState((current) => ({ ...current, user: null }));
      },
      setMode: (mode) => {
        setState((current) => ({
          ...current,
          user: current.user ? { ...current.user, mode } : current.user,
        }));
      },
      toggleCreator: (handle) => {
        setState((current) => {
          const exists = current.savedCreatorHandles.includes(handle);
          return {
            ...current,
            savedCreatorHandles: exists
              ? current.savedCreatorHandles.filter((saved) => saved !== handle)
              : [...current.savedCreatorHandles, handle],
          };
        });
      },
      togglePost: (postId) => {
        setState((current) => {
          const exists = current.savedPostIds.includes(postId);
          return {
            ...current,
            savedPostIds: exists
              ? current.savedPostIds.filter((saved) => saved !== postId)
              : [...current.savedPostIds, postId],
          };
        });
      },
      addClosetItem: (item) => setState((current) => ({ ...current, closet: [item, ...current.closet] })),
      addBooking: (booking) =>
        setState((current) => ({ ...current, bookings: [booking, ...current.bookings] })),
      updateBookingStatus: (bookingId, status) => {
        setState((current) => ({
          ...current,
          bookings: current.bookings.map((booking) =>
            booking.id === bookingId ? { ...booking, status } : booking,
          ),
        }));
      },
      updateBookingPaymentStatus: (bookingId, paymentStatus) => {
        setState((current) => ({
          ...current,
          bookings: current.bookings.map((booking) =>
            booking.id === bookingId ? { ...booking, paymentStatus } : booking,
          ),
        }));
      },
      addCreatorApplication: (application) =>
        setState((current) => ({
          ...current,
          creatorApplications: [application, ...current.creatorApplications],
        })),
      updateCreatorApplicationStatus: (applicationId, status) =>
        setState((current) => ({
          ...current,
          creatorApplications: current.creatorApplications.map((application) =>
            application.id === applicationId ? { ...application, status } : application,
          ),
        })),
      saveCreatorDraft: (handle, draft) =>
        setState((current) => ({
          ...current,
          creatorDrafts: { ...current.creatorDrafts, [handle]: draft },
        })),
      addStudioPost: (post) =>
        setState((current) => ({
          ...current,
          studioPosts: [post, ...current.studioPosts],
        })),
    }),
    [state],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }
  return context;
}
