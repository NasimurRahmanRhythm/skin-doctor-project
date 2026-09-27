"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { clinicToday } from "@/lib/clinic";
import { SKIN_CONDITION_VALUES, SKIN_TYPE_VALUES } from "@/lib/skin";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/uploads";

/** A patient on file, with what the desk needs to fill the form from it. */
export type PatientRecord = {
  id: string;
  patient_code: string;
  full_name: string;
  phone: string;
  date_of_birth: string | null;
  email: string | null;
  address: string | null;
  visitCount: number;
  /** Skin type rarely changes, so the last visit's answer is offered again. */
  lastSkinTypes: string[];
};

const PATIENT_FIELDS = "id, patient_code, full_name, phone, date_of_birth, email, address";

async function withHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patients: Omit<PatientRecord, "visitCount" | "lastSkinTypes">[],
): Promise<PatientRecord[]> {
  return Promise.all(
    patients.map(async (p) => {
      const { data: visits, count } = await supabase
        .from("visits")
        .select("skin_types", { count: "exact" })
        .eq("patient_id", p.id)
        .order("created_at", { ascending: false })
        .limit(1);
      return {
        ...p,
        visitCount: count ?? 0,
        lastSkinTypes: (visits?.[0]?.skin_types as string[] | null) ?? [],
      };
    }),
  );
}

/** An old patient, by the code on their slip or prescription. */
export async function findPatientByCode(code: string): Promise<PatientRecord | null> {
  await requireRole("receptionist");
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length < 3) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("patients")
    .select(PATIENT_FIELDS)
    .eq("patient_code", trimmed)
    .maybeSingle();

  if (!data) return null;
  const [record] = await withHistory(supabase, [data]);
  return record;
}

/**
 * Patients on file under a phone number. More than one is normal: a family
 * often shares a phone, so the desk picks the right person from the list.
 */
export async function findPatientsByPhone(phone: string): Promise<PatientRecord[]> {
  await requireRole("receptionist");
  const trimmed = phone.trim();
  if (trimmed.replace(/\D/g, "").length < 6) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("patients")
    .select(PATIENT_FIELDS)
    .ilike("phone", `%${trimmed}%`)
    .order("created_at", { ascending: false })
    .limit(6);

  return withHistory(supabase, data ?? []);
}

/** Blank inputs arrive as "" (or null when not rendered); both mean "not given". */
const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v || null);

const checkInSchema = z.object({
  full_name: z.string().trim().min(1, "Enter the patient name."),
  phone: z.string().trim().min(6, "Enter a phone number."),
  date_of_birth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date of birth.")
    .refine((v) => v > "1890-01-01" && v <= clinicToday(), {
      message: "Enter a valid date of birth.",
    }),
  address: optionalText,
  email: optionalText.pipe(
    z.email("Enter a valid email address, or leave it blank.").nullable(),
  ),
  skin_types: z.array(z.enum(SKIN_TYPE_VALUES)),
  skin_conditions: z.array(z.enum(SKIN_CONDITION_VALUES)),
  notes: optionalText,
  // Set when the desk picked an old patient; absent for a new one.
  patient_id: z.uuid().nullish().catch(null),
  // "any" means no preference: the database picks the least-loaded doctor.
  preferred_doctor: z.union([z.literal("any"), z.uuid()]).catch("any"),
});

export type CheckInState = {
  error?: string;
  success?: {
    visitCode: string;
    patientCode: string;
    patientName: string;
    doctorName: string;
    returning: boolean;
    visitId: string;
    attachments: string[];
    /** Set when the visit was created but a file did not make it up. */
    fileWarning?: string;
  };
};

/** What a patient can hand over the desk: a scan, a photo, or a PDF report. */
const MAX_FILES = 5;
const ACCEPTED = /^(application\/pdf|image\/(jpeg|png|webp|heic|heif|gif))$/i;

/**
 * Stores whatever the patient brought in, as `intake` entries on the visit.
 *
 * Deliberately runs after the visit row exists and never unwinds it: a scanner
 * that fails is not a reason to un-check-in a patient who is already standing
 * at the desk, and the nurse has been notified by then anyway. Any failure is
 * reported back as a warning so the desk can retry from the doctor's page.
 */
async function attachIntakeFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitId: string,
  staffId: string,
  files: File[],
): Promise<{ names: string[]; warning?: string }> {
  const names: string[] = [];

  for (const file of files) {
    if (file.size === 0) continue;
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        names,
        warning: `"${file.name}" is over ${MAX_UPLOAD_LABEL} and was not attached.`,
      };
    }
    if (!ACCEPTED.test(file.type)) {
      return { names, warning: `"${file.name}" is not a PDF or an image.` };
    }

    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    const path = `visits/${visitId}/${crypto.randomUUID()}-${safeName}`;

    const { error: upErr } = await supabase.storage
      .from("patient-files")
      .upload(path, file, { contentType: file.type || undefined });

    if (upErr) return { names, warning: `Could not upload "${file.name}": ${upErr.message}` };

    const { error: rowErr } = await supabase.from("visit_entries").insert({
      visit_id: visitId,
      type: "intake",
      title: file.name,
      file_path: path,
      file_name: file.name,
      file_type: file.type || null,
      author_id: staffId,
    });

    if (rowErr) {
      // A file nothing points at is invisible to every desk, so clean it up.
      await supabase.storage.from("patient-files").remove([path]);
      return { names, warning: `Could not attach "${file.name}": ${rowErr.message}` };
    }

    names.push(file.name);
  }

  return { names };
}

export async function checkIn(
  _prev: CheckInState,
  formData: FormData,
): Promise<CheckInState> {
  const staff = await requireRole("receptionist");

  const parsed = checkInSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    date_of_birth: formData.get("date_of_birth"),
    address: formData.get("address"),
    email: formData.get("email"),
    skin_types: formData.getAll("skin_types"),
    skin_conditions: formData.getAll("skin_conditions"),
    notes: formData.get("notes"),
    patient_id: formData.get("patient_id") || null,
    preferred_doctor: formData.get("preferred_doctor"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const input = parsed.data;

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length > MAX_FILES) {
    return { error: `Attach at most ${MAX_FILES} files.` };
  }

  const supabase = await createClient();

  // Old or new is the desk's call. An old patient comes with the exact record
  // the desk picked — a phone alone cannot say which one, since a family may
  // share it. A new patient always gets a record of their own.
  let existing: {
    id: string;
    patient_code: string;
    date_of_birth: string | null;
    email: string | null;
    address: string | null;
  } | null = null;

  if (input.patient_id) {
    const { data, error: lookupError } = await supabase
      .from("patients")
      .select("id, patient_code, date_of_birth, email, address")
      .eq("id", input.patient_id)
      .maybeSingle();
    if (lookupError) return { error: lookupError.message };
    if (!data) return { error: "That patient could not be found. Look them up again." };
    existing = data;
  }

  let patientId: string;
  let patientCode: string;

  if (existing) {
    patientId = existing.id;
    patientCode = existing.patient_code;

    // Fill in what the record is missing — most returning patients were
    // checked in before DOB and email were asked — but never overwrite what
    // is already on file from a single desk entry.
    const fill: Record<string, string> = {};
    if (!existing.date_of_birth) fill.date_of_birth = input.date_of_birth;
    if (!existing.email && input.email) fill.email = input.email;
    if (!existing.address && input.address) fill.address = input.address;
    if (Object.keys(fill).length > 0) {
      await supabase.from("patients").update(fill).eq("id", patientId);
    }
  } else {
    const { data: created, error: insertError } = await supabase
      .from("patients")
      .insert({
        full_name: input.full_name,
        phone: input.phone,
        date_of_birth: input.date_of_birth,
        email: input.email,
        address: input.address,
        created_by: staff.id,
      })
      .select("id, patient_code")
      .single();

    if (insertError || !created) {
      return { error: insertError?.message ?? "Could not create the patient." };
    }
    patientId = created.id;
    patientCode = created.patient_code;
  }

  const wasRequested = input.preferred_doctor !== "any";

  // Assignment happens in the database so the load count and the pick cannot
  // drift apart when two receptionists check in at once. A requested doctor
  // who has since been deactivated falls back to the least-loaded one.
  const { data: doctorId, error: assignError } = await supabase.rpc(
    "assign_doctor",
    { p_preferred: wasRequested ? input.preferred_doctor : null },
  );

  if (assignError) return { error: assignError.message };
  if (!doctorId) {
    return { error: "No active doctor is available. Ask the owner to add one." };
  }

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .insert({
      patient_id: patientId,
      receptionist_id: staff.id,
      doctor_id: doctorId,
      doctor_requested: wasRequested && doctorId === input.preferred_doctor,
      visit_type: existing ? "returning" : "new",
      skin_types: input.skin_types,
      skin_conditions: input.skin_conditions,
      intake_notes: input.notes,
    })
    .select("id, visit_code")
    .single();

  if (visitError || !visit) {
    return { error: visitError?.message ?? "Could not create the visit." };
  }

  const attached = files.length
    ? await attachIntakeFiles(supabase, visit.id, staff.id, files)
    : { names: [] as string[] };

  const { data: doctor } = await supabase
    .from("staff_directory")
    .select("full_name")
    .eq("id", doctorId)
    .single();

  revalidatePath("/super-admin/reception");

  return {
    success: {
      visitCode: visit.visit_code,
      visitId: visit.id,
      patientCode,
      patientName: input.full_name,
      doctorName: doctor?.full_name ?? "Assigned doctor",
      returning: Boolean(existing),
      attachments: attached.names,
      fileWarning: attached.warning,
    },
  };
}
