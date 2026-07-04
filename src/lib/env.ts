export const appEnv = {
  appUrl: import.meta.env.VITE_APP_URL || window.location.origin,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
};

export const isSupabaseConfigured = Boolean(appEnv.supabaseUrl && appEnv.supabaseAnonKey);
