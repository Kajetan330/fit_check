import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppState, Booking, ClosetItem, Role, User } from "./types";
import { bookingSeed, closetSeed } from "./data";

const STORAGE_KEY = "fitcheck-state-v1";

const defaultState: AppState = {
  user: null,
  savedCreatorHandles: ["amara-okafor"],
  savedPostIds: ["post-amara-01"],
  closet: closetSeed,
  bookings: bookingSeed,
};

interface AppStateContextValue {
  state: AppState;
  signIn: (name: string, role: Role) => void;
  signOut: () => void;
  setMode: (mode: User["mode"]) => void;
  toggleCreator: (handle: string) => void;
  togglePost: (postId: string) => void;
  addClosetItem: (item: ClosetItem) => void;
  addBooking: (booking: Booking) => void;
  updateBookingStatus: (bookingId: string, status: Booking["status"]) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

const loadState = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...defaultState,
      ...parsed,
      closet: parsed.closet?.length ? parsed.closet : defaultState.closet,
      bookings: parsed.bookings?.length ? parsed.bookings : defaultState.bookings,
    };
  } catch {
    return defaultState;
  }
};

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      state,
      signIn: (name, role) => {
        setState((current) => ({
          ...current,
          user: { name: name.trim() || "Maya", role, mode: role === "creator" ? "studio" : "browse" },
        }));
      },
      signOut: () => setState((current) => ({ ...current, user: null })),
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
