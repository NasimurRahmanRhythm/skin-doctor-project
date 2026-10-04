"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formImage, imageProblem, removeImages, storeImage } from "@/lib/site-media-server";

export type StaffState = { error?: string; notice?: string };

const staffSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  full_name: z.string().trim().min(1, "Enter their name."),
  role: z.enum(["owner", "receptionist", "nurse", "doctor"]),
  specialty: z.string().trim().optional(),
});

/** The staff list and the website's Doctors section and page all read staff rows. */
function revalidateStaff() {
  revalidatePath("/super-admin/owner/staff");
  revalidatePath("/");
  revalidatePath("/doctors");
}

/**
 * Creates a staff account.
 *
 * Uses the service-role client because only it can create an auth user, and
 * because public.staff is granted SELECT-only to signed-in staff. requireRole
 * is what stands between that power and everyone who is not the owner — it
 * has to come first, before any input is even read.
 */
export async function addStaff(
  _prev: StaffState,
  formData: FormData,
): Promise<StaffState> {
  await requireRole("owner");

  const parsed = staffSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    role: formData.get("role"),
    // The designation select only renders for doctors; for every other role
    // FormData returns null, which .optional() rejects.
    specialty: formData.get("specialty") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const input = parsed.data;

  const photo = formImage(formData, "photo");
  if (photo) {
    const problem = imageProblem(photo);
    if (problem) return { error: problem };
  }

  const admin = createAdminClient();

  // A doctor's designation must be one the owner has defined.
  if (input.role === "doctor") {
    if (!input.specialty) return { error: "Pick a designation for the doctor." };
    const { data: known } = await admin
      .from("designations")
      .select("name")
      .eq("name", input.specialty)
      .maybeSingle();
    if (!known) return { error: "That designation no longer exists — pick another." };
  }

  const { data: existing } = await admin
    .from("staff")
    .select("id, is_active")
    .eq("email", input.email)
    .maybeSingle();

  if (existing) {
    return {
      error: existing.is_active
        ? "Someone with that email is already on the team."
        : "That email belongs to a deactivated account — reactivate it below instead.",
    };
  }

  // email_confirm skips the confirmation mail: there is no password to set,
  // they sign in with a one-time code.
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
  });

  if (authError || !created.user) {
    return { error: authError?.message ?? "Could not create the account." };
  }

  const { error: rowError } = await admin.from("staff").insert({
    id: created.user.id,
    email: input.email,
    full_name: input.full_name,
    role: input.role,
    specialty: input.role === "doctor" ? input.specialty || null : null,
  });

  if (rowError) {
    // Do not leave an auth user with no staff row: they would be able to
    // request a code and then land nowhere.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: rowError.message };
  }

  // The account exists by now; a photo that fails is reported, not undone.
  let photoNote = "";
  if (photo) {
    const stored = await storeImage(admin, "staff-photos", created.user.id, photo);
    if ("error" in stored) {
      photoNote = ` The photo was not saved: ${stored.error}`;
    } else {
      await admin.from("staff").update({ photo_path: stored.path }).eq("id", created.user.id);
    }
  }

  revalidateStaff();
  return {
    notice: `${input.full_name} can now sign in with ${input.email}.${photoNote}`,
  };
}

export async function setStaffActive(formData: FormData) {
  const owner = await requireRole("owner");

  const staffId = String(formData.get("staff_id") ?? "");
  const active = formData.get("active") === "1";
  if (!staffId) return;

  // Locking yourself out of the only owner account would need database access
  // to undo.
  if (staffId === owner.id && !active) return;

  const admin = createAdminClient();
  await admin.from("staff").update({ is_active: active }).eq("id", staffId);

  revalidateStaff();
}

// ---------------------------------------------------------- photo & site --

/** Replaces, or with `photo_remove=1` clears, someone's profile photo. */
export async function setStaffPhoto(
  _prev: StaffState,
  formData: FormData,
): Promise<StaffState> {
  await requireRole("owner");

  const staffId = String(formData.get("staff_id") ?? "");
  if (!z.uuid().safeParse(staffId).success) return { error: "Missing staff member." };
  const photo = formImage(formData, "photo");
  const remove = !photo && formData.get("photo_remove") === "1";
  if (!remove && !photo) return { error: "Choose a photo first." };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("staff")
    .select("photo_path")
    .eq("id", staffId)
    .maybeSingle();
  if (!row) return { error: "That staff member no longer exists." };

  let next: string | null = null;
  if (photo) {
    const stored = await storeImage(admin, "staff-photos", staffId, photo);
    if ("error" in stored) return { error: stored.error };
    next = stored.path;
  }

  const { error } = await admin.from("staff").update({ photo_path: next }).eq("id", staffId);
  if (error) {
    await removeImages(admin, "staff-photos", [next]);
    return { error: error.message };
  }
  await removeImages(admin, "staff-photos", [row.photo_path]);

  revalidateStaff();
  return { notice: next ? "Photo updated." : "Photo removed." };
}

/** Whether a doctor appears in the Doctors section of the website. */
export async function setStaffOnWebsite(formData: FormData) {
  await requireRole("owner");

  const staffId = String(formData.get("staff_id") ?? "");
  if (!z.uuid().safeParse(staffId).success) return;
  const show = formData.get("show") === "1";

  const admin = createAdminClient();
  await admin.from("staff").update({ show_on_website: show }).eq("id", staffId);

  revalidateStaff();
}

/** Changes an existing doctor's designation. */
export async function setStaffDesignation(formData: FormData) {
  await requireRole("owner");

  const staffId = String(formData.get("staff_id") ?? "");
  const name = String(formData.get("specialty") ?? "").trim();
  if (!z.uuid().safeParse(staffId).success || !name) return;

  const admin = createAdminClient();
  const { data: known } = await admin
    .from("designations")
    .select("name")
    .eq("name", name)
    .maybeSingle();
  if (!known) return;

  await admin
    .from("staff")
    .update({ specialty: name })
    .eq("id", staffId)
    .eq("role", "doctor");

  revalidateStaff();
}

// ---------------------------------------------------------- designations --

const designationName = z
  .string()
  .trim()
  .min(1, "Enter a designation.")
  .max(100, "Keep it under 100 characters.");

export async function addDesignation(
  _prev: StaffState,
  formData: FormData,
): Promise<StaffState> {
  await requireRole("owner");

  const parsed = designationName.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // RLS lets only the owner write here; the unique index on lower(name)
  // catches "Dermatologist" and "dermatologist" being added twice.
  const supabase = await createClient();
  const { error } = await supabase.from("designations").insert({ name: parsed.data });
  if (error) {
    return {
      error: error.code === "23505" ? "That designation is already on the list." : error.message,
    };
  }

  revalidatePath("/super-admin/owner/staff");
  return { notice: `"${parsed.data}" added.` };
}

/**
 * Takes a designation off the list. Doctors who already have it keep it: the
 * name is stored on their own row, not as a reference to this one.
 */
export async function removeDesignation(formData: FormData) {
  await requireRole("owner");

  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;

  const supabase = await createClient();
  await supabase.from("designations").delete().eq("id", id);

  revalidatePath("/super-admin/owner/staff");
}
