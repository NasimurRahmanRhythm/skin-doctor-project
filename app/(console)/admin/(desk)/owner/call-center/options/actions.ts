"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type OptionState = { error?: string; notice?: string };

const KIND = z.enum(["reason", "outcome"]);
const LABEL = z.string().trim().min(1, "Enter a name.").max(60, "Keep it under 60 characters.");

function revalidate() {
  revalidatePath("/admin/owner/call-center/options");
  revalidatePath("/admin/owner/call-center");
  revalidatePath("/admin/call-center");
}

/** "Appointment booked" → appointment_booked: the value calls store. */
function slug(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 36) || "option"
  );
}

/** Adds a choice at the end of its list. */
export async function addOption(_prev: OptionState, formData: FormData): Promise<OptionState> {
  await requireRole("owner");
  const kind = KIND.safeParse(formData.get("kind"));
  const label = LABEL.safeParse(formData.get("label"));
  if (!kind.success) return { error: "Unknown list." };
  if (!label.success) return { error: label.error.issues[0]?.message };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("call_options")
    .select("value, label, sort_order")
    .eq("kind", kind.data);
  const rows = existing ?? [];
  if (rows.some((r) => r.label.toLowerCase() === label.data.toLowerCase())) {
    return { error: `"${label.data}" is already on the list.` };
  }
  // A label that slugs like an existing one gets _2, _3…
  let value = slug(label.data);
  for (let n = 2; rows.some((r) => r.value === value); n++) value = `${slug(label.data)}_${n}`;

  const last = Math.max(0, ...rows.map((r) => r.sort_order as number));
  const { error } = await supabase
    .from("call_options")
    .insert({ kind: kind.data, value, label: label.data, sort_order: last + 1 });
  if (error) return { error: error.message };

  revalidate();
  return { notice: `"${label.data}" added.` };
}

const id = (formData: FormData) => {
  const v = String(formData.get("id") ?? "");
  return z.uuid().safeParse(v).success ? v : null;
};

/** Renames a choice. Calls keep their value, so they all show the new name. */
export async function renameOption(formData: FormData) {
  await requireRole("owner");
  const optionId = id(formData);
  const label = LABEL.safeParse(formData.get("label"));
  if (!optionId || !label.success) return;
  const supabase = await createClient();
  await supabase.from("call_options").update({ label: label.data }).eq("id", optionId);
  revalidate();
}

/** Turns a choice on or off. Off: no longer offered, still shown on old calls. */
export async function toggleOption(formData: FormData) {
  await requireRole("owner");
  const optionId = id(formData);
  if (!optionId) return;
  const supabase = await createClient();
  await supabase
    .from("call_options")
    .update({ is_active: formData.get("active") === "1" })
    .eq("id", optionId);
  revalidate();
}

/** Moves a choice one place up or down, renumbering its list. */
export async function moveOption(formData: FormData) {
  await requireRole("owner");
  const optionId = id(formData);
  const kind = KIND.safeParse(formData.get("kind"));
  if (!optionId || !kind.success) return;
  const by = formData.get("dir") === "up" ? -1 : 1;

  const supabase = await createClient();
  const { data } = await supabase
    .from("call_options")
    .select("id")
    .eq("kind", kind.data)
    .order("sort_order")
    .order("created_at");
  const ids = (data ?? []).map((r) => r.id as string);
  const i = ids.indexOf(optionId);
  const j = i + by;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(
    ids.map((rowId, n) => supabase.from("call_options").update({ sort_order: n + 1 }).eq("id", rowId)),
  );
  revalidate();
}

/**
 * Deletes a choice nobody has used. The database refuses a built-in one, or
 * one that calls already carry — those are turned off instead.
 */
export async function deleteOption(_prev: OptionState, formData: FormData): Promise<OptionState> {
  await requireRole("owner");
  const optionId = id(formData);
  if (!optionId) return {};
  const supabase = await createClient();
  const { error } = await supabase.from("call_options").delete().eq("id", optionId);
  if (error) return { error: error.message };
  revalidate();
  return { notice: "Deleted." };
}
