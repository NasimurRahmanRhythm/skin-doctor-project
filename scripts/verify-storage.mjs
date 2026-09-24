/**
 * Checks the patient-files bucket policies with real sessions.
 *
 * Phase 5 lets doctors attach lab reports and photos, so these policies decide
 * who can read a patient's files. Worth proving rather than assuming.
 *
 * Run with:  npm run verify:storage
 */
import { createClient } from "@supabase/supabase-js";

// Deliberately not named URL — that shadows the global URL class that
// supabase-js uses to validate its own config.
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
  if (error) throw new Error(`generateLink: ${error.message}`);
  const c = createClient(SUPA_URL, ANON, { auth: { persistSession: false } });
  const { error: vErr } = await c.auth.verifyOtp({
    email,
    token: data.properties.email_otp,
    type: "email",
  });
  if (vErr) throw new Error(`verifyOtp: ${vErr.message}`);
  return c;
}

const doctor = await signInAs("rhythm4538+dr.nabila@gmail.com");
const nurse = await signInAs("rhythm4538+nurse@gmail.com");
const reception = await signInAs("rhythm4538+reception@gmail.com");

const blob = new Blob(["storage probe"], { type: "text/plain" });
const DOC_PATH = "probe/doctor-test.txt";
const REC_PATH = "probe/reception-test.txt";
const OVERSIZE_PATH = "probe/too-big.pdf";

console.log("\nClinical staff can attach and read files");
{
  const { error } = await doctor.storage.from("patient-files").upload(DOC_PATH, blob, { upsert: true });
  if (error) fail("doctor cannot upload", error.message);
  else pass("doctor can upload");

  const { error: rErr } = await doctor.storage.from("patient-files").download(DOC_PATH);
  if (rErr) fail("doctor cannot read back", rErr.message);
  else pass("doctor can read back");

  const { error: nErr } = await nurse.storage.from("patient-files").download(DOC_PATH);
  if (nErr) fail("nurse cannot read clinical file", nErr.message);
  else pass("nurse can read clinical file");
}

console.log("\nReception is kept out of clinical files");
{
  // Reception may write under visits/<their own visit>/ and nowhere else, so
  // this loose path must still be refused.
  const { error } = await reception.storage.from("patient-files").upload(REC_PATH, blob, { upsert: true });
  if (error) pass("receptionist blocked from uploading outside their own visit");
  else fail("receptionist COULD upload a clinical file");

  const { error: rErr } = await reception.storage.from("patient-files").download(DOC_PATH);
  if (rErr) pass("receptionist blocked from reading");
  else fail("receptionist COULD read a clinical file");
}

console.log("\nBucket is private");
{
  const publicUrl = admin.storage.from("patient-files").getPublicUrl(DOC_PATH).data.publicUrl;
  const res = await fetch(publicUrl);
  if (res.ok) fail("public URL served the file", "bucket is not private");
  else pass(`public URL refused (HTTP ${res.status})`);

  const { data: signed } = await doctor.storage.from("patient-files").createSignedUrl(DOC_PATH, 60);
  if (!signed?.signedUrl) {
    fail("could not create a signed URL");
  } else {
    const sres = await fetch(signed.signedUrl);
    if (sres.ok) pass("signed URL works (this is how files get shown)");
    else fail("signed URL did not work", `HTTP ${sres.status}`);
  }
}

console.log("\nUpload ceiling");
{
  const MAX = 10 * 1024 * 1024;
  const { data: bucket, error } = await admin.storage.getBucket("patient-files");

  if (error) {
    fail("could not read the bucket settings", error.message);
  } else if (bucket.file_size_limit === MAX) {
    pass("bucket itself enforces 10 MB");
  } else {
    fail("bucket size limit is not 10 MB", String(bucket.file_size_limit ?? "unset"));
  }

  // The forms check this too, but only storage can stop a request that never
  // went through a form. Sent as a doctor, whose path policy is unrestricted,
  // so size is the only thing that can refuse it.
  const big = new Blob([new Uint8Array(MAX + 1024 * 1024)], { type: "application/pdf" });
  const { error: bigErr } = await doctor.storage
    .from("patient-files")
    .upload(OVERSIZE_PATH, big, { upsert: true, contentType: "application/pdf" });

  if (bigErr) pass(`11 MB upload refused (${bigErr.message})`);
  else fail("an 11 MB file was accepted", "the ceiling is not being enforced");
}

await admin.storage.from("patient-files").remove([DOC_PATH, REC_PATH, OVERSIZE_PATH]);
console.log("  ..    probe files removed");

console.log(failed === 0 ? "\nAll storage checks passed.\n" : `\n${failed} storage check(s) FAILED.\n`);
process.exit(failed === 0 ? 0 : 1);
