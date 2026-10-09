"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function revalidate() {
  revalidatePath("/admin/owner/inquiries");
  revalidatePath("/admin/owner");
}

/** Marks an inquiry read or unread. */
export async function setInquiryRead(formData: FormData) {
  await requireRole("owner");
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;
  const read = formData.get("read") === "1";

  const supabase = await createClient();
  await supabase.from("inquiries").update({ is_read: read }).eq("id", id);
  revalidate();
}

/** Opening an inquiry marks it read; called from the page without a form. */
export async function markInquiryRead(id: string) {
  await requireRole("owner");
  if (!z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("inquiries").update({ is_read: true }).eq("id", id).eq("is_read", false);
  revalidate();
}

export async function deleteInquiry(formData: FormData) {
  await requireRole("owner");
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;

  const supabase = await createClient();
  await supabase.from("inquiries").delete().eq("id", id);
  revalidate();
}
