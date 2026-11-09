import { z } from "zod";

/**
 * The call center's log (public.call_logs): what an agent records about each
 * call, and the CSV columns the owner can export. The database stores the
 * short values; these are the labels people see.
 *
 * Reasons and outcomes are the owner's to edit (public.call_options); the
 * lists below are the starting set, used until that table exists.
 */

export const CALL_TYPES = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
] as const;

/** A Reason or Outcome choice; `active` ones are offered in the form. */
export type CallOption = { value: string; label: string; active: boolean; builtIn?: boolean };
export type CallOptions = { reasons: CallOption[]; outcomes: CallOption[] };

export const CALL_REASONS = [
  { value: "product_inquiry", label: "Product inquiry" },
  { value: "order", label: "Order" },
  { value: "complaint", label: "Complaint" },
  { value: "follow_up", label: "Follow-up" },
  { value: "other", label: "Other" },
] as const;

export const CALL_OUTCOMES = [
  { value: "sold", label: "Sold" },
  { value: "callback_needed", label: "Callback needed" },
  { value: "resolved", label: "Resolved" },
  { value: "no_answer", label: "No answer" },
  { value: "not_interested", label: "Not interested" },
] as const;

type Option = { readonly value: string; readonly label: string };
const values = <T extends readonly Option[]>(list: T) =>
  list.map((o) => o.value) as unknown as [T[number]["value"], ...T[number]["value"][]];

/** The starting set, as CallOptions, for before call_options exists. */
export const DEFAULT_CALL_OPTIONS: CallOptions = {
  reasons: CALL_REASONS.map((o) => ({ ...o, active: true })),
  outcomes: CALL_OUTCOMES.map((o) => ({ ...o, active: true })),
};

/** An option's stored value: lower-case words joined by underscores. */
export const OPTION_VALUE = /^[a-z0-9_]{1,40}$/;

/** The label for a stored value, or the value itself if it is unknown. */
export function optionLabel(list: readonly Option[], value: string | null | undefined): string {
  if (!value) return "";
  return list.find((o) => o.value === value)?.label ?? value;
}

export type CallLog = {
  id: string;
  created_at: string;
  agent_id: string;
  customer_name: string;
  phone: string;
  call_type: string;
  reason: string;
  product: string | null;
  outcome: string;
  duration_min: number | string | null;
  follow_up_date: string | null;
  recording_url: string | null;
  notes: string | null;
  /** When the caller was sent to reception, if they were. */
  referred_at: string | null;
};

export const CALL_COLUMNS =
  "id, created_at, agent_id, customer_name, phone, call_type, reason, product, outcome, " +
  "duration_min, follow_up_date, recording_url, notes, referred_at";

/** A tel: link for a number as typed. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** A WhatsApp chat with a Bangladeshi number, or null if it is too short to be one. */
export function whatsappHref(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/880${d.slice(-10)}`;
}

// ------------------------------------------------------------ validation --

/** Blank inputs arrive as ""; they mean "not given". */
const optional = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullish()
    .transform((v) => v || null);

export const callSchema = z.object({
  customer_name: z.string().trim().min(1, "Enter the customer's name.").max(120, "Keep the name under 120 characters."),
  phone: z.string().trim().min(1, "Enter the phone number.").max(40, "That phone number is too long."),
  call_type: z.enum(values(CALL_TYPES), "Pick the call type."),
  // Checked against the owner's current list by the caller (and the database).
  reason: z.string().regex(OPTION_VALUE, "Pick the reason."),
  product: optional(200, "Keep the product under 200 characters."),
  outcome: z.string().regex(OPTION_VALUE, "Pick the outcome."),
  duration_min: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 1440), "Enter the duration in minutes.")
    .transform((v) => (v === null ? null : Math.round(v * 10) / 10)),
  follow_up_date: z
    .string()
    .trim()
    .nullish()
    .transform((v) => v || null)
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid follow-up date."),
  recording_url: optional(500, "That link is too long.").refine(
    (v) => v === null || /^https?:\/\/\S+$/i.test(v),
    "The recording link must start with https://",
  ),
  notes: optional(2000, "Keep the notes under 2000 characters."),
});

// ------------------------------------------------------------------ CSV ---

/** Every column the owner can put in the CSV, in the default order. */
export const EXPORT_FIELDS = [
  { key: "call_time", label: "Date / time" },
  { key: "agent", label: "Agent" },
  { key: "customer_name", label: "Customer" },
  { key: "phone", label: "Phone" },
  { key: "call_type", label: "Call type" },
  { key: "reason", label: "Reason" },
  { key: "product", label: "Product / skin concern" },
  { key: "outcome", label: "Outcome" },
  { key: "duration_min", label: "Duration (min)" },
  { key: "follow_up_date", label: "Follow-up date" },
  { key: "recording_url", label: "Recording link" },
  { key: "notes", label: "Notes" },
] as const;

export type ExportField = (typeof EXPORT_FIELDS)[number]["key"];

const FIELD_KEYS = new Set<string>(EXPORT_FIELDS.map((f) => f.key));

/** A saved or submitted choice, cleaned: known fields only, each once. */
export function cleanFields(input: unknown): ExportField[] {
  if (!Array.isArray(input)) return [];
  const out: ExportField[] = [];
  for (const k of input) {
    if (typeof k === "string" && FIELD_KEYS.has(k) && !out.includes(k as ExportField)) {
      out.push(k as ExportField);
    }
  }
  return out;
}

export const DEFAULT_FIELDS: ExportField[] = EXPORT_FIELDS.map((f) => f.key);

// ------------------------------------------------------ insights (RPC) ---

/** call_lookup(): what is known about a number the agent is typing. */
export type PhoneLookup = {
  calls: number;
  last: {
    created_at: string;
    customer_name: string;
    outcome: string;
    reason: string;
    agent: string | null;
    notes: string | null;
    follow_up_date: string | null;
  } | null;
  patients: {
    patient_code: string;
    full_name: string;
    visits: number;
    last_visit: string | null;
  }[];
};

/** call_follow_ups(): a callback still owed (no newer call to that number). */
export type FollowUp = {
  id: string;
  created_at: string;
  agent_id: string;
  customer_name: string;
  phone: string;
  reason: string;
  outcome: string;
  follow_up_date: string;
  notes: string | null;
};

/** call_center_report(): the owner's numbers for a date range. */
export type CallReport = {
  days: { day: string; calls: number }[];
  outcomes: Record<string, number>;
  reasons: Record<string, number>;
  hours: Record<string, number>;
  agents: {
    agent_id: string;
    calls: number;
    sold: number;
    avg_duration: number | null;
    open_follow_ups: number;
    overdue: number;
  }[];
};
