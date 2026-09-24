"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/uploads";

export type ConsultState = { error?: string; saved?: boolean };

const consultSchema = z.object({
  diagnosis: z.string().trim().optional(),
  prescription: z.string().trim().optional(),
  advice: z.string().trim().optional(),
  follow_up_date: z.string().trim().optional(),
});

export async function saveConsultation(
  _prev: ConsultState,
  formData: FormData,
): Promise<ConsultState> {
  await requireRole("doctor");
  const visitId = String(formData.get("visit_id") ?? "");
  const complete = formData.get("complete") === "1";
  if (!visitId) return { error: "Missing visit." };

  const parsed = consultSchema.safeParse({
    diagnosis: formData.get("diagnosis"),
    prescription: formData.get("prescription"),
    advice: formData.get("advice"),
    follow_up_date: formData.get("follow_up_date"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const c = parsed.data;

  if (complete && !c.diagnosis) {
    return { error: "Add a diagnosis before completing the visit." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("visits")
    .update({
      diagnosis: c.diagnosis || null,
      prescription: c.prescription || null,
      advice: c.advice || null,
      follow_up_date: c.follow_up_date || null,
      ...(complete ? { status: "completed" as const } : {}),
    })
    .eq("id", visitId);

  if (error) return { error: error.message };

  revalidatePath(`/super-admin/doctor/${visitId}`);
  revalidatePath("/super-admin/doctor");
  return { saved: true };
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
