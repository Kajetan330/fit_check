import { createClient } from "@supabase/supabase-js";
import { appEnv, isSupabaseConfigured } from "./env";

export const supabase = isSupabaseConfigured
  ? createClient(appEnv.supabaseUrl!, appEnv.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export type SupabaseClientStatus = "connected" | "demo";

export const supabaseStatus: SupabaseClientStatus = supabase ? "connected" : "demo";
