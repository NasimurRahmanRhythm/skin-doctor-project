/**
 * Reads an environment variable, failing loudly at the point of use.
 *
 * Without this, a missing key surfaces later as an opaque "Invalid API key"
 * from Supabase, which is a much worse thing to debug than a named variable.
 *
 * SERVER ONLY. The dynamic process.env[name] lookup is exactly what the
 * bundler cannot inline, so NEXT_PUBLIC_* values read through here come back
 * undefined in the browser. Client Components must spell the variable out
 * literally instead — see lib/supabase/client.ts.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}
