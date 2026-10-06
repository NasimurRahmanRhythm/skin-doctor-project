"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lineTotalPaisa, parseAmount } from "@/lib/amount-in-words";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const text = (max: number) => z.string().trim().max(max);

const slipSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date."),
  receiptNo: text(60),
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

export type SaveSlipResult = { id: string } | { error: string };

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
      return { error: `Line ${line}: the cost is not a number.` };
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

  if (totalPaisa <= 0) {
    return { error: "Add at least one line with a cost before saving." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_slips")
    .insert({
      receipt_no: slip.receiptNo || null,
      slip_date: slip.date,
      patient_name: slip.name || null,
      patient_age: slip.age || null,
      patient_gender: slip.gender || null,
      patient_address: slip.address || null,
      patient_phone: slip.phone || null,
      items,
      total: totalPaisa / 100,
      receptionist_id: staff.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save the slip." };
  }

  revalidatePath("/super-admin/owner/payments");
  return { id: data.id };
}
