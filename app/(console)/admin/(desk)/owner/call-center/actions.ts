"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  CALL_COLUMNS,
  CALL_TYPES,
  cleanFields,
  EXPORT_FIELDS,
  optionLabel,
  type CallLog,
  type ExportField,
} from "@/lib/call-log";
import { applyCallFilters, getCallOptions, readCallFilters, type CallFilters } from "@/lib/call-log-query";
import { CLINIC_TZ, clinicToday } from "@/lib/clinic";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Deletes a call logged by mistake. Only the owner can; RLS says so too. */
export async function deleteCall(formData: FormData) {
  await requireRole("owner");
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;

  const supabase = await createClient();
  await supabase.from("call_logs").delete().eq("id", id);

  revalidatePath("/admin/owner/call-center");
  revalidatePath("/admin/call-center");
}

/** "2026-11-08 14:05", at the clinic. */
function callTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/**
 * Every call matching the owner's filters — not just the page on screen — as
 * CSV, with the columns they picked in the order they put them. The choice is
 * saved on their staff row, so the dialog opens the same way next time.
 */
export async function exportCalls(
  filtersInput: CallFilters,
  fieldsInput: string[],
): Promise<{ csv?: string; filename?: string; error?: string }> {
  const owner = await requireRole("owner");
  // Both arrive from the browser: checked again here.
  const filters = readCallFilters({ ...filtersInput });
  const fields = cleanFields(fieldsInput);
  if (fields.length === 0) return { error: "Pick at least one field." };

  const admin = createAdminClient();
  await admin.from("staff").update({ call_export_fields: fields }).eq("id", owner.id);

  const supabase = await createClient();
  // PostgREST hands back at most 1,000 rows at a time.
  const rows: CallLog[] = [];
  for (let from = 0; ; from += 1000) {
    const base = supabase.from("call_logs").select(CALL_COLUMNS);
    const query = applyCallFilters(base, filters);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (error) return { error: error.message };
    rows.push(...((data ?? []) as unknown as CallLog[]));
    if (!data || data.length < 1000) break;
  }

  const [{ data: people }, options] = await Promise.all([
    supabase.from("staff_directory").select("id, full_name"),
    getCallOptions(supabase),
  ]);
  const nameById = new Map((people ?? []).map((p) => [p.id as string, p.full_name as string]));

  const value: Record<ExportField, (c: CallLog) => unknown> = {
    call_time: (c) => callTime(c.created_at),
    agent: (c) => nameById.get(c.agent_id) ?? "Unknown",
    customer_name: (c) => c.customer_name,
    phone: (c) => c.phone,
    call_type: (c) => optionLabel(CALL_TYPES, c.call_type),
    reason: (c) => optionLabel(options.reasons, c.reason),
    product: (c) => c.product,
    outcome: (c) => optionLabel(options.outcomes, c.outcome),
    duration_min: (c) => (c.duration_min != null ? Number(c.duration_min) : ""),
    follow_up_date: (c) => c.follow_up_date,
    recording_url: (c) => c.recording_url,
    notes: (c) => c.notes,
  };
  const labelOf = new Map(EXPORT_FIELDS.map((f) => [f.key, f.label]));

  const lines = [
    fields.map((f) => cell(labelOf.get(f))).join(","),
    ...rows.map((c) => fields.map((f) => cell(value[f](c))).join(",")),
  ];

  revalidatePath("/admin/owner/call-center");
  return { csv: lines.join("\r\n"), filename: `dermasoul-calls-${clinicToday()}.csv` };
}
