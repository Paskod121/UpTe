"use strict";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

let _client = null;

export async function getSupabaseClient() {
  if (_client) return _client;
  const { createClient } =
    await import("https://esm.sh/@supabase/supabase-js@2");
  _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}
