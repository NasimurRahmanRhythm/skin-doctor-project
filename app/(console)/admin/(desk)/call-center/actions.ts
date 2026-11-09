"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { callSchema, type PhoneLookup } from "@/lib/call-log";
import { getCallOptions } from "@/lib/call-log-query";
import { createClient } from "@/lib/supabase/server";

export type LogCallState = { error?: string; savedAt?: number };

/**
 * Saves one call for the signed-in agent. The insert policy sets who logged
 * it to the caller, and there is no editing or deleting afterwards — the form
 * asks the agent to check everything before it gets here.
 */
export async function logCall(_prev: LogCallState, formData: FormData): Promise<LogCallState> {
  const staff = await requireRole("call_center");

  const parsed = callSchema.safeParse({
    customer_name: formData.get("customer_name"),
    phone: formData.get("phone"),
    call_type: formData.get("call_type"),
    reason: formData.get("reason"),
    product: formData.get("product"),
    outcome: formData.get("outcome"),
    duration_min: formData.get("duration_min"),
    follow_up_date: formData.get("follow_up_date"),
    recording_url: formData.get("recording_url"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await createClient();
  // Only choices the owner has left turned on can be picked for a new call.
  const options = await getCallOptions(supabase);
  const on = (list: { value: string; active: boolean }[], v: string) =>
    list.some((o) => o.value === v && o.active);
  if (!on(options.reasons, parsed.data.reason)) return { error: "That reason is no longer offered — pick another." };
  if (!on(options.outcomes, parsed.data.outcome)) return { error: "That outcome is no longer offered — pick another." };

  const { error } = await supabase
    .from("call_logs")
    .insert({ ...parsed.data, agent_id: staff.id });
  if (error) return { error: error.message };

  revalidatePath("/admin/call-center");
  revalidatePath("/admin/owner/call-center");
  return { savedAt: Date.now() };
}

/** What is known about a number while the agent types it. */
export async function lookupPhone(phone: string): Promise<PhoneLookup | null> {
  await requireRole("call_center");
  if (phone.replace(/\D/g, "").length < 6) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("call_lookup", { p_phone: phone.slice(0, 40) });
  if (error || !data) return null;
  return data as PhoneLookup;
}
