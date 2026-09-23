import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS completely.
 *
 * Only for things RLS deliberately forbids — chiefly the owner creating staff
 * accounts via auth.admin. Never import this into a Client Component, and
 * never use it as a shortcut around a policy that is merely inconvenient.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient() was called in the browser. The service-role key must never reach the client.",
    );
  }

  return createSupabaseClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
