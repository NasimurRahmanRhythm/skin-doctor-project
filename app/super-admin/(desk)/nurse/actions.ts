"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const number = (min: number, max: number, label: string, required: boolean) =>
  z
    .string()
    .trim()
    .nullish()
    .refine((v) => !required || !!v, { message: `Enter the ${label}.` })
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), {
      message: `Enter a sensible ${label}.`,
    });

// The nurse desk takes four readings; only blood sugar may be skipped.
const vitalsSchema = z.object({
  height_cm: number(30, 250, "height", true),
  weight_kg: number(1, 400, "weight", true),
  blood_sugar: number(20, 800, "blood sugar", false),
  blood_pressure: z
    .string()
    .trim()
    .nullish()
    .refine((v) => !!v, { message: "Enter the blood pressure." })
    .refine((v) => !v || /^\d{2,3}\/\d{2,3}$/.test(v), {
      message: "Blood pressure goes in as 120/80.",
    }),
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
      blood_pressure: v.blood_pressure,
      blood_sugar: v.blood_sugar,
      nurse_id: staff.id,
      status: "awaiting_doctor",
    })
    .eq("id", visitId);

  if (error) return { error: error.message };

  revalidatePath("/super-admin/nurse");
  redirect("/super-admin/nurse?done=1");
}
