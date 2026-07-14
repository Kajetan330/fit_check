import type { Session } from "@supabase/supabase-js";
import type { Role, User } from "../types";
import { supabase } from "./supabase";

const CALLBACK_PATH = "/auth/callback";
export const AUTH_REDIRECT_KEY = "fitcheck-auth-redirect";

const callbackUrl = (redirect: string) =>
  `${window.location.origin}${CALLBACK_PATH}?next=${encodeURIComponent(redirect)}`;

export function rememberAuthRedirect(redirect: string) {
  try {
    sessionStorage.setItem(AUTH_REDIRECT_KEY, redirect);
  } catch {
    // sessionStorage unavailable (private mode edge cases) — callback falls back to "/"
  }
}

export function consumeAuthRedirect(): string {
  try {
    const value = sessionStorage.getItem(AUTH_REDIRECT_KEY);
    sessionStorage.removeItem(AUTH_REDIRECT_KEY);
    return value || "/";
  } catch {
    return "/";
  }
}

export async function signInWithGoogle(redirect: string): Promise<{ ok: boolean; message?: string }> {
  if (!supabase) return { ok: false, message: "Sign-in is not available right now." };
  rememberAuthRedirect(redirect);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(redirect) },
  });
  if (error) {
    return {
      ok: false,
      message: "Google sign-in is not available yet. Use your email below instead.",
    };
  }
  return { ok: true };
}

export async function sendMagicLink(email: string, redirect: string): Promise<{ ok: boolean; message: string }> {
  if (!supabase) return { ok: false, message: "Sign-in is not available right now." };
  rememberAuthRedirect(redirect);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl(redirect) },
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, message: `We sent a sign-in link to ${email}. Open it on this device to continue.` };
}

export async function supabaseSignOut() {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    // Session may already be gone; local state is cleared by the caller.
  }
}

/**
 * Map a Supabase session to the app User. Attempts to read the profiles row
 * (role, display name); degrades gracefully to email-derived values when the
 * profiles migration has not been run yet.
 */
export async function userFromSession(session: Session): Promise<User> {
  const email = session.user.email ?? "";
  const fallbackName =
    (session.user.user_metadata?.full_name as string | undefined) ||
    (email ? email.split("@")[0] : "ByTaste member");

  let role: Role = "customer";
  let name = fallbackName;

  if (supabase) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (data) {
        if (data.display_name) name = data.display_name;
        if (data.role === "creator" || data.role === "admin") role = data.role;
      }
    } catch {
      // profiles table missing or RLS mismatch — fall back to defaults.
    }
  }

  return {
    name,
    email,
    role,
    mode: role === "creator" ? "studio" : "browse",
    supabaseId: session.user.id,
  };
}
