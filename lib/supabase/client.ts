import { createBrowserClient } from "@supabase/ssr";
import { requireEnv } from "@/lib/env";

/**
 * Supabase client for Client Components.
 *
 * Uses the anon key, so every query is subject to RLS — this client can only
 * ever see what the signed-in staff member is allowed to see.
 */
export function createClient() {
  return createBrowserClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
