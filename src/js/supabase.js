"use strict";

let _client = null;
let _config = null;
const CONFIG_KEY = "upte_config_cache";

async function getConfig() {
  if (_config) return _config;

  // Cache sessionStorage
  try {
    const cached = sessionStorage.getItem(CONFIG_KEY);
    if (cached) {
      _config = JSON.parse(cached);
      return _config;
    }
  } catch {}

  // API Vercel (production)
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      _config = await res.json();
      try {
        sessionStorage.setItem(CONFIG_KEY, JSON.stringify(_config));
      } catch {}
      return _config;
    }
  } catch {}

  // Fallback local (développement uniquement)
  const { SUPABASE_URL, SUPABASE_KEY } = await import("./config.js");
  _config = { url: SUPABASE_URL, key: SUPABASE_KEY };
  return _config;
}

export async function getSupabaseClient() {
  if (_client) return _client;
  const { url: SUPABASE_URL, key: SUPABASE_KEY } = await getConfig();
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
