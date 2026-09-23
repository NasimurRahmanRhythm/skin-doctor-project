"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PatientMatch = {
  id: string;
  patient_code: string;
  full_name: string;
  age: number | null;
  visitCount: number;
} | null;

/**
 * Looks a patient up by phone so the desk can see, before submitting, that
 * this is someone the clinic already knows. Prevents a second patient record
 * for the same person, which would split their history in two.
 */
export async function lookupPatient(phone: string): Promise<PatientMatch> {
  await requireRole("receptionist");
  const trimmed = phone.trim();
  if (trimmed.length < 6) return null;

  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, patient_code, full_name, age")
    .eq("phone", trimmed)
    .maybeSingle();

  if (!patient) return null;

  const { count } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patient.id);

  return { ...patient, visitCount: count ?? 0 };
}

const checkInSchema = z.object({
  full_name: z.string().trim().min(1, "Enter the patient name."),
  phone: z.string().trim().min(6, "Enter a phone number."),
  age: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v < 130), {
      message: "Enter a valid age.",
    }),
  gender: z.string().trim().optional(),
  address: z.string().trim().optional(),
  chief_complaint: z.string().trim().optional(),
  // "any" means no preference, so the database picks the least-loaded doctor.
  preferred_doctor: z.string().trim(),
});

export type CheckInState = {
  error?: string;
  success?: {
    visitCode: string;
    patientCode: string;
    patientName: string;
    doctorName: string;
    wasRequested: boolean;
    returning: boolean;
    visitId: string;
  };
};

export async function checkIn(
  _prev: CheckInState,
  formData: FormData,
): Promise<CheckInState> {
  const staff = await requireRole("receptionist");

  const parsed = checkInSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    age: formData.get("age"),
    gender: formData.get("gender"),
    address: formData.get("address"),
    chief_complaint: formData.get("chief_complaint"),
    preferred_doctor: formData.get("preferred_doctor"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const input = parsed.data;
  const supabase = await createClient();

  // New vs returning is decided by the phone number on record, not by what the
  // desk ticked. The number is the only evidence we actually have, and it keeps
  // one person from ending up with two patient codes.
  const { data: existing, error: lookupError } = await supabase
    .from("patients")
    .select("id, patient_code")
    .eq("phone", input.phone)
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };

  let patientId: string;
  let patientCode: string;

  if (existing) {
    patientId = existing.id;
    patientCode = existing.patient_code;
  } else {
    const { data: created, error: insertError } = await supabase
      .from("patients")
      .insert({
        full_name: input.full_name,
        phone: input.phone,
        age: input.age,
        gender: input.gender || null,
        address: input.address || null,
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
  // drift apart when two receptionists check patients in at the same moment.
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
      doctor_requested: wasRequested,
      visit_type: existing ? "returning" : "new",
      chief_complaint: input.chief_complaint || null,
    })
    .select("id, visit_code")
    .single();

  if (visitError || !visit) {
    return { error: visitError?.message ?? "Could not create the visit." };
  }

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
      wasRequested,
      returning: Boolean(existing),
    },
  };
}
