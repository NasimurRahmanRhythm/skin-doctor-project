/**
 * Owner dashboard checks: attribution, search, date filter, staff management.
 *
 * Run with:  npm run verify:owner
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

const E = {
  owner: "rhythm4538+owner@gmail.com",
  reception: "rhythm4538+reception@gmail.com",
  nurse: "rhythm4538+nurse@gmail.com",
  drA: "rhythm4538+dr.nabila@gmail.com",
};

const owner = await signInAs(E.owner);
const nurse = await signInAs(E.nurse);

const me = {};
for (const [k, email] of Object.entries(E)) {
  const { data } = await admin.from("staff").select("id").eq("email", email).single();
  me[k] = data.id;
}

// ---- fixture: one fully handled visit ----------------------------------
const PHONE = "01922233344";
await admin.from("patients").delete().eq("phone", PHONE);
const made = { patients: [], visits: [], staff: [] };

const { data: patient } = await admin
  .from("patients")
  .insert({ full_name: "Owner Probe Rahima", phone: PHONE, age: 52, created_by: me.reception })
  .select("id, patient_code")
  .single();
made.patients.push(patient.id);

const { data: visit } = await admin
  .from("visits")
  .insert({
    patient_id: patient.id,
    receptionist_id: me.reception,
    nurse_id: me.nurse,
    doctor_id: me.drA,
    doctor_requested: true,
    visit_type: "new",
    status: "completed",
    blood_pressure: "130/85",
    diagnosis: "Owner probe diagnosis",
  })
  .select("id, visit_code")
  .single();
made.visits.push(visit.id);

console.log("\nAttribution is readable by the owner");
{
  const { data, error } = await owner
    .from("visits")
    .select(
      `visit_code, doctor_requested,
       receptionist:receptionist_id(full_name),
       nurse:nurse_id(full_name),
       doctor:doctor_id(full_name)`,
    )
    .eq("id", visit.id)
    .single();

  if (error) {
    fail("owner cannot read handler names", error.message);
  } else {
    const all = data.receptionist?.full_name && data.nurse?.full_name && data.doctor?.full_name;
    if (all) {
      pass(
        `all three handlers resolve (${data.receptionist.full_name} / ${data.nurse.full_name} / ${data.doctor.full_name})`,
      );
    } else {
      fail("some handler names came back null", JSON.stringify(data));
    }
    if (data.doctor_requested === true) pass("requested-vs-auto flag preserved");
    else fail("doctor_requested flag lost");
  }
}

console.log("\nSearch");
{
  const byName = await owner
    .from("patients")
    .select("id")
    .or(`full_name.ilike.%Rahima%,patient_code.ilike.%Rahima%,phone.ilike.%Rahima%`);
  if ((byName.data ?? []).some((p) => p.id === patient.id)) pass("search by partial name");
  else fail("search by partial name found nothing");

  const byCode = await owner
    .from("patients")
    .select("id")
    .or(`full_name.ilike.%${patient.patient_code}%,patient_code.ilike.%${patient.patient_code}%,phone.ilike.%${patient.patient_code}%`);
  if ((byCode.data ?? []).some((p) => p.id === patient.id)) pass("search by patient code");
  else fail("search by patient code found nothing");

  const byPhone = await owner
    .from("patients")
    .select("id")
    .or(`full_name.ilike.%${PHONE}%,patient_code.ilike.%${PHONE}%,phone.ilike.%${PHONE}%`);
  if ((byPhone.data ?? []).some((p) => p.id === patient.id)) pass("search by phone");
  else fail("search by phone found nothing");

  const byVisit = await owner.from("visits").select("id").ilike("visit_code", `%${visit.visit_code}%`);
  if ((byVisit.data ?? []).some((v) => v.id === visit.id)) pass("search by visit code");
  else fail("search by visit code found nothing");
}

console.log("\nDate range filter");
{
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
  const start = new Date(`${day}T00:00:00+06:00`).toISOString();
  const end = new Date(new Date(start).getTime() + 86400000).toISOString();

  const inRange = await owner.from("visits").select("id").gte("created_at", start).lt("created_at", end);
  if ((inRange.data ?? []).some((v) => v.id === visit.id)) pass("today's visit is inside today's range");
  else fail("today's visit missing from today's range");

  const past = new Date(new Date(start).getTime() - 86400000).toISOString();
  const outOfRange = await owner.from("visits").select("id").gte("created_at", past).lt("created_at", start);
  if (!(outOfRange.data ?? []).some((v) => v.id === visit.id)) pass("yesterday's range excludes it");
  else fail("date filter is not excluding correctly");
}

console.log("\nOnly the owner reaches owner data");
{
  const { data: asNurse } = await nurse
    .from("staff")
    .select("id, email");
  if ((asNurse?.length ?? 0) <= 1) pass("nurse still cannot list the team");
  else fail("nurse can read the staff table", `${asNurse.length} rows`);

  // The nurse policy is "awaiting vitals, or one I handled". Anything outside
  // that is a leak. An assertion that passes either way proves nothing, so
  // check every row she can see against the rule.
  const { data: nurseVisits } = await nurse.from("visits").select("id, status, nurse_id");
  const outsideRule = (nurseVisits ?? []).filter(
    (v) => v.status !== "awaiting_vitals" && v.nurse_id !== me.nurse,
  );
  if (outsideRule.length === 0) {
    pass(`every visit the nurse can see fits her policy (${nurseVisits?.length ?? 0} rows)`);
  } else {
    fail("nurse can see visits outside her policy", `${outsideRule.length} rows`);
  }

  const { data: ownerTeam } = await owner.from("staff").select("id, email, is_active");
  if ((ownerTeam?.length ?? 0) >= 6) pass(`owner lists the whole team (${ownerTeam.length})`);
  else fail("owner cannot list the team", `${ownerTeam?.length ?? 0} rows`);
}

console.log("\nStaff management");
{
  const email = `probe.staff.${Date.now()}@example.com`;

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (authErr) {
    fail("could not create an auth user", authErr.message);
  } else {
    made.staff.push(created.user.id);
    const { error } = await admin.from("staff").insert({
      id: created.user.id,
      email,
      full_name: "Probe Nurse",
      role: "nurse",
    });
    if (error) fail("could not create the staff row", error.message);
    else pass("new staff member created");

    // Deactivating must keep history but stop new work.
    await admin.from("staff").update({ is_active: false }).eq("id", created.user.id);
    const { data: check } = await admin
      .from("staff")
      .select("is_active")
      .eq("id", created.user.id)
      .single();
    if (check.is_active === false) pass("deactivation recorded");
    else fail("deactivation did not stick");
  }

  // A deactivated doctor must stop being assigned new patients.
  const { data: drs } = await admin.from("staff").select("id").eq("role", "doctor").eq("is_active", true);
  const victim = drs[0].id;
  await admin.from("staff").update({ is_active: false }).eq("id", victim);
  let assignedToVictim = 0;
  for (let i = 0; i < 6; i++) {
    const { data: picked } = await admin.rpc("assign_doctor", { p_preferred: null });
    if (picked === victim) assignedToVictim++;
  }
  await admin.from("staff").update({ is_active: true }).eq("id", victim);

  if (assignedToVictim === 0) pass("a deactivated doctor receives no new patients");
  else fail("deactivated doctor still being assigned", `${assignedToVictim}/6`);

  // Even when named explicitly, an inactive doctor must not be honoured.
  await admin.from("staff").update({ is_active: false }).eq("id", victim);
  const { data: forced } = await admin.rpc("assign_doctor", { p_preferred: victim });
  await admin.from("staff").update({ is_active: true }).eq("id", victim);
  if (forced !== victim) pass("requesting a deactivated doctor falls back to an active one");
  else fail("a deactivated doctor was honoured as a request");
}

// cleanup
await admin.from("visits").delete().in("id", made.visits);
await admin.from("patients").delete().in("id", made.patients);
for (const id of made.staff) {
  await admin.from("staff").delete().eq("id", id);
  await admin.auth.admin.deleteUser(id);
}
console.log("  ..    probe rows cleaned up");

console.log(failed === 0 ? "\nAll owner checks passed.\n" : `\n${failed} owner check(s) FAILED.\n`);
process.exit(failed === 0 ? 0 : 1);
