import { createClient } from "@supabase/supabase-js";
import config from "./config.js";

let cachedClient = null;

function getSupabaseClient() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}

export { getSupabaseClient };
