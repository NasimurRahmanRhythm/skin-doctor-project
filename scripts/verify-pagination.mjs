/**
 * Proves the owner table pages correctly, with enough rows that it matters.
 *
 * Creates 70 throwaway visits, walks the pages through the real HTTP route as
 * the owner, then deletes them. Checking the query alone would miss the page
 * links, and checking the page with 2 rows would prove nothing.
 *
 * Needs the dev or prod server running on PORT (default 3000).
 * Run with:  npm run verify:pagination
 */
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = `http://localhost:${process.env.PORT ?? 3000}`;
const PER_PAGE = 30;
const TOTAL = 70;

const admin = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false } });

let failed = 0;
function pass(m) {
  console.log(`  PASS  ${m}`);
}
function fail(m, d) {
  console.log(`  FAIL  ${m}${d ? ` — ${d}` : ""}`);
  failed++;
}

async function ownerCookie() {
  const email = "rhythm4538+owner@gmail.com";
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;

  const jar = [];
  const c = createServerClient(SUPA_URL, ANON, {
    cookies: { getAll: () => [], setAll: (cs) => jar.push(...cs) },
  });
  const { error: vErr } = await c.auth.verifyOtp({
    email,
    token: data.properties.email_otp,
    type: "email",
  });
  if (vErr) throw vErr;
  return jar.map((x) => `${x.name}=${x.value}`).join("; ");
}

/**
 * The visit codes on a page.
 *
 * Counting <tr> inside <tbody> looks obvious and is wrong: the dev server
 * streams the table, so most rows arrive in later flushes that sit outside the
 * original <tbody> in the raw response — a 30-row page shipped 5 <tr> tags
 * there and 30 patient links elsewhere in the document. Scanning the whole
 * document for codes is stable either way, and a re-flushed chunk collapses
 * into the Set instead of counting twice.
 *
 * The search box placeholder carries a sample code, so it is stripped first.
 */
function visitCodes(html) {
  const withoutPlaceholders = html.replace(/placeholder="[^"]*"/g, "");
  return new Set(withoutPlaceholders.match(/LL-\d{6}-\d{3}/g) ?? []);
}

/**
 * Only the probe visits count. The search box placeholder carries a sample
 * code and ships again inside the RSC payload, so any "codes on the page"
 * measure picks up one phantom row on every page — including page 99, which
 * has no rows at all. Intersecting with the fixtures also makes the test
 * immune to unrelated visits sitting in the database.
 */
function countRows(html, probes) {
  let n = 0;
  for (const code of visitCodes(html)) if (probes.has(code)) n++;
  return n;
}

/**
 * React splits interpolated text into separate nodes and marks the seams with
 * `<!-- -->`, so "Page {page} of {lastPage}" ships as
 * `Page <!-- -->1<!-- --> of <!-- -->3`. Strip the markers before matching.
 */
function text(html) {
  return html.replace(/<!--\s*-->/g, "");
}

const cookie = await ownerCookie();

// ---- fixtures ----------------------------------------------------------
const PHONE = "01911100222";
await admin.from("patients").delete().eq("phone", PHONE);

const { data: patient } = await admin
  .from("patients")
  .insert({ full_name: "Pagination Probe", phone: PHONE, age: 30 })
  .select("id")
  .single();

const { data: doctor } = await admin
  .from("staff")
  .select("id")
  .eq("role", "doctor")
  .eq("is_active", true)
  .limit(1)
  .single();

console.log(`\nCreating ${TOTAL} probe visits`);
const rows = Array.from({ length: TOTAL }, () => ({
  patient_id: patient.id,
  doctor_id: doctor.id,
  visit_type: "new",
}));
const { data: made, error: insErr } = await admin
  .from("visits")
  .insert(rows)
  .select("id, visit_code");
if (insErr) {
  console.error("could not create fixtures:", insErr.message);
  process.exit(1);
}
pass(`${made.length} visits created`);

const probeCodes = new Set(made.map((v) => v.visit_code));

const cleanup = async () => {
  await admin.from("visits").delete().in("id", made.map((v) => v.id));
  await admin.from("patients").delete().eq("id", patient.id);
};

try {
  const url = (p) =>
    `${BASE}/super-admin/owner?q=Pagination+Probe${p > 1 ? `&page=${p}` : ""}`;

  console.log("\nPaging through the owner table");
  const seen = new Set();
  let firstPageHtml = "";

  for (const p of [1, 2, 3]) {
    const res = await fetch(url(p), { headers: { cookie }, redirect: "manual" });
    if (res.status !== 200) {
      fail(`page ${p} returned HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();
    if (p === 1) firstPageHtml = html;

    const n = countRows(html, probeCodes);
    const expected = p < 3 ? PER_PAGE : TOTAL - 2 * PER_PAGE;
    if (n === expected) pass(`page ${p} shows ${n} rows`);
    else fail(`page ${p} shows ${n} rows`, `expected ${expected}`);

    for (const code of visitCodes(html)) if (probeCodes.has(code)) seen.add(code);

    if (!text(html).includes(`Page ${p} of 3`)) {
      fail(`page ${p} does not say "Page ${p} of 3"`);
    } else {
      pass(`page ${p} labelled correctly`);
    }
  }

  console.log("\nPages do not overlap or drop rows");
  if (seen.size === TOTAL) pass(`${seen.size} distinct visit codes across 3 pages`);
  else fail("pages overlap or lose rows", `${seen.size} distinct, expected ${TOTAL}`);

  console.log("\nCounts and controls");
  if (text(firstPageHtml).includes(`of ${TOTAL}`)) pass(`total count shown (${TOTAL})`);
  else fail("total count not shown on page 1");

  if (!/>\s*←\s*Previous\s*<\/a>/.test(firstPageHtml)) {
    pass("Previous is not a link on page 1");
  } else {
    fail("Previous is clickable on page 1");
  }

  const last = await (await fetch(url(3), { headers: { cookie } })).text();
  if (!/>\s*Next\s*→\s*<\/a>/.test(last)) pass("Next is not a link on the last page");
  else fail("Next is clickable on the last page");

  console.log("\nSearch is preserved across pages");
  if (firstPageHtml.includes("q=Pagination")) pass("page links carry the search query");
  else fail("page links drop the search query");

  console.log("\nOut-of-range page is handled");
  const far = await fetch(url(99), { headers: { cookie } });
  if (far.status === 200) {
    pass(`page 99 still renders (HTTP 200, ${countRows(await far.text(), probeCodes)} rows)`);
  }
  else fail(`page 99 returned HTTP ${far.status}`);
} finally {
  await cleanup();
  console.log("  ..    probe rows cleaned up");
}

console.log(failed === 0 ? "\nAll pagination checks passed.\n" : `\n${failed} check(s) FAILED.\n`);
process.exit(failed === 0 ? 0 : 1);
