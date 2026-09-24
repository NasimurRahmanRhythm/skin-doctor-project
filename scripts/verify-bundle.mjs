/**
 * Checks what actually shipped to the browser.
 *
 * Guards two mistakes that no server-side test can catch, because scripts run
 * in Node where the real process.env exists:
 *   1. A NEXT_PUBLIC_* value read dynamically (process.env[name]) is not
 *      inlined by the bundler and is undefined in the browser.
 *   2. A server-only secret accidentally imported into a Client Component
 *      would be baked into a public chunk.
 *
 * Run after a build:  npm run build && npm run verify:bundle
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const CHUNK_DIR = ".next/static";

let failed = 0;
function pass(m) {
  console.log(`  PASS  ${m}`);
}
function fail(m, d) {
  console.log(`  FAIL  ${m}${d ? ` — ${d}` : ""}`);
  failed++;
}

function allFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...allFiles(p));
    else out.push(p);
  }
  return out;
}

let files;
try {
  files = allFiles(CHUNK_DIR).filter((f) => f.endsWith(".js"));
} catch {
  console.error(`\nNo ${CHUNK_DIR} found. Run "npm run build" first.\n`);
  process.exit(1);
}

const blob = files.map((f) => readFileSync(f, "utf8")).join("\n");

console.log("\nPublic config reached the browser");
{
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    fail("env not loaded", "run via npm run verify:bundle");
  } else {
    if (blob.includes(url)) pass("NEXT_PUBLIC_SUPABASE_URL is inlined");
    else fail("NEXT_PUBLIC_SUPABASE_URL missing from client chunks", "dynamic process.env lookup?");

    if (blob.includes(anon.slice(0, 40))) pass("NEXT_PUBLIC_SUPABASE_ANON_KEY is inlined");
    else fail("anon key missing from client chunks");
  }
}

console.log("\nSecrets stayed on the server");
{
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cron = process.env.CRON_SECRET;
  const resend = process.env.RESEND_API_KEY;

  const leaks = [
    ["service-role key", service],
    ["CRON_SECRET", cron],
    ["Resend API key", resend],
  ].filter(([, v]) => v && blob.includes(v));

  if (leaks.length === 0) pass("no server secret appears in any client chunk");
  else for (const [name] of leaks) fail(`${name} LEAKED into the client bundle`);

  if (!blob.includes('"service_role"') && !blob.includes("service_role")) {
    pass("no service_role JWT claim in client chunks");
  } else {
    fail("a service_role token appears in client chunks");
  }
}

console.log(failed === 0 ? `\nBundle looks right (${files.length} chunks scanned).\n` : `\n${failed} bundle check(s) FAILED.\n`);
process.exit(failed === 0 ? 0 : 1);
