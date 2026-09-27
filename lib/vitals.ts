/**
 * Body-mass index from the nurse's height and weight, to one decimal.
 *
 * Never stored: it is arithmetic on two columns that are, so it cannot drift
 * out of step with them. Numeric columns arrive from PostgREST as strings.
 */
export function bmi(
  heightCm: number | string | null | undefined,
  weightKg: number | string | null | undefined,
): number | null {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  if (!h || !w || !Number.isFinite(h) || !Number.isFinite(w)) return null;
  return Math.round((w / (h * h)) * 10) / 10;
}

/** The standard adult bands (WHO), as the doctor would read them off a chart. */
export function bmiCategory(value: number): string {
  if (value < 18.5) return "Underweight";
  if (value < 25) return "Normal";
  if (value < 30) return "Overweight";
  return "Obese";
}

/** "22.4 (Normal)", or null when height or weight is missing. */
export function bmiLabel(
  heightCm: number | string | null | undefined,
  weightKg: number | string | null | undefined,
): string | null {
  const value = bmi(heightCm, weightKg);
  return value === null ? null : `${value} (${bmiCategory(value)})`;
}
