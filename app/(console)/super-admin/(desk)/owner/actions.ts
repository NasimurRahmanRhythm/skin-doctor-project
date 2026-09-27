"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type StaffState = { error?: string; notice?: string };

const staffSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  full_name: z.string().trim().min(1, "Enter their name."),
  role: z.enum(["owner", "receptionist", "nurse", "doctor"]),
  specialty: z.string().trim().optional(),
});

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
    // The specialty input only renders for doctors; for every other role
    // FormData returns null, which .optional() rejects.
    specialty: formData.get("specialty") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const input = parsed.data;

  const admin = createAdminClient();

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

  revalidatePath("/super-admin/owner/staff");
  return { notice: `${input.full_name} can now sign in with ${input.email}.` };
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

  revalidatePath("/super-admin/owner/staff");
}
