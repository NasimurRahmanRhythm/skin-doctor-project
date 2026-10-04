import type { SupabaseClient } from "@supabase/supabase-js";
import {
  IMAGE_TYPES,
  imageExtension,
  isStoredPath,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_LABEL,
  type PublicBucket,
} from "@/lib/site-media";

/**
 * The image a form sent under `name`, or null when none was picked. An empty
 * file input still posts a zero-byte File, which counts as none.
 */
export function formImage(formData: FormData, name: string): File | null {
  const v = formData.get(name);
  return v instanceof File && v.size > 0 ? v : null;
}

/** Why this file cannot be stored, or null when it can. */
export function imageProblem(file: File): string | null {
  if (!IMAGE_TYPES.test(file.type)) return `"${file.name}" is not a JPG, PNG or WebP image.`;
  if (file.size > MAX_IMAGE_BYTES) return `"${file.name}" is over ${MAX_IMAGE_LABEL}.`;
  return null;
}

/** Stores a picture under `folder/` with a fresh name, and returns its path. */
export async function storeImage(
  client: SupabaseClient,
  bucket: PublicBucket,
  folder: string,
  file: File,
): Promise<{ path: string } | { error: string }> {
  const problem = imageProblem(file);
  if (problem) return { error: problem };

  const path = `${folder}/${crypto.randomUUID()}.${imageExtension(file.type)}`;
  const { error } = await client.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) return { error: `Could not upload "${file.name}": ${error.message}` };
  return { path };
}

/** Best effort: a stray file costs a little storage, never a broken page. */
export async function removeImages(
  client: SupabaseClient,
  bucket: PublicBucket,
  paths: (string | null | undefined)[],
): Promise<void> {
  const stored = paths.filter(isStoredPath);
  if (stored.length) await client.storage.from(bucket).remove(stored);
}
