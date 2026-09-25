/**
 * Checks that the Phase 1 migrations actually landed.
 * Run with:  npm run verify:schema
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env. Run via: npm run verify:schema");
  process.exit(1);
}
const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failed = 0;
const ok = (label) => console.log(`  PASS  ${label}`);
const bad = (label, detail) => {
  console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  failed++;
};

async function table(name) {
  const { error } = await db.from(name).select("*").limit(1);
  if (error) bad(`table ${name}`, error.message);
  else ok(`table ${name}`);
}

async function rpc(name, args, label) {
  const { error } = await db.rpc(name, args);
  if (error) bad(`function ${label ?? name}`, error.message);
  else ok(`function ${label ?? name}`);
}

console.log("\nTables");
for (const t of ["staff", "patients", "visits", "visit_entries", "notifications", "visit_counters"]) {
  await table(t);
}

console.log("\nViews");
await table("staff_directory");

console.log("\nFunctions");
await rpc("clinic_today", {});
await rpc("assign_doctor", { p_preferred: null });
await rpc("my_role", {});
await rpc("is_owner", {});

console.log("\nStorage");
const { data: buckets, error: bErr } = await db.storage.listBuckets();
if (bErr) {
  bad("bucket patient-files", bErr.message);
} else {
  const b = buckets.find((x) => x.id === "patient-files");
  if (!b) bad("bucket patient-files", "not found");
  else if (b.public) bad("bucket patient-files", "is PUBLIC — must be private");
  else ok("bucket patient-files (private)");
}

console.log("\nCode generation");
const { data: p, error: pErr } = await db
  .from("patients")
  .insert({ full_name: "Verify Probe", phone: "0000000000" })
  .select("id, patient_code")
  .single();

if (pErr) {
  bad("patient_code default", pErr.message);
} else {
  if (/^(LL|DS)-P-\d{5}$/.test(p.patient_code)) ok(`patient_code format (${p.patient_code})`);
  else bad("patient_code format", p.patient_code);

  const { data: v, error: vErr } = await db
    .from("visits")
    .insert({ patient_id: p.id })
    .select("id, visit_code, status")
    .single();

  if (vErr) {
    bad("visit_code trigger", vErr.message);
  } else {
    if (/^(LL|DS)-\d{6}-\d{3}$/.test(v.visit_code)) ok(`visit_code format (${v.visit_code})`);
    else bad("visit_code format", v.visit_code);

    if (v.status === "awaiting_vitals") ok("visit default status");
    else bad("visit default status", v.status);

    await db.from("visits").delete().eq("id", v.id);
  }
  await db.from("patients").delete().eq("id", p.id);
  console.log("  ..    probe rows cleaned up");
}

console.log(failed === 0 ? "\nAll checks passed.\n" : `\n${failed} check(s) failed.\n`);
process.exit(failed === 0 ? 0 : 1);
