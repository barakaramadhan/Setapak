// Client Supabase untuk browser.
// URL + anon key AMAN dikirim ke browser; RLS yang menjaga data tiap user.
// Service-role key tetap hanya dipakai server (chat/planner store).

import { createClient } from "@supabase/supabase-js";

const url = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseReady = Boolean(url && anonKey);

export const supabase = isSupabaseReady
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
