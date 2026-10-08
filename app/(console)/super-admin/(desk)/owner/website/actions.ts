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
    if (f.type === "image" || f.type === "slug") continue;

    if (f.type === "faq") {
      // Posted as parallel <name>_q / <name>_a inputs; a pair left blank is dropped.
      const qs = formData.getAll(`${f.name}_q`).map((v) => String(v).trim());
      const as = formData.getAll(`${f.name}_a`).map((v) => String(v).trim());
      const pairs = qs.map((q, i) => ({ q, a: as[i] ?? "" })).filter((p) => p.q || p.a);
      if (f.required && pairs.length === 0) return { error: `${f.label} is required.` };
      if (f.max && pairs.some((p) => p.q.length > f.max! || p.a.length > f.max!)) {
        return { error: `A question or answer is too long (max ${f.max} characters).` };
      }
      row[f.name] = pairs;
      continue;
    }

    if (f.type === "relations") {
      // Ids of other rows in this list; a row cannot list itself.
      const ids = [...new Set(formData.getAll(f.name).map(String))].filter(
        (v) => uuid.safeParse(v).success && v !== id,
      );
      if (f.required && ids.length === 0) return { error: `${f.label} is required.` };
      row[f.name] = ids;
      continue;
    }

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

  // ---- web addresses: typed (and tidied), or made from another field; never shared
  for (const f of def.fields) {
    if (f.type !== "slug") continue;
    const typed = String(formData.get(f.name) ?? "").trim();
    const base = slugify(typed || String(row[f.from ?? ""] ?? ""), f.max);
    if (!base) {
      if (f.required) return { error: `${f.label} is required.` };
      row[f.name] = null;
      continue;
    }
    const taken = new Set<string>();
    let q = supabase.from(def.table).select(`id, ${f.name}`).like(f.name, `${base}%`);
    if (id) q = q.neq("id", id);
    for (const r of ((await q).data ?? []) as unknown as Record<string, string>[]) taken.add(r[f.name]);
    if (typed && taken.has(base)) return { error: `Another ${def.noun} already uses the address “${base}”.` };
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    row[f.name] = slug;
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

/** "Acne & Acne Scars" → "acne-acne-scars": lowercase letters, digits, single dashes. */
function slugify(text: string, max = 120): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
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

/** An optional profile link on one network: empty, or a link to that site. */
const profileLink = (pattern: RegExp, message: string) =>
  z.string().trim().max(300).refine((v) => v === "" || pattern.test(v), message);

const socialSchema = z.object({
  facebook: profileLink(/^https:\/\/((www|m|web)\.)?(facebook|fb)\.com\/\S+/i, "Use the Facebook page's facebook.com link."),
  x: profileLink(/^https:\/\/(www\.)?(x|twitter)\.com\/\S+/i, "Use the X profile's x.com link."),
  linkedin: profileLink(/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/\S+/i, "Use the LinkedIn page's linkedin.com link."),
  youtube: profileLink(/^https:\/\/((www|m)\.)?(youtube\.com|youtu\.be)\/\S+/i, "Use the YouTube channel's youtube.com link."),
  tiktok: profileLink(/^https:\/\/((www|m|vm)\.)?tiktok\.com\/\S+/i, "Use the TikTok profile's tiktok.com link."),
});

/**
 * The clinic's social media profiles. Instagram is stored on its own (the
 * Instagram section and the floating button read it); the others together
 * under "social". Every link is optional, and an empty one removes it.
 */
export async function saveSocialLinks(_prev: WebsiteState, formData: FormData): Promise<WebsiteState> {
  await requireRole("owner");

  // Check everything before writing anything.
  const igUrl = String(formData.get("instagram") ?? "").trim();
  const ig = igUrl ? instagramSchema.safeParse({ url: igUrl, handle: formData.get("handle") ?? "" }) : null;
  if (ig && !ig.success) return { error: ig.error.issues[0]?.message };

  const others = socialSchema.safeParse({
    facebook: formData.get("facebook") ?? "",
    x: formData.get("x") ?? "",
    linkedin: formData.get("linkedin") ?? "",
    youtube: formData.get("youtube") ?? "",
    tiktok: formData.get("tiktok") ?? "",
  });
  if (!others.success) return { error: others.error.issues[0]?.message };

  const supabase = await createClient();
  const now = new Date().toISOString();

  const igWrite = ig?.success
    ? supabase.from("site_settings").upsert({
        key: "instagram",
        value: { url: ig.data.url, handle: ig.data.handle || null },
        updated_at: now,
      })
    : supabase.from("site_settings").delete().eq("key", "instagram");

  const links = Object.fromEntries(Object.entries(others.data).filter(([, v]) => v));
  const socialWrite = Object.keys(links).length
    ? supabase.from("site_settings").upsert({ key: "social", value: links, updated_at: now })
    : supabase.from("site_settings").delete().eq("key", "social");

  const results = await Promise.all([igWrite, socialWrite]);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

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
