/**
 * Seeds the four staff roles.
 *
 * Run with:  npm run seed
 *
 * Creates an auth user per person (no password — they sign in with an email
 * OTP) and the matching public.staff row. Safe to re-run: existing people are
 * left alone.
 *
 * EDIT THESE before running. For Phase 2 you will need inboxes you can
 * actually open, so use real addresses you control (Gmail's +tags work well:
 * you+owner@gmail.com, you+nurse@gmail.com, ...).
 */
const STAFF = [
  { email: "rhythm4538+owner@gmail.com",        full_name: "Studio Owner",     role: "owner" },
  { email: "rhythm4538+reception@gmail.com",    full_name: "Front Desk",       role: "receptionist" },
  { email: "rhythm4538+nurse@gmail.com",        full_name: "Nurse on Duty",    role: "nurse" },
  { email: "rhythm4538+dr.nabila@gmail.com",    full_name: "Dr. Nabila Karim", role: "doctor", specialty: "Dermatologist" },
  { email: "rhythm4538+dr.farhan@gmail.com",    full_name: "Dr. Farhan Rashid", role: "doctor", specialty: "General Physician" },
  { email: "rhythm4538+dr.sadia@gmail.com",     full_name: "Dr. Sadia Noor",   role: "doctor", specialty: "Nutritionist" },
];

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Run via: npm run seed   (which loads .env.local)");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  // listUsers is paginated; a clinic has a handful of staff, so one page is
  // plenty, but page through anyway rather than silently missing someone.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

let created = 0;
let skipped = 0;

for (const person of STAFF) {
  let user = await findUserByEmail(person.email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: person.email,
      email_confirm: true, // no confirmation mail; they log in with an OTP
    });
    if (error) {
      console.error(`  auth user failed for ${person.email}: ${error.message}`);
      continue;
    }
    user = data.user;
  }

  const { error } = await supabase.from("staff").upsert(
    {
      id: user.id,
      email: person.email,
      full_name: person.full_name,
      role: person.role,
      specialty: person.specialty ?? null,
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error(`  staff row failed for ${person.email}: ${error.message}`);
    continue;
  }

  const existed = skipped;
  console.log(`  ${person.role.padEnd(12)} ${person.email}`);
  if (existed === skipped) created++;
}

console.log(`\nDone. ${created} staff rows written.`);

const { data: rows, error } = await supabase
  .from("staff")
  .select("role, full_name, email, is_active")
  .order("role");

if (error) {
  console.error("Could not read back staff:", error.message);
  process.exit(1);
}

console.table(rows);
