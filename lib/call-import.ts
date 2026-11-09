import { CALL_TYPES, type CallOptions } from "@/lib/call-log";

/**
 * Bringing old calls in from a CSV (a spreadsheet saved as CSV, or this app's
 * own export). The same code reads the file in the browser for the preview
 * and again on the server for the import, so what the owner saw is exactly
 * what goes in.
 */

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

/** RFC 4180-ish: quoted fields, "" inside quotes, commas and newlines in quotes. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export type ImportField =
  | "created_at"
  | "agent"
  | "customer_name"
  | "phone"
  | "call_type"
  | "reason"
  | "product"
  | "outcome"
  | "duration_min"
  | "follow_up_date"
  | "recording_url"
  | "notes";

/** Header names each column answers to, compared without case, spaces or punctuation. */
const ALIASES: Record<ImportField, string[]> = {
  created_at: ["datetime", "date", "calltime", "time", "createdat", "calldate"],
  agent: ["agent", "agentname"],
  customer_name: ["customer", "customername", "name"],
  phone: ["phone", "mobile", "number", "phonenumber", "contact"],
  call_type: ["calltype", "type"],
  reason: ["reason"],
  product: ["product", "productskinconcern", "skinconcern", "concern"],
  outcome: ["outcome", "result"],
  duration_min: ["durationmin", "duration", "minutes", "min"],
  follow_up_date: ["followupdate", "followup"],
  recording_url: ["recordinglink", "recording", "recordingurl"],
  notes: ["notes", "note", "comments", "comment"],
};

export const IMPORT_FIELD_LABEL: Record<ImportField, string> = {
  created_at: "Date / time",
  agent: "Agent",
  customer_name: "Customer",
  phone: "Phone",
  call_type: "Call type",
  reason: "Reason",
  product: "Product",
  outcome: "Outcome",
  duration_min: "Duration",
  follow_up_date: "Follow-up date",
  recording_url: "Recording link",
  notes: "Notes",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Which column holds which field, from the header row. */
export function mapHeaders(header: string[]): Partial<Record<ImportField, number>> {
  const map: Partial<Record<ImportField, number>> = {};
  header.forEach((h, i) => {
    const n = norm(h);
    for (const [field, names] of Object.entries(ALIASES) as [ImportField, string[]][]) {
      if (map[field] === undefined && names.includes(n)) {
        map[field] = i;
        break;
      }
    }
  });
  return map;
}

/** A row ready for call_logs. */
export type ImportRow = {
  created_at: string;
  agent_id: string;
  customer_name: string;
  phone: string;
  call_type: string;
  reason: string;
  product: string | null;
  outcome: string;
  duration_min: number | null;
  follow_up_date: string | null;
  recording_url: string | null;
  notes: string | null;
};

export type ImportDefaults = {
  agentId: string;
  reason: string;
  outcome: string;
  callType: string;
};

export type ImportContext = {
  options: CallOptions;
  agents: { id: string; full_name: string }[];
  defaults: ImportDefaults;
  /** The clinic's offset from UTC, e.g. "+06:00": imported times are clinic times. */
  utcOffset: string;
  now: Date;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-08", "08/11/2026" or "8/11/2026" → "2026-11-08"; null if it is none of those. */
function readDate(s: string): string | null {
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return valid(+m[3], +m[2], +m[1]);
  return null;
}
function valid(y: number, mo: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** A date with an optional "14:05", "2:05 pm" or "14:05:30" time, read as clinic time. */
function readDateTime(s: string, utcOffset: string): Date | null {
  const m = s.trim().match(/^(\S+)(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?)?$/i);
  if (!m) return null;
  const day = readDate(m[1]);
  if (!day) return null;
  let h = m[2] ? Number(m[2]) : 0;
  const min = m[3] ? Number(m[3]) : 0;
  const ap = m[5]?.toLowerCase().replace(/\./g, "");
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  const d = new Date(`${day}T${pad(h)}:${pad(min)}:${pad(Number(m[4] ?? 0))}${utcOffset}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A label or stored value, matched without case or punctuation. */
function pick(list: readonly { value: string; label: string }[], s: string): string | null {
  const n = norm(s);
  return list.find((o) => norm(o.value) === n || norm(o.label) === n)?.value ?? null;
}

export type CheckedRow = { line: number; row?: ImportRow; error?: string; raw: string[] };

/**
 * Every data row checked. A row with a problem is reported with its line in
 * the file and left out; the rest go in. Blank optional cells are fine; blank
 * Reason, Outcome, Call type or Agent take the chosen default.
 */
export function checkRows(rows: string[][], ctx: ImportContext): {
  map: Partial<Record<ImportField, number>>;
  checked: CheckedRow[];
  missing: ImportField[];
} {
  const [header = [], ...data] = rows;
  const map = mapHeaders(header);
  const missing = (["customer_name", "phone"] as ImportField[]).filter((f) => map[f] === undefined);
  const byName = new Map(ctx.agents.map((a) => [norm(a.full_name), a.id]));
  const cell = (r: string[], f: ImportField) => (map[f] === undefined ? "" : (r[map[f]!] ?? "").trim());

  const checked = data.map((r, i): CheckedRow => {
    const line = i + 2;
    const fail = (error: string): CheckedRow => ({ line, error, raw: r });
    if (missing.length) return fail("No Customer or Phone column.");

    const customer_name = cell(r, "customer_name");
    const phone = cell(r, "phone");
    if (!customer_name) return fail("Customer name is empty.");
    if (customer_name.length > 120) return fail("Customer name is over 120 characters.");
    if (!phone) return fail("Phone is empty.");
    if (phone.length > 40) return fail("Phone is too long.");

    const when = cell(r, "created_at");
    let created_at = ctx.now.toISOString();
    if (when) {
      const d = readDateTime(when, ctx.utcOffset);
      if (!d) return fail(`Can't read the date "${when}". Use 2026-11-08 14:05 or 08/11/2026.`);
      if (d.getTime() > ctx.now.getTime() + 60_000) return fail(`The date "${when}" is in the future.`);
      created_at = d.toISOString();
    }

    const agentName = cell(r, "agent");
    const agent_id = agentName ? byName.get(norm(agentName)) : ctx.defaults.agentId;
    if (!agent_id) return fail(`No staff member is called "${agentName}".`);

    const typeCell = cell(r, "call_type");
    const call_type = typeCell ? pick(CALL_TYPES, typeCell) : ctx.defaults.callType;
    if (!call_type) return fail(`Call type "${typeCell}" should be Inbound or Outbound.`);

    // Turned-off choices still import: old calls may well use them.
    const reasonCell = cell(r, "reason");
    const reason = reasonCell ? pick(ctx.options.reasons, reasonCell) : ctx.defaults.reason;
    if (!reason) return fail(`"${reasonCell}" is not one of the Reasons. Add it on the Form options page first.`);
    const outcomeCell = cell(r, "outcome");
    const outcome = outcomeCell ? pick(ctx.options.outcomes, outcomeCell) : ctx.defaults.outcome;
    if (!outcome) return fail(`"${outcomeCell}" is not one of the Outcomes. Add it on the Form options page first.`);

    const durCell = cell(r, "duration_min");
    let duration_min: number | null = null;
    if (durCell) {
      const n = Number(durCell.replace(/[^\d.]/g, ""));
      if (!Number.isFinite(n) || n < 0 || n > 1440) return fail(`Duration "${durCell}" should be minutes, 0–1440.`);
      duration_min = Math.round(n * 10) / 10;
    }

    const fuCell = cell(r, "follow_up_date");
    const follow_up_date = fuCell ? readDate(fuCell.split(/[ T]/)[0]) : null;
    if (fuCell && !follow_up_date) return fail(`Can't read the follow-up date "${fuCell}".`);

    const rec = cell(r, "recording_url");
    if (rec && (!/^https?:\/\/\S+$/i.test(rec) || rec.length > 500)) {
      return fail("The recording link must start with https://");
    }
    const product = cell(r, "product");
    if (product.length > 200) return fail("Product is over 200 characters.");
    const notes = cell(r, "notes");
    if (notes.length > 2000) return fail("Notes are over 2000 characters.");

    return {
      line,
      raw: r,
      row: {
        created_at,
        agent_id,
        customer_name,
        phone,
        call_type,
        reason,
        product: product || null,
        outcome,
        duration_min,
        follow_up_date,
        recording_url: rec || null,
        notes: notes || null,
      },
    };
  });

  return { map, checked, missing };
}
