import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "owner" | "receptionist" | "nurse" | "doctor";

export type SessionStaff = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  specialty: string | null;
  is_active: boolean;
};

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<AppRole, string> = {
  owner: "/super-admin/owner",
  receptionist: "/super-admin/reception",
  nurse: "/super-admin/nurse",
  doctor: "/super-admin/doctor",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  owner: "Owner",
  receptionist: "Reception",
  nurse: "Nurse desk",
  doctor: "Doctor desk",
};

/**
 * The signed-in staff member, or null.
 *
 * Reads through the anon key, so RLS decides what comes back — the
 * `staff_read_self` policy is what lets a person see their own row.
 */
export async function getSessionStaff(): Promise<SessionStaff | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("staff")
    .select("id, email, full_name, role, specialty, is_active")
    .eq("id", user.id)
    .single();

  // A deactivated account keeps its auth user but loses all access, so that
  // the owner can revoke someone the day they leave without deleting history.
  if (!data || !data.is_active) return null;

  return data as SessionStaff;
}

export async function requireStaff(): Promise<SessionStaff> {
  const staff = await getSessionStaff();
  if (!staff) redirect("/super-admin/login");
  return staff;
}

/** Guards a desk. Wrong role is sent to their own desk, not shown an error. */
export async function requireRole(...roles: AppRole[]): Promise<SessionStaff> {
  const staff = await requireStaff();
  if (!roles.includes(staff.role)) redirect(ROLE_HOME[staff.role]);
  return staff;
}
