/**
 * Public images: website content (site-media) and staff headshots
 * (staff-photos). Both buckets are public, so a stored path turns into a URL
 * without a round trip, and that URL is safe to render on the open website.
 *
 * A path that starts with "/" or "http" is used as it is: the seeded packages
 * point at pictures shipped in /public until the owner uploads new ones.
 */
export type PublicBucket = "site-media" | "staff-photos";

export function publicImageUrl(bucket: PublicBucket, path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("/") || /^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Only paths this app uploaded can be deleted; never a file in /public. */
export function isStoredPath(path: string | null | undefined): path is string {
  return !!path && !path.startsWith("/") && !/^https?:\/\//i.test(path);
}

/** What an image upload may be. Pictures are shrunk in the browser first. */
export const IMAGE_TYPES = /^image\/(jpeg|png|webp)$/i;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_LABEL = "5 MB";

export function imageExtension(type: string): string {
  if (/png/i.test(type)) return "png";
  if (/webp/i.test(type)) return "webp";
  return "jpg";
}
