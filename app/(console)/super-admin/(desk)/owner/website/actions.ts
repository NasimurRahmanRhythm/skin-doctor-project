"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { GOOGLE_REVIEWS_TAG } from "@/lib/site/google-reviews";
import { formImage, imageProblem, removeImages, storeImage } from "@/lib/site-media-server";
import { createClient } from "@/lib/supabase/server";
import { sectionByKey, sectionFolder, type SectionDef } from "@/lib/website-sections";

export type WebsiteState = { error?: string; notice?: string; savedAt?: number };

/** Every public page that shows website content, plus this dashboard. */
function revalidateSite() {
  revalidatePath("/", "layout");
}

const uuid = z.uuid();

type Row = Record<string, unknown> & { id: string };

/** The rows of one list, in display order. */
async function listRows(supabase: Awaited<ReturnType<typeof createClient>>, def: SectionDef) {
  let q = supabase.from(def.table).select("id, sort_order").order("sort_order").order("created_at");
  for (const [k, v] of Object.entries(def.fixed ?? {})) q = q.eq(k, v);
  return (await q).data ?? [];
}

// ------------------------------------------------------------------ save --

/**
 * Adds a row to one of the website lists, or with `id` updates it. Which list
 * comes from the `section` field, and what it may contain from its definition
 * in lib/website-sections.ts — the same one the form was built from.
 */
export async function saveItem(_prev: WebsiteState, formData: FormData): Promise<WebsiteState> {
  await requireRole("owner");

  const def = sectionByKey(String(formData.get("section") ?? ""));
  if (!def) return { error: "Unknown list." };
  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? rawId : null;
  if (id && !uuid.safeParse(id).success) return { error: "Unknown item." };

  const supabase = await createClient();

  let existing: Row | null = null;
  if (id) {
    const { data } = await supabase.from(def.table).select("*").eq("id", id).maybeSingle();
    if (!data) return { error: "That item no longer exists." };
    existing = data as Row;
  }

  // ---- text fields
  const row: Record<string, unknown> = { ...(def.fixed ?? {}) };
  for (const f of def.fields) {
    if (f.type === "image") continue;
    const value = String(formData.get(f.name) ?? "").trim();
    if (!value) {
      if (f.required) return { error: `${f.label} is required.` };
      row[f.name] = null;
      continue;
    }
    if (f.max && value.length > f.max) {
      return { error: `${f.label} is too long (max ${f.max} characters).` };
    }
    if (f.pattern && !new RegExp(f.pattern, "i").test(value)) {
      return { error: f.patternMessage ?? `${f.label} is not valid.` };
    }
    row[f.name] = value;
  }

  // ---- pictures: check everything before uploading anything
  const picked: { field: string; file: File }[] = [];
  const cleared: string[] = [];
  for (const f of def.fields) {
    if (f.type !== "image") continue;
    const file = formImage(formData, f.name);
    if (file) {
      const problem = imageProblem(file);
      if (problem) return { error: problem };
      picked.push({ field: f.name, file });
    } else if (!f.required && formData.get(`${f.name}_remove`) === "1") {
      cleared.push(f.name);
    } else if (f.required && !existing?.[f.name]) {
      return { error: `${f.label} image is required.` };
    }
  }

  // ---- "at least one of"
  if (def.oneOf) {
    const has = def.oneOf.some((name) => {
      if (row[name]) return true;
      if (picked.some((p) => p.field === name)) return true;
      return !!existing?.[name] && !cleared.includes(name);
    });
    if (!has) {
      const labels = def.oneOf.map((n) => def.fields.find((f) => f.name === n)?.label ?? n);
      return { error: `Add at least a ${labels.join(" or ").toLowerCase()}.` };
    }
  }

  const uploaded: string[] = [];
  for (const p of picked) {
    const stored = await storeImage(supabase, "site-media", sectionFolder(def), p.file);
    if ("error" in stored) {
      await removeImages(supabase, "site-media", uploaded);
      return { error: stored.error };
    }
    uploaded.push(stored.path);
    row[p.field] = stored.path;
  }
  for (const name of cleared) row[name] = null;

  // ---- write
  let error: { message: string } | null;
  if (existing) {
    ({ error } = await supabase.from(def.table).update(row).eq("id", existing.id));
  } else {
    const rows = await listRows(supabase, def);
    const last = rows.at(-1)?.sort_order as number | undefined;
    row.sort_order = (last ?? 0) + 1;
    ({ error } = await supabase.from(def.table).insert(row));
  }
  if (error) {
    await removeImages(supabase, "site-media", uploaded);
    return { error: error.message };
  }

  // Pictures this save replaced or cleared are no longer referenced.
  if (existing) {
    const old = [...picked.map((p) => p.field), ...cleared].map((f) => existing[f] as string | null);
    await removeImages(supabase, "site-media", old);
  }

  revalidateSite();
  return {
    notice: existing ? "Saved." : `The ${def.noun} was added.`,
    savedAt: Date.now(),
  };
}

// ------------------------------------------------------- row operations --

function target(formData: FormData) {
  const def = sectionByKey(String(formData.get("section") ?? ""));
  const id = String(formData.get("id") ?? "");
  if (!def || !uuid.safeParse(id).success) return null;
  return { def, id };
}

export async function deleteItem(formData: FormData) {
  await requireRole("owner");
  const t = target(formData);
  if (!t) return;

  const supabase = await createClient();
  const { data } = await supabase.from(t.def.table).select("*").eq("id", t.id).maybeSingle();
  if (!data) return;

  const { error } = await supabase.from(t.def.table).delete().eq("id", t.id);
  if (error) return;

  const images = t.def.fields
    .filter((f) => f.type === "image")
    .map((f) => (data as Row)[f.name] as string | null);
  await removeImages(supabase, "site-media", images);

  revalidateSite();
}

/** Moves a row one place up or down, renumbering the list as it goes. */
export async function moveItem(formData: FormData) {
  await requireRole("owner");
  const t = target(formData);
  if (!t) return;
  const by = formData.get("dir") === "up" ? -1 : 1;

  const supabase = await createClient();
  const ids = (await listRows(supabase, t.def)).map((r) => r.id as string);
  const i = ids.indexOf(t.id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];

  // Lists are a handful of rows; renumbering them all keeps the order
  // contiguous no matter how it drifted before.
  await Promise.all(
    ids.map((rowId, n) => supabase.from(t.def.table).update({ sort_order: n + 1 }).eq("id", rowId)),
  );

  revalidateSite();
}

/** Shows or hides a row on the website without deleting it. */
export async function toggleItem(formData: FormData) {
  await requireRole("owner");
  const t = target(formData);
  if (!t) return;
  const active = formData.get("active") === "1";

  const supabase = await createClient();
  await supabase.from(t.def.table).update({ is_active: active }).eq("id", t.id);

  revalidateSite();
}

// -------------------------------------------------------------- settings --

const instagramSchema = z.object({
  url: z
    .string()
    .trim()
    .regex(/^https:\/\/(www\.)?instagram\.com\/[^/?#\s]+/i, "Use the profile's instagram.com link.")
    .max(300),
  handle: z.string().trim().max(60),
});

/** The clinic's Instagram profile. An empty link removes it. */
export async function saveInstagramProfile(
  _prev: WebsiteState,
  formData: FormData,
): Promise<WebsiteState> {
  await requireRole("owner");
  const supabase = await createClient();

  const url = String(formData.get("url") ?? "").trim();
  if (!url) {
    await supabase.from("site_settings").delete().eq("key", "instagram");
    revalidateSite();
    return { notice: "Instagram profile removed.", savedAt: Date.now() };
  }

  const parsed = instagramSchema.safeParse({ url, handle: formData.get("handle") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { error } = await supabase.from("site_settings").upsert({
    key: "instagram",
    value: { url: parsed.data.url, handle: parsed.data.handle || null },
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidateSite();
  return { notice: "Saved.", savedAt: Date.now() };
}

const googleSchema = z.object({
  placeId: z.string().trim().max(300),
  minRating: z.coerce.number().int().min(1).max(5),
});

/** Which Google listing the Reviews section reads, and which reviews it shows. */
export async function saveGoogleReviews(
  _prev: WebsiteState,
  formData: FormData,
): Promise<WebsiteState> {
  await requireRole("owner");

  const parsed = googleSchema.safeParse({
    placeId: formData.get("placeId") ?? "",
    minRating: formData.get("minRating") ?? 4,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = parsed.data.placeId
    ? await supabase.from("site_settings").upsert({
        key: "google_reviews",
        value: parsed.data,
        updated_at: new Date().toISOString(),
      })
    : await supabase.from("site_settings").delete().eq("key", "google_reviews");
  if (error) return { error: error.message };

  revalidateTag(GOOGLE_REVIEWS_TAG, { expire: 0 });
  revalidateSite();
  return { notice: "Saved.", savedAt: Date.now() };
}

/** Fetches Google's reviews again now rather than at the next refresh. */
export async function refreshGoogleReviews() {
  await requireRole("owner");
  revalidateTag(GOOGLE_REVIEWS_TAG, { expire: 0 });
  revalidateSite();
}
