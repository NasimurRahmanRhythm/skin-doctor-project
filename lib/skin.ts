/**
 * What reception records about a patient's skin. The values are what the
 * database stores (and constrains, see the reception_intake migration); the
 * labels are what every desk shows.
 */
export const SKIN_TYPES = [
  { value: "normal", label: "Normal" },
  { value: "dry", label: "Dry" },
  { value: "oily", label: "Oily" },
  { value: "combination", label: "Combination" },
  { value: "sensitive", label: "Sensitive" },
] as const;

export const SKIN_CONDITIONS = [
  { value: "acne", label: "Acne" },
  { value: "dry", label: "Dry" },
  { value: "hyperpigmentation", label: "Hyperpigmentation" },
  { value: "dehydrated", label: "Dehydrated" },
  { value: "allergies", label: "Allergies" },
  { value: "rosacea", label: "Rosacea" },
  { value: "other", label: "Other" },
] as const;

export type SkinType = (typeof SKIN_TYPES)[number]["value"];
export type SkinCondition = (typeof SKIN_CONDITIONS)[number]["value"];

export const SKIN_TYPE_VALUES = SKIN_TYPES.map((s) => s.value) as [
  SkinType,
  ...SkinType[],
];
export const SKIN_CONDITION_VALUES = SKIN_CONDITIONS.map((s) => s.value) as [
  SkinCondition,
  ...SkinCondition[],
];

/** "dry, oily" → "Dry, Oily". Unknown values pass through rather than vanish. */
export function skinLabels(
  values: string[] | null | undefined,
  options: readonly { value: string; label: string }[],
): string | null {
  if (!values || values.length === 0) return null;
  return values
    .map((v) => options.find((o) => o.value === v)?.label ?? v)
    .join(", ");
}
