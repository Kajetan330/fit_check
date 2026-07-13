import { getSupabaseAdmin } from "./_supabaseAdmin.js";

export function getBearerToken(req: any) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (typeof header !== "string") return "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token ?? "" : "";
}

export async function getRequester(req: any) {
  const token = getBearerToken(req);
  const supabase = getSupabaseAdmin();
  if (!token || !supabase) return { supabase, user: null, token };

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { supabase, user: null, token };
  return { supabase, user: data.user, token };
}

export async function isAdmin(userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role === "admin";
}
