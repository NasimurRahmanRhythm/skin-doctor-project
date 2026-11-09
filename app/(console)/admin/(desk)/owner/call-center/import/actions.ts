"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  checkRows,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  parseCsv,
  type ImportDefaults,
} from "@/lib/call-import";
import { getCallOptions } from "@/lib/call-log-query";
import { CLINIC_UTC_OFFSET } from "@/lib/clinic";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ImportResult = { error?: string; imported?: number; skipped?: number };

/**
 * Imports the CSV the owner previewed. The file is read and every row checked
 * again here — nothing the browser worked out is trusted — and only the rows
 * that pass go in, marked as imported (so a complaint among them does not
 * ring the owner's alert).
 */
export async function importCalls(csv: string, defaults: ImportDefaults): Promise<ImportResult> {
  await requireRole("owner");
  if (csv.length > MAX_IMPORT_BYTES) return { error: "The file is over 2 MB. Split it and import the parts." };

  const rows = parseCsv(csv);
  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    return { error: `The file has more than ${MAX_IMPORT_ROWS} calls. Split it and import the parts.` };
  }

  const supabase = await createClient();
  const [options, { data: people }] = await Promise.all([
    getCallOptions(supabase),
    supabase.from("staff_directory").select("id, full_name"),
  ]);
  const agents = (people ?? []).map((p) => ({ id: p.id as string, full_name: p.full_name as string }));
  if (!agents.some((a) => a.id === defaults.agentId)) return { error: "Pick who the calls belong to." };

  const { checked, missing } = checkRows(rows, {
    options,
    agents,
    defaults,
    utcOffset: CLINIC_UTC_OFFSET,
    now: new Date(),
  });
  if (missing.length) return { error: "The file needs a Customer column and a Phone column." };

  const good = checked.flatMap((c) => (c.row ? [{ ...c.row, source: "import" }] : []));
  if (good.length === 0) return { error: "No row in the file can be imported." };

  // Agents may only log their own calls, so the owner's import writes with
  // the service role — after requireRole above, and with every row checked.
  const admin = createAdminClient();
  for (let i = 0; i < good.length; i += 500) {
    const { error } = await admin.from("call_logs").insert(good.slice(i, i + 500));
    if (error) {
      return {
        error: `Stopped after ${i} calls: ${error.message}`,
        imported: i,
        skipped: checked.length - good.length,
      };
    }
  }

  revalidatePath("/admin/owner/call-center");
  revalidatePath("/admin/call-center");
  return { imported: good.length, skipped: checked.length - good.length };
}
