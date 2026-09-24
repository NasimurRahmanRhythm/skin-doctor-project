"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Clears the badge for one visit, called when the desk opens that patient. */
export async function markVisitRead(visitId: string) {
  const staff = await requireStaff();
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", staff.id)
    .eq("visit_id", visitId)
    .is("read_at", null);
}

export async function markAllRead() {
  const staff = await requireStaff();
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", staff.id)
    .is("read_at", null);

  revalidatePath("/super-admin/nurse");
  revalidatePath("/super-admin/doctor");
}
