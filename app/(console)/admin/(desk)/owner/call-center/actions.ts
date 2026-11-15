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

/** How wide each column opens in Excel, in characters. */
const XLSX_WIDTH: Record<ExportField, number> = {
  call_time: 18,
  agent: 18,
  customer_name: 24,
  phone: 16,
  call_type: 11,
  reason: 18,
  product: 24,
  outcome: 18,
  duration_min: 14,
  follow_up_date: 15,
  recording_url: 30,
  notes: 50,
};

/** A Dhaka wall-clock time as a Date Excel shows unchanged (Excel has no time zones). */
const excelTime = (iso: string) => new Date(`${callTime(iso).replace(" ", "T")}:00Z`);
const excelDay = (day: string) => new Date(`${day}T00:00:00Z`);

export type ExportFormat = "csv" | "xlsx";
export type ExportResult = {
  /** CSV text, or the .xlsx file as base64. */
  data?: string;
  filename?: string;
  error?: string;
};

/**
 * Every call matching the owner's filters — not just the page on screen — as
 * CSV or an Excel workbook, with the columns they picked in the order they put
 * them. The choice is saved on their staff row, so the dialog opens the same
 * way next time.
 */
export async function exportCalls(
  filtersInput: CallFilters,
  fieldsInput: string[],
  format: ExportFormat = "csv",
): Promise<ExportResult> {
  const owner = await requireRole("owner", "supervisor");
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
  const filename = `dermasoul-calls-${clinicToday()}.${format}`;
  revalidatePath("/admin/owner/call-center");

  if (format === "csv") {
    const lines = [
      fields.map((f) => cell(labelOf.get(f))).join(","),
      ...rows.map((c) => fields.map((f) => cell(value[f](c))).join(",")),
    ];
    return { data: lines.join("\r\n"), filename };
  }

  // Excel: real dates and numbers (so they sort and add up), a bold header
  // that stays put while scrolling, a filter on every column, clickable
  // recording links.
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  book.creator = "DermaSoul Medical Aesthetics";
  const sheet = book.addWorksheet("Calls", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = fields.map((f) => ({ header: labelOf.get(f), key: f, width: XLSX_WIDTH[f] }));
  sheet.getRow(1).font = { bold: true };

  const typed: Partial<Record<ExportField, (c: CallLog) => unknown>> = {
    call_time: (c) => excelTime(c.created_at),
    duration_min: (c) => (c.duration_min != null ? Number(c.duration_min) : null),
    follow_up_date: (c) => (c.follow_up_date ? excelDay(c.follow_up_date) : null),
    recording_url: (c) => (c.recording_url ? { text: c.recording_url, hyperlink: c.recording_url } : null),
  };
  for (const c of rows) {
    sheet.addRow(Object.fromEntries(fields.map((f) => [f, (typed[f] ?? value[f])(c) ?? null])));
  }

  const formats: Partial<Record<ExportField, string>> = {
    call_time: "yyyy-mm-dd hh:mm",
    follow_up_date: "yyyy-mm-dd",
    duration_min: "0.0",
  };
  fields.forEach((f, i) => {
    const col = sheet.getColumn(i + 1);
    if (formats[f]) col.numFmt = formats[f]!;
    if (f === "notes") col.alignment = { wrapText: true, vertical: "top" };
  });
  if (rows.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: fields.length } };

  const buffer = await book.xlsx.writeBuffer();
  return { data: Buffer.from(buffer).toString("base64"), filename };
}
