import { createClient } from "@supabase/supabase-js";
import config from "./config.js";

function getSupabaseClient() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    return null;
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

export { getSupabaseClient };
