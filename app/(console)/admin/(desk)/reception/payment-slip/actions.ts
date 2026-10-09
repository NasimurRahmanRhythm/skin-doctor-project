"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lineTotalPaisa, parseAmount } from "@/lib/amount-in-words";
import { requireRole } from "@/lib/auth";
import { clinicToday } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";

const text = (max: number) => z.string().trim().max(max);

/** Every field is optional; a blank date means today. */
const slipSchema = z.object({
  date: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Check the date.")]),
  patientCode: text(40),
  name: text(200),
  age: text(30),
  gender: text(30),
  address: text(500),
  phone: text(40),
  rows: z
    .array(z.object({ description: text(500), cost: text(30), qty: text(30) }))
    .max(200),
});

export type SlipInput = z.input<typeof slipSchema>;

export type SaveSlipResult = { id: string; receiptNo: string } | { error: string };

/** No 0/O or 1/I, so a receipt number read out over the phone is unambiguous. */
const RECEIPT_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** "DS-R-261009-7KQ4": the slip's date, then four random characters. */
function receiptNumber(date: string): string {
  const [y, m, d] = date.split("-");
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const tail = Array.from(bytes, (b) => RECEIPT_CHARS[b % RECEIPT_CHARS.length]).join("");
  return `DS-R-${y.slice(2)}${m}${d}-${tail}`;
}

/** A line of the slip as stored, in taka. */
export type SlipItem = {
  description: string;
  cost: number | null;
  qty: number | null;
  total: number | null;
};

/**
 * Records a slip before it is printed.
 *
 * Totals are worked out again here from the cost and quantity rather than
 * taken from the browser, so the figure on file is the one the lines add up to.
 */
export async function savePaymentSlip(input: SlipInput): Promise<SaveSlipResult> {
  const staff = await requireRole("receptionist");

  const parsed = slipSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the slip." };
  }
  const slip = parsed.data;

  const items: SlipItem[] = [];
  let totalPaisa = 0;

  for (const row of slip.rows) {
    if (!row.description && !row.cost && !row.qty) continue;
    const line = items.length + 1;

    const cost = row.cost ? parseAmount(row.cost) : null;
    if (row.cost && cost === null) {
      return { error: `Line ${line}: the price is not a number.` };
    }
    const qty = row.qty ? parseAmount(row.qty) : null;
    if (row.qty && qty === null) {
      return { error: `Line ${line}: the quantity is not a number.` };
    }

    const paisa = lineTotalPaisa(row.cost, row.qty);
    totalPaisa += paisa ?? 0;
    items.push({
      description: row.description,
      cost,
      // The sheet counts a blank quantity as one, so the record says one too.
      qty: cost === null ? qty : (qty ?? 1),
      total: paisa === null ? null : paisa / 100,
    });
  }

  const hasInfo = [slip.patientCode, slip.name, slip.age, slip.gender, slip.address, slip.phone].some(Boolean);
  if (!hasInfo && items.length === 0) {
    return { error: "The slip is empty. Fill in something before saving." };
  }

  const supabase = await createClient();
  const slipDate = slip.date || clinicToday();

  // A fresh number, checked against the slips already on file.
  let receiptNo = receiptNumber(slipDate);
  for (let tries = 0; tries < 5; tries++) {
    const { count } = await supabase
      .from("payment_slips")
      .select("id", { count: "exact", head: true })
      .eq("receipt_no", receiptNo);
    if (!count) break;
    receiptNo = receiptNumber(slipDate);
  }

  const row = {
    receipt_no: receiptNo,
    slip_date: slipDate,
    patient_code: slip.patientCode || null,
    patient_name: slip.name || null,
    patient_age: slip.age || null,
    patient_gender: slip.gender || null,
    patient_address: slip.address || null,
    patient_phone: slip.phone || null,
    items,
    total: totalPaisa / 100,
    receptionist_id: staff.id,
  };
  let { data, error } = await supabase.from("payment_slips").insert(row).select("id").single();
  // Before the patient_code column exists (migration 20261009000024), save
  // the slip without it rather than not at all.
  if (error && /patient_code/i.test(error.message)) {
    const withoutCode: Partial<typeof row> = { ...row };
    delete withoutCode.patient_code;
    ({ data, error } = await supabase.from("payment_slips").insert(withoutCode).select("id").single());
  }

  if (error || !data) {
    return { error: error?.message ?? "Could not save the slip." };
  }

  revalidatePath("/admin/owner/payments");
  return { id: data.id, receiptNo };
}
