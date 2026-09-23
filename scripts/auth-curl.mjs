/**
 * Prints a Cookie header for a signed-in staff member, so routes can be
 * exercised with curl exactly as a browser would hit them.
 *
 * Uses @supabase/ssr itself to produce the cookies, rather than guessing at
 * the encoding.
 *
 * Usage:  node --env-file=.env.local scripts/auth-curl.mjs <email>
 */
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const email = process.argv[2];
if (!email) {
  console.error("usage: node scripts/auth-curl.mjs <email>");
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const { data: link, error: lErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
});
if (lErr) throw lErr;

const jar = [];
const supabase = createServerClient(URL, ANON, {
  cookies: {
    getAll: () => [],
    setAll: (cookies) => jar.push(...cookies),
  },
});

const { error } = await supabase.auth.verifyOtp({
  email,
  token: link.properties.email_otp,
  type: "email",
});
if (error) throw error;

process.stdout.write(jar.map((c) => `${c.name}=${c.value}`).join("; "));
