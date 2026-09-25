"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { padSchema, type PadData } from "@/lib/prescription";
import { createClient } from "@/lib/supabase/server";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/uploads";

export type SavePadResult = { error?: string; savedAt?: string };

/**
 * Saves the prescription pad. Called by the editor's autosave, so it takes the
 * pad as data rather than a form, and is safe to call repeatedly.
 *
 * `complete` also moves the visit to completed. Nothing is required to
 * complete: a follow-up that only reviews results can end with an empty Rx.
 */
export async function savePad(
  visitId: string,
  pad: PadData,
  complete = false,
): Promise<SavePadResult> {
  await requireRole("doctor");
  if (!z.uuid().safeParse(visitId).success) return { error: "Missing visit." };

  const parsed = padSchema.safeParse(pad);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the prescription." };
  }
  const p = parsed.data;

  // RLS limits this to the doctor's own visits; the column guard keeps the
  // nurse's vitals out of reach.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visits")
    .update({
      complaints: p.complaints,
      examinations: p.examinations,
      investigations: p.investigations,
      advices: p.advices,
      medicines: p.medicines,
      ...(complete ? { status: "completed" as const } : {}),
    })
    .eq("id", visitId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "This visit is not assigned to you." };

  if (complete) {
    revalidatePath(`/super-admin/doctor/${visitId}`);
    revalidatePath("/super-admin/doctor");
  }
  return { savedAt: new Date().toISOString() };
}

export type EntryState = { error?: string; saved?: boolean };

export async function addEntry(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  const staff = await requireRole("doctor");
  const visitId = String(formData.get("visit_id") ?? "");
  const type = String(formData.get("type") ?? "note");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const file = formData.get("file");

  if (!visitId) return { error: "Missing visit." };
  if (!title) return { error: "Give this entry a title." };
  if (!["prescription", "report", "note", "file"].includes(type)) {
    return { error: "Unknown entry type." };
  }

  const supabase = await createClient();

  let filePath: string | null = null;
  let fileName: string | null = null;
  let fileType: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        error: `That file is over ${MAX_UPLOAD_LABEL}. Compress it and try again.`,
      };
    }
    // Path is keyed by visit so the owner can find everything for a patient,
    // and the random prefix stops two uploads of "report.pdf" colliding.
    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    const path = `visits/${visitId}/${crypto.randomUUID()}-${safeName}`;

    const { error: upErr } = await supabase.storage
      .from("patient-files")
      .upload(path, file, { contentType: file.type || undefined });

    if (upErr) return { error: `Upload failed: ${upErr.message}` };

    filePath = path;
    fileName = file.name;
    fileType = file.type || null;
  }

  const { error } = await supabase.from("visit_entries").insert({
    visit_id: visitId,
    type,
    title,
    body: body || null,
    file_path: filePath,
    file_name: fileName,
    file_type: fileType,
    author_id: staff.id,
  });

  if (error) {
    // Do not leave an orphan object in storage if the row failed.
    if (filePath) {
      await supabase.storage.from("patient-files").remove([filePath]);
    }
    return { error: error.message };
  }

  revalidatePath(`/super-admin/doctor/${visitId}`);
  return { saved: true };
}
