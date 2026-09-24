"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const optionalNumber = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), {
      message: `Enter a sensible ${label}.`,
    });

const vitalsSchema = z.object({
  height_cm: optionalNumber(30, 250, "height"),
  weight_kg: optionalNumber(1, 400, "weight"),
  blood_sugar: optionalNumber(20, 800, "blood sugar"),
  temperature: optionalNumber(30, 45, "temperature"),
  pulse: optionalNumber(20, 250, "pulse"),
  blood_pressure: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{2,3}\/\d{2,3}$/.test(v), {
      message: "Blood pressure goes in as 120/80.",
    }),
  nurse_notes: z.string().trim().optional(),
});

export type VitalsState = { error?: string };

export async function saveVitals(
  _prev: VitalsState,
  formData: FormData,
): Promise<VitalsState> {
  const staff = await requireRole("nurse");
  const visitId = String(formData.get("visit_id") ?? "");
  if (!visitId) return { error: "Missing visit." };

  const parsed = vitalsSchema.safeParse({
    height_cm: formData.get("height_cm"),
    weight_kg: formData.get("weight_kg"),
    blood_pressure: formData.get("blood_pressure"),
    blood_sugar: formData.get("blood_sugar"),
    temperature: formData.get("temperature"),
    pulse: formData.get("pulse"),
    nurse_notes: formData.get("nurse_notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the vitals." };
  }
  const v = parsed.data;

  const supabase = await createClient();

  // Setting status here is what fires the database trigger that notifies the
  // assigned doctor, and what stamps vitals_at. Both happen in the same
  // transaction as this write.
  const { error } = await supabase
    .from("visits")
    .update({
      height_cm: v.height_cm,
      weight_kg: v.weight_kg,
      blood_pressure: v.blood_pressure || null,
      blood_sugar: v.blood_sugar,
      temperature: v.temperature,
      pulse: v.pulse,
      nurse_notes: v.nurse_notes || null,
      nurse_id: staff.id,
      status: "awaiting_doctor",
    })
    .eq("id", visitId);

  if (error) return { error: error.message };

  revalidatePath("/super-admin/nurse");
  redirect("/super-admin/nurse?done=1");
}
