/**
 * Signs in as each role with a real session and probes what it can reach.
 *
 * This is the "tested as an attacker" pass: every query goes through the anon
 * key carrying that person's JWT, exactly as a browser console would. Passing
 * because the UI hides a button proves nothing.
 *
 * Two traps this suite is built to avoid:
 *   - An UPDATE that RLS filters out affects zero rows and returns NO error,
 *     which looks identical to "blocked". So writes are checked by reading the
 *     value back, never by the presence of an error.
 *   - A guard that blocked everything would also pass a negative-only test, so
 *     each block has a positive control beside it.
 *
 * Run with:  npm run verify:rls
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

let failed = 0;
function pass(m) {
  console.log(`  PASS  ${m}`);
}
function fail(m, d) {
  console.log(`  FAIL  ${m}${d ? ` — ${d}` : ""}`);
  failed++;
}

/** Signs in without sending email, returning a client bound to that session. */
async function signInAs(email) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw new Error(`generateLink ${email}: ${error.message}`);

  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: vErr } = await c.auth.verifyOtp({
    email,
    token: data.properties.email_otp,
    type: "email",
  });
  if (vErr) throw new Error(`verifyOtp ${email}: ${vErr.message}`);
  return c;
}

const E = {
  owner: "rhythm4538+owner@gmail.com",
  reception: "rhythm4538+reception@gmail.com",
  nurse: "rhythm4538+nurse@gmail.com",
  drA: "rhythm4538+dr.nabila@gmail.com",
  drB: "rhythm4538+dr.farhan@gmail.com",
};

console.log("\nSigning in as each role (no emails sent)");
const s = {};
for (const [key, email] of Object.entries(E)) {
  s[key] = await signInAs(email);
  const { data } = await s[key]
    .from("staff")
    .select("role, full_name")
    .eq("email", email)
    .single();
  if (data) pass(`${key.padEnd(9)} -> ${data.role}`);
  else fail(`${key} could not read own staff row`);
}

// Fixtures created as service role, so RLS does not shape the setup.
const ids = {};
{
  const { data: p } = await admin
    .from("patients")
    .insert({ full_name: "RLS Probe Patient", phone: "01700000000" })
    .select("id")
    .single();
  ids.patient = p.id;

  const { data: drA } = await admin.from("staff").select("id").eq("email", E.drA).single();
  const { data: drB } = await admin.from("staff").select("id").eq("email", E.drB).single();
  ids.drA = drA.id;
  ids.drB = drB.id;

  const { data: vA } = await admin
    .from("visits")
    .insert({ patient_id: p.id, doctor_id: drA.id, status: "awaiting_doctor" })
    .select("id")
    .single();
  const { data: vB } = await admin
    .from("visits")
    .insert({ patient_id: p.id, doctor_id: drB.id, status: "awaiting_doctor" })
    .select("id")
    .single();
  ids.visitA = vA.id;
  ids.visitB = vB.id;

  await admin.from("visit_entries").insert({
    visit_id: vA.id,
    type: "note",
    title: "Probe note",
    body: "clinical",
    author_id: drA.id,
  });
}

console.log("\nDoctor isolation");
{
  const { data: foreign } = await s.drA.from("visits").select("id").eq("id", ids.visitB);
  if ((foreign?.length ?? 0) === 0) pass("doctor A cannot read the other doctor visit");
  else fail("doctor A CAN read another doctor visit", "RLS leak");

  const { data: own } = await s.drA.from("visits").select("id").eq("id", ids.visitA);
  if ((own?.length ?? 0) === 1) pass("doctor A can read their own visit");
  else fail("doctor A cannot read their own visit");
}

console.log("\nReceptionist has no clinical access");
{
  const { data: entries } = await s.reception.from("visit_entries").select("id");
  if ((entries?.length ?? 0) === 0) pass("receptionist sees zero visit_entries");
  else fail("receptionist CAN read clinical entries", `${entries.length} rows`);

  const { data: visits } = await s.reception.from("visits").select("id");
  if ((visits?.length ?? 0) === 0) pass("receptionist sees no visits they did not create");
  else fail("receptionist sees other visits", `${visits.length} rows`);
}

console.log("\nColumn guard");
{
  // The nurse may only touch visits still awaiting vitals. Probing any other
  // row means RLS filters it out and the trigger never runs.
  const { data: vN } = await admin
    .from("visits")
    .insert({ patient_id: ids.patient, doctor_id: ids.drA, status: "awaiting_vitals" })
    .select("id")
    .single();
  ids.visitN = vN.id;

  const { error: nErr } = await s.nurse
    .from("visits")
    .update({ diagnosis: "nurse wrote this" })
    .eq("id", vN.id);
  const { data: a1 } = await admin
    .from("visits")
    .select("diagnosis")
    .eq("id", vN.id)
    .single();
  if (a1.diagnosis === null) {
    pass(nErr ? "nurse blocked from diagnosis (trigger raised)" : "nurse write to diagnosis had no effect");
  } else {
    fail("nurse WROTE into diagnosis", a1.diagnosis);
  }

  const { error: nOk } = await s.nurse
    .from("visits")
    .update({ blood_pressure: "120/80", height_cm: 165 })
    .eq("id", vN.id);
  const { data: a2 } = await admin
    .from("visits")
    .select("blood_pressure")
    .eq("id", vN.id)
    .single();
  if (a2.blood_pressure === "120/80") pass("nurse CAN write vitals");
  else fail("nurse cannot write vitals", nOk?.message ?? "no change");

  const { error: dErr } = await s.drA
    .from("visits")
    .update({ blood_pressure: "999/999" })
    .eq("id", ids.visitA);
  const { data: a3 } = await admin
    .from("visits")
    .select("blood_pressure")
    .eq("id", ids.visitA)
    .single();
  if (a3.blood_pressure !== "999/999") {
    pass(dErr ? "doctor blocked from vitals (trigger raised)" : "doctor write to vitals had no effect");
  } else {
    fail("doctor WROTE into vitals", a3.blood_pressure);
  }

  const { error: dOk } = await s.drA
    .from("visits")
    .update({ diagnosis: "eczema" })
    .eq("id", ids.visitA);
  const { data: a4 } = await admin
    .from("visits")
    .select("diagnosis")
    .eq("id", ids.visitA)
    .single();
  if (a4.diagnosis === "eczema") pass("doctor CAN write diagnosis");
  else fail("doctor cannot write diagnosis", dOk?.message ?? "no change");
}

console.log("\nStaff table exposure");
{
  const { data: rows } = await s.nurse.from("staff").select("id, email");
  if ((rows?.length ?? 0) <= 1) pass(`nurse reads only their own staff row (${rows?.length ?? 0})`);
  else fail("nurse can read the whole staff table", `${rows.length} rows incl. emails`);

  const { data: dir } = await s.nurse.from("staff_directory").select("id, full_name, role");
  if ((dir?.length ?? 0) >= 6) pass(`staff_directory readable for the doctor dropdown (${dir.length})`);
  else fail("staff_directory not readable", `${dir?.length ?? 0} rows`);
}

console.log("\nOwner sees everything");
{
  const { data: visits } = await s.owner.from("visits").select("id");
  if ((visits?.length ?? 0) >= 2) pass(`owner reads all visits (${visits.length})`);
  else fail("owner cannot read all visits");

  const { data: entries } = await s.owner.from("visit_entries").select("id");
  if ((entries?.length ?? 0) >= 1) pass(`owner reads clinical entries (${entries.length})`);
  else fail("owner cannot read clinical entries");
}

console.log("\nNotifications are private");
{
  const { data: notes } = await s.drB.from("notifications").select("id, recipient_id");
  const { data: me } = await s.drB.from("staff").select("id").eq("email", E.drB).single();
  const foreign = (notes ?? []).filter((n) => n.recipient_id !== me.id);
  if (foreign.length === 0) pass(`doctor B sees only their own notifications (${notes?.length ?? 0})`);
  else fail("doctor B sees notifications of others", `${foreign.length} foreign rows`);
}

await admin
  .from("visits")
  .delete()
  .in("id", [ids.visitA, ids.visitB, ids.visitN].filter(Boolean));
await admin.from("patients").delete().eq("id", ids.patient);
console.log("  ..    probe rows cleaned up");

console.log(failed === 0 ? "\nAll RLS checks passed.\n" : `\n${failed} RLS check(s) FAILED.\n`);
process.exit(failed === 0 ? 0 : 1);
