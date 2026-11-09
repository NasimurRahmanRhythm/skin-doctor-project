"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * "Send to reception": tells every receptionist this caller is coming in, with
 * a link that opens check-in already filled with their name and number. The
 * agent who logged the call or the owner may send it; the database checks.
 */
export async function referCall(formData: FormData) {
  await requireRole("call_center", "owner");
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;

  const supabase = await createClient();
  await supabase.rpc("refer_call_to_reception", { p_call: id });

  revalidatePath("/admin/call-center");
  revalidatePath("/admin/owner/call-center");
}
