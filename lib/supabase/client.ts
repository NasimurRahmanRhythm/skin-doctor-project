import { createBrowserClient } from "@supabase/ssr";

/**
 * NEXT_PUBLIC_* values reach the browser only when the bundler can see them
 * written out literally, so it can substitute the value at build time. Reading
 * them through a helper that does process.env[name] is a dynamic lookup: it
 * works on the server and is silently undefined in the client bundle.
 *
 * That is why these two are spelled out here instead of going through
 * requireEnv() like the server-side clients do.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client for Client Components.
 *
 * Uses the anon key, so every query is subject to RLS — this client can only
 * ever see what the signed-in staff member is allowed to see.
 */
export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in the client bundle. Set them in .env.local and restart the dev server.",
    );
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
