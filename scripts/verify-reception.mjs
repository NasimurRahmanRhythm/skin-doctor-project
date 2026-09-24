/**
 * Exercises the check-in path as a real receptionist session.
 *
 * Mirrors what the server action does, through the anon key under RLS, so a
 * policy that blocks the front desk shows up here rather than in the clinic.
 *
 * Run with:  npm run verify:reception
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

async function signInAs(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`generateLink: ${error.message}`);
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: vErr } = await c.auth.verifyOtp({
    email,
    token: data.properties.email_otp,
    type: "email",
  });
  if (vErr) throw new Error(`verifyOtp: ${vErr.message}`);
  return c;
}

const RECEPTION = "rhythm4538+reception@gmail.com";
const NURSE = "rhythm4538+nurse@gmail.com";
const PHONE = "01999000111";

const reception = await signInAs(RECEPTION);
const { data: me } = await reception.from("staff").select("id").eq("email", RECEPTION).single();

const made = { patients: [], visits: [] };

console.log("\nDoctor dropdown");
{
  const { data: doctors, error } = await reception
    .from("staff_directory")
    .select("id, full_name, specialty")
    .eq("role", "doctor")
    .eq("is_active", true);
  if (error) fail("receptionist cannot read the doctor list", error.message);
  else if ((doctors?.length ?? 0) >= 3) pass(`doctor list readable (${doctors.length} doctors)`);
  else fail("doctor list too short", `${doctors?.length ?? 0}`);
}

console.log("\nFirst check-in (new patient, no preference)");
let firstVisit;
{
  await admin.from("patients").delete().eq("phone", PHONE);

  const { data: patient, error: pErr } = await reception
    .from("patients")
    .insert({ full_name: "Verify Farhana", phone: PHONE, age: 34, created_by: me.id })
    .select("id, patient_code")
    .single();
  if (pErr) {
    fail("receptionist cannot create a patient", pErr.message);
  } else {
    made.patients.push(patient.id);
    pass(`patient created (${patient.patient_code})`);

    const { data: doctorId, error: aErr } = await reception.rpc("assign_doctor", {
      p_preferred: null,
    });
    if (aErr) fail("receptionist cannot call assign_doctor", aErr.message);
    else if (doctorId) pass("assign_doctor picked a doctor for 'no preference'");
    else fail("assign_doctor returned nothing");

    const { data: visit, error: vErr } = await reception
      .from("visits")
      .insert({
        patient_id: patient.id,
        receptionist_id: me.id,
        doctor_id: doctorId,
        doctor_requested: false,
        visit_type: "new",
        chief_complaint: "Verify probe",
      })
      .select("id, visit_code, status")
      .single();

    if (vErr) {
      fail("receptionist cannot create a visit", vErr.message);
    } else {
      made.visits.push(visit.id);
      firstVisit = visit;
      pass(`visit created (${visit.visit_code}), status ${visit.status}`);
    }
  }
}

console.log("\nReturning patient reuses the same record");
{
  const { data: found } = await reception
    .from("patients")
    .select("id, patient_code")
    .eq("phone", PHONE)
    .maybeSingle();

  if (!found) {
    fail("phone lookup did not find the existing patient");
  } else {
    pass(`phone lookup found ${found.patient_code}`);

    const { data: doctorId } = await reception.rpc("assign_doctor", { p_preferred: null });
    const { data: v2, error } = await reception
      .from("visits")
      .insert({
        patient_id: found.id,
        receptionist_id: me.id,
        doctor_id: doctorId,
        doctor_requested: false,
        visit_type: "returning",
      })
      .select("id")
      .single();

    if (error) {
      fail("second visit failed", error.message);
    } else {
      made.visits.push(v2.id);
      const { count } = await admin
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("phone", PHONE);
      if (count === 1) pass("one patient row, two visits (history stays together)");
      else fail("duplicate patient rows created", `${count} rows`);
    }
  }
}

console.log("\nHand-off to the nurse fired");
{
  const { data: notes } = await admin
    .from("notifications")
    .select("id, type, recipient_id, visit_id")
    .eq("visit_id", firstVisit?.id ?? "");

  const { data: nurses } = await admin.from("staff").select("id").eq("role", "nurse").eq("is_active", true);
  const nurseIds = new Set((nurses ?? []).map((n) => n.id));
  const toNurses = (notes ?? []).filter((n) => nurseIds.has(n.recipient_id));

  if (toNurses.length === nurseIds.size && toNurses.length > 0) {
    pass(`every active nurse notified (${toNurses.length})`);
  } else {
    fail("nurse notification did not fire", `${toNurses.length} of ${nurseIds.size}`);
  }

  const nurseClient = await signInAs(NURSE);
  const { data: queue } = await nurseClient
    .from("visits")
    .select("id, visit_code")
    .eq("status", "awaiting_vitals");
  if ((queue ?? []).some((v) => v.id === firstVisit?.id)) {
    pass("visit is visible in the nurse queue");
  } else {
    fail("visit is not in the nurse queue");
  }
}

console.log("\nRequested doctor is honoured");
{
  const { data: drs } = await reception
    .from("staff_directory")
    .select("id, full_name")
    .eq("role", "doctor")
    .eq("is_active", true)
    .order("full_name");
  const wanted = drs[drs.length - 1];

  const { data: picked } = await reception.rpc("assign_doctor", { p_preferred: wanted.id });
  if (picked === wanted.id) pass(`requested doctor honoured (${wanted.full_name})`);
  else fail("requested doctor ignored", `asked ${wanted.id}, got ${picked}`);
}

console.log("\nLoad balancing for 'no preference'");
{
  // assign_doctor levels each doctor's TOTAL open load for the day, not the
  // share within one batch. Measuring only the batch reads as "clumped"
  // whenever the day started uneven, or when a random tie-break happens to
  // repeat — so the assertion has to look at the totals.
  const { data: drs } = await admin
    .from("staff")
    .select("id, full_name")
    .eq("role", "doctor")
    .eq("is_active", true);

  const { data: patient } = await admin
    .from("patients")
    .insert({ full_name: "Balance Probe", phone: "01999000222" })
    .select("id")
    .single();
  made.patients.push(patient.id);

  for (let i = 0; i < 6; i++) {
    const { data: doctorId } = await reception.rpc("assign_doctor", { p_preferred: null });
    const { data: v } = await reception
      .from("visits")
      .insert({
        patient_id: patient.id,
        receptionist_id: me.id,
        doctor_id: doctorId,
        doctor_requested: false,
        visit_type: "new",
      })
      .select("id")
      .single();
    made.visits.push(v.id);
  }

  const dayStart = new Date(
    `${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date())}T00:00:00+06:00`,
  ).toISOString();

  const totals = [];
  for (const d of drs) {
    const { count } = await admin
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("doctor_id", d.id)
      .neq("status", "completed")
      .gte("created_at", dayStart);
    totals.push({ name: d.full_name, n: count ?? 0 });
  }

  const numbers = totals.map((t) => t.n).sort((a, b) => a - b);
  const gap = numbers[numbers.length - 1] - numbers[0];
  const shown = totals.map((t) => `${t.name.split(" ").pop()}:${t.n}`).join(" ");
  if (gap <= 1) pass(`open load level across doctors (${shown})`);
  else fail("one doctor is carrying the queue", shown);
}

console.log("\nIntake attachments");
{
  // A tiny but genuinely valid PDF, so the content type is not a lie.
  const pdf = new Blob(
    ["%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"],
    { type: "application/pdf" },
  );
  const path = `visits/${firstVisit.id}/${crypto.randomUUID()}-probe.pdf`;
  made.files = [path];

  const { error: upErr } = await reception.storage
    .from("patient-files")
    .upload(path, pdf, { contentType: "application/pdf" });

  if (upErr) {
    fail("receptionist cannot upload an intake file", upErr.message);
  } else {
    pass("receptionist uploaded a PDF to their own visit");

    const { error: rowErr } = await reception.from("visit_entries").insert({
      visit_id: firstVisit.id,
      type: "intake",
      title: "probe.pdf",
      file_path: path,
      file_name: "probe.pdf",
      file_type: "application/pdf",
      author_id: me.id,
    });
    if (rowErr) fail("receptionist cannot record the intake entry", rowErr.message);
    else pass("intake entry recorded against the visit");
  }

  // Writing into someone else's visit folder must be refused. An invented id
  // is enough: no visit of that id has this receptionist on it.
  const { error: foreignErr } = await reception.storage
    .from("patient-files")
    .upload(`visits/${crypto.randomUUID()}/sneak.pdf`, pdf, {
      contentType: "application/pdf",
    });
  if (foreignErr) pass("upload into a foreign visit folder refused");
  else fail("receptionist wrote into a visit that is not theirs");

  // The whole point of scoping the read policy: clinical notes stay unreadable
  // even on a visit this receptionist checked in.
  const { data: docRow } = await admin
    .from("staff")
    .select("id")
    .eq("email", "rhythm4538+dr.nabila@gmail.com")
    .single();
  const { data: clinical } = await admin
    .from("visit_entries")
    .insert({
      visit_id: firstVisit.id,
      type: "note",
      title: "Doctor-only probe note",
      body: "Should never be visible to the front desk.",
      author_id: docRow.id,
    })
    .select("id")
    .single();

  const { data: seen } = await reception
    .from("visit_entries")
    .select("id, type, title")
    .eq("visit_id", firstVisit.id);

  const sawClinical = (seen ?? []).some((e) => e.id === clinical.id);
  const sawOwn = (seen ?? []).some((e) => e.type === "intake");

  if (sawClinical) fail("receptionist can read a clinical note");
  else pass("clinical note stays hidden from the front desk");
  if (sawOwn) pass("receptionist can read back their own attachment");
  else fail("receptionist cannot see the file they just attached");

  // The doctor on the visit must actually receive it — that is the feature.
  const doctorClient = await signInAs("rhythm4538+dr.nabila@gmail.com");
  const { data: visitRow } = await admin
    .from("visits")
    .select("doctor_id")
    .eq("id", firstVisit.id)
    .single();

  if (visitRow.doctor_id !== docRow.id) {
    // Assignment is load-based, so the probe visit may belong to someone else.
    await admin.from("visits").update({ doctor_id: docRow.id }).eq("id", firstVisit.id);
  }

  const { data: docSees } = await doctorClient
    .from("visit_entries")
    .select("id, type, file_name")
    .eq("visit_id", firstVisit.id);

  if ((docSees ?? []).some((e) => e.type === "intake" && e.file_name === "probe.pdf")) {
    pass("assigned doctor sees the reception attachment");
  } else {
    fail("assigned doctor cannot see the reception attachment");
  }
}

// cleanup
await admin.storage.from("patient-files").remove(made.files ?? []);
await admin.from("visits").delete().in("id", made.visits);
await admin.from("patients").delete().in("id", made.patients);
console.log("  ..    probe rows cleaned up");

console.log(failed === 0 ? "\nAll reception checks passed.\n" : `\n${failed} check(s) FAILED.\n`);
process.exit(failed === 0 ? 0 : 1);
