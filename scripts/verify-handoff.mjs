/**
 * Walks one patient through the whole clinic, as the three real sessions.
 *
 * Also subscribes to Realtime the way the dashboards do, so the notification
 * path is proven rather than assumed — a trigger that inserts a row but never
 * reaches a subscriber would still pass a database-only test.
 *
 * Run with:  npm run verify:handoff
 */
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false } });

let failed = 0;
function pass(m) {
  console.log(`  PASS  ${m}`);
}
function fail(m, d) {
  console.log(`  FAIL  ${m}${d ? ` — ${d}` : ""}`);
  failed++;
}

async function signInAs(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`generateLink ${email}: ${error.message}`);
  const c = createClient(SUPA_URL, ANON, { auth: { persistSession: false } });
  const { error: vErr } = await c.auth.verifyOtp({
    email,
    token: data.properties.email_otp,
    type: "email",
  });
  if (vErr) throw new Error(`verifyOtp ${email}: ${vErr.message}`);
  return c;
}

/**
 * Subscribes for one recipient and resolves only once the channel is actually
 * SUBSCRIBED, returning a promise for the first row that arrives afterwards.
 *
 * Waiting for SUBSCRIBED matters: calling .subscribe() and writing immediately
 * races the handshake, and a missed notification then looks exactly like a
 * broken trigger.
 */
async function listenForNotification(client, recipientId, ms = 12000) {
  let deliver;
  const received = new Promise((resolve) => (deliver = resolve));

  const channel = client
    .channel(`probe:${recipientId}:${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${recipientId}`,
      },
      (payload) => deliver(payload.new),
    );

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("subscribe timed out")), 15000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(t);
        reject(new Error(`channel status ${status}`));
      }
    });
  });

  return async () => {
    const row = await Promise.race([
      received,
      new Promise((r) => setTimeout(() => r(null), ms)),
    ]);
    void client.removeChannel(channel);
    return row;
  };
}

const E = {
  reception: "rhythm4538+reception@gmail.com",
  nurse: "rhythm4538+nurse@gmail.com",
  drA: "rhythm4538+dr.nabila@gmail.com",
};

const reception = await signInAs(E.reception);
const nurse = await signInAs(E.nurse);

const me = {};
for (const [k, email] of Object.entries(E)) {
  const { data } = await admin.from("staff").select("id").eq("email", email).single();
  me[k] = data.id;
}

const made = { patients: [], visits: [] };
const PHONE = "01955500777";
await admin.from("patients").delete().eq("phone", PHONE);

console.log("\nStep 1 — reception checks a patient in");
let visitId;
{
  // Listen before writing, so the notification cannot land before we subscribe.
  const nurseAlert = await listenForNotification(nurse, me.nurse);

  const { data: patient } = await reception
    .from("patients")
    .insert({ full_name: "Handoff Probe", phone: PHONE, age: 41, created_by: me.reception })
    .select("id")
    .single();
  made.patients.push(patient.id);

  const { data: visit, error } = await reception
    .from("visits")
    .insert({
      patient_id: patient.id,
      receptionist_id: me.reception,
      doctor_id: me.drA,
      doctor_requested: true,
      visit_type: "new",
      chief_complaint: "Handoff probe",
    })
    .select("id, visit_code, status")
    .single();

  if (error) {
    fail("check-in failed", error.message);
  } else {
    made.visits.push(visit.id);
    visitId = visit.id;
    pass(`checked in ${visit.visit_code} (${visit.status})`);
  }

  const alert = await nurseAlert();
  if (alert) pass(`nurse received a REALTIME alert: "${alert.title}"`);
  else fail("nurse got no realtime alert within 12s", "trigger or realtime publication");
}

console.log("\nStep 2 — nurse sees the queue and records vitals");
{
  const { data: queue } = await nurse
    .from("visits")
    .select("id")
    .eq("status", "awaiting_vitals");
  if ((queue ?? []).some((v) => v.id === visitId)) pass("visit is in the nurse queue");
  else fail("visit missing from the nurse queue");

  const doctorAlert = await listenForNotification(await signInAs(E.drA), me.drA);

  const { error } = await nurse
    .from("visits")
    .update({
      height_cm: 168,
      weight_kg: 71.5,
      blood_pressure: "118/76",
      blood_sugar: 92,
      temperature: 36.9,
      pulse: 74,
      nurse_notes: "Patient reports itching worse at night.",
      nurse_id: me.nurse,
      status: "awaiting_doctor",
    })
    .eq("id", visitId);

  if (error) fail("nurse could not save vitals", error.message);
  else pass("vitals saved, status moved to awaiting_doctor");

  const { data: after } = await admin
    .from("visits")
    .select("vitals_at, nurse_id, status")
    .eq("id", visitId)
    .single();
  if (after.vitals_at) pass("vitals_at stamped by the database");
  else fail("vitals_at was not stamped");
  if (after.nurse_id === me.nurse) pass("nurse recorded as the handler");
  else fail("nurse_id not recorded");

  const alert = await doctorAlert();
  if (alert) pass(`doctor received a REALTIME alert: "${alert.title}"`);
  else fail("doctor got no realtime alert within 12s");
}

console.log("\nStep 3 — doctor completes the visit");
{
  const doctor = await signInAs(E.drA);

  const { data: queue } = await doctor
    .from("visits")
    .select("id, blood_pressure")
    .eq("status", "awaiting_doctor");
  const mine = (queue ?? []).find((v) => v.id === visitId);
  if (mine) pass(`visit is in the doctor queue (BP ${mine.blood_pressure} carried over)`);
  else fail("visit missing from the doctor queue");

  const { error } = await doctor
    .from("visits")
    .update({
      diagnosis: "Contact dermatitis",
      prescription: "Mometasone 0.1% cream, twice daily, 10 days",
      advice: "Avoid the new detergent.",
      status: "completed",
    })
    .eq("id", visitId);
  if (error) fail("doctor could not save the consultation", error.message);
  else pass("diagnosis and prescription saved, visit completed");

  const { data: after } = await admin
    .from("visits")
    .select("completed_at, status")
    .eq("id", visitId)
    .single();
  if (after.completed_at) pass("completed_at stamped by the database");
  else fail("completed_at was not stamped");

  const { error: eErr } = await doctor.from("visit_entries").insert({
    visit_id: visitId,
    type: "note",
    title: "Follow-up note",
    body: "Review in two weeks if no improvement.",
    author_id: me.drA,
  });
  if (eErr) fail("doctor could not add a record entry", eErr.message);
  else pass("record entry added");
}

console.log("\nEvery handler is recorded on the visit");
{
  const { data: v } = await admin
    .from("visits")
    .select("receptionist_id, nurse_id, doctor_id")
    .eq("id", visitId)
    .single();
  const ok =
    v.receptionist_id === me.reception && v.nurse_id === me.nurse && v.doctor_id === me.drA;
  if (ok) pass("receptionist, nurse and doctor all stored on the visit");
  else fail("handler attribution is incomplete", JSON.stringify(v));
}

await admin.from("visits").delete().in("id", made.visits);
await admin.from("patients").delete().in("id", made.patients);
console.log("  ..    probe rows cleaned up");

console.log(failed === 0 ? "\nAll hand-off checks passed.\n" : `\n${failed} check(s) FAILED.\n`);
process.exit(failed === 0 ? 0 : 1);
