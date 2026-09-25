import { z } from "zod";
import { CLINIC_TZ, clinicToday } from "@/lib/clinic";
import { SKIN_CONDITIONS, SKIN_TYPES, skinLabels } from "@/lib/skin";

/**
 * The prescription pad: what the doctor writes, in the shape it prints.
 * Stored as separate columns on public.visits (see the prescription_pad
 * migration); this module is the one place that knows how to read, fill and
 * validate them.
 */

export const DURATION_UNITS = ["continue", "days", "weeks", "months"] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

export type Duration =
  | { unit: "continue" }
  | { unit: "days" | "weeks" | "months"; count: number };

export type Medicine = {
  name: string;
  /** Morning + noon + night. Strings, so "½" is a valid dose. */
  dose: [string, string, string];
  meal: "after" | "before";
  duration: Duration;
};

export type Investigation = { name: string; result: string };

export type PadData = {
  complaints: string[];
  examinations: string[];
  investigations: Investigation[];
  advices: string[];
  medicines: Medicine[];
};

// ------------------------------------------------------------ validation --

const line = z.string().trim().min(1).max(300);
const doseSlot = z.string().trim().max(4);

export const medicineSchema = z.object({
  name: z.string().trim().min(1, "Every medicine needs a name.").max(200),
  dose: z.tuple([doseSlot, doseSlot, doseSlot]),
  meal: z.enum(["after", "before"]),
  duration: z.discriminatedUnion("unit", [
    z.object({ unit: z.literal("continue") }),
    z.object({
      unit: z.enum(["days", "weeks", "months"]),
      count: z.number().int().min(1).max(365),
    }),
  ]),
});

export const padSchema = z.object({
  complaints: z.array(line).max(50),
  examinations: z.array(line).max(50),
  investigations: z
    .array(
      z.object({
        name: line,
        result: z.string().trim().max(200),
      }),
    )
    .max(50),
  advices: z.array(line).max(50),
  medicines: z.array(medicineSchema).max(40),
});

// --------------------------------------------------------------- reading --

/** The visit columns the pad is built from. */
export type PadSource = {
  complaints: string[] | null;
  examinations: string[] | null;
  investigations: unknown;
  advices: string[] | null;
  medicines: unknown;
  // pre-fill sources
  height_cm: number | string | null;
  weight_kg: number | string | null;
  blood_pressure: string | null;
  blood_sugar: number | string | null;
  skin_types: string[] | null;
  skin_conditions: string[] | null;
  // older visits, written before the pad existed
  advice?: string | null;
};

export const PAD_COLUMNS =
  "complaints, examinations, investigations, advices, medicines, " +
  "height_cm, weight_kg, blood_pressure, blood_sugar, skin_types, skin_conditions, " +
  "diagnosis, prescription, advice";

/** Numeric columns come back from PostgREST as strings; "66.00" reads badly. */
function num(v: number | string | null): string | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : null;
}

/** What the nurse measured, as the first lines of On Examination. */
export function examinationsFromVitals(v: PadSource): string[] {
  const out: string[] = [];
  const w = num(v.weight_kg);
  const h = num(v.height_cm);
  const s = num(v.blood_sugar);
  if (w) out.push(`Weight: ${w} kg`);
  if (h) out.push(`Height: ${h} cm`);
  if (v.blood_pressure) out.push(`BP: ${v.blood_pressure} mmHg`);
  if (s) out.push(`Blood sugar: ${s} mg/dL`);
  const skin = skinLabels(v.skin_types, SKIN_TYPES);
  if (skin) out.push(`Skin type: ${skin}`);
  return out;
}

/** Reception's ticked conditions, as a starting list of complaints. */
function complaintsFromIntake(v: PadSource): string[] {
  return (v.skin_conditions ?? [])
    .filter((c) => c !== "other")
    .map((c) => skinLabels([c], SKIN_CONDITIONS) ?? c);
}

function safeArray<T>(value: unknown, schema: z.ZodType<T>): T[] | null {
  if (value == null) return null;
  const parsed = z.array(schema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

/**
 * The pad as it should appear right now. Anything the doctor has not written
 * yet is pre-filled from what the nurse and reception recorded.
 */
export function readPad(v: PadSource): PadData {
  return {
    complaints: v.complaints ?? complaintsFromIntake(v),
    examinations: v.examinations ?? examinationsFromVitals(v),
    investigations:
      safeArray(v.investigations, padSchema.shape.investigations.element) ?? [],
    advices: v.advices ?? (v.advice ? [v.advice] : []),
    medicines: safeArray(v.medicines, medicineSchema) ?? [],
  };
}

// ------------------------------------------------------------ formatting --

export function formatDose(dose: Medicine["dose"]): string {
  return dose.map((d) => d.trim() || "0").join(" + ");
}

export const MEAL_LABEL: Record<Medicine["meal"], string> = {
  after: "After meal",
  before: "Before meal",
};

export function formatDuration(d: Duration): string {
  if (d.unit === "continue") return "Continue";
  const unit = d.count === 1 ? d.unit.slice(0, -1) : d.unit;
  return `${d.count} ${unit}`;
}

/** "53 Yrs 5 M" from a date of birth, the way the pad prints it. */
export function ageLabel(p: {
  date_of_birth?: string | null;
  age?: number | null;
}): string | null {
  if (!p.date_of_birth) return p.age != null ? `${p.age} Yrs` : null;
  const [y, m, d] = p.date_of_birth.split("-").map(Number);
  const [ty, tm, td] = clinicToday().split("-").map(Number);
  let months = (ty - y) * 12 + (tm - m) - (td < d ? 1 : 0);
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} M`;
  return rest ? `${years} Yrs ${rest} M` : `${years} Yrs`;
}

export function emptyMedicine(name: string): Medicine {
  return {
    name,
    dose: ["0", "0", "0"],
    meal: "after",
    duration: { unit: "continue" },
  };
}

/** The pad's date, "25/09/2026", in the clinic's timezone. */
export function formatPadDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}
