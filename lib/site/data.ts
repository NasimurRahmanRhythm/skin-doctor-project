import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getGoogleReviews, type GoogleReviews } from "@/lib/site/google-reviews";
import { publicImageUrl } from "@/lib/site-media";

/**
 * What the public website reads from the database: the lists the owner
 * manages from the dashboard, the doctors, and the Google reviews.
 *
 * Read as an anonymous visitor would, so RLS hands back exactly the active
 * rows and nothing else — and with no cookies, so the pages stay cacheable.
 * Any failure (a migration not yet run, the network) reads as an empty list:
 * a section with nothing to show hides itself rather than breaking the page.
 *
 * Server only.
 */
function anon() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function rows<T>(
  table: string,
  columns: string,
  opts: { eq?: [string, string]; limit?: number; order?: "sort" | "created" } = {},
): Promise<T[]> {
  try {
    let q = anon().from(table).select(columns);
    if (opts.eq) q = q.eq(opts.eq[0], opts.eq[1]);
    q =
      opts.order === "created"
        ? q.order("created_at")
        : q.order("sort_order").order("created_at");
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) {
      console.error(`site data ${table}:`, error.message);
      return [];
    }
    return (data ?? []) as T[];
  } catch (err) {
    console.error(`site data ${table}:`, err);
    return [];
  }
}

const media = (path: string | null) => publicImageUrl("site-media", path);

// ------------------------------------------------------------------ lists --

export type SiteTreatment = { id: string; title: string; description: string };

export function getTreatments(limit?: number) {
  return rows<SiteTreatment>("site_treatments", "id, title, description", { limit });
}

export type SitePackage = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  price: string | null;
};

export async function getPackages(limit?: number): Promise<SitePackage[]> {
  const data = await rows<{
    id: string;
    title: string;
    description: string;
    image_path: string;
    price: string | null;
  }>("site_packages", "id, title, description, image_path, price", { limit });
  return data.map(({ image_path, ...p }) => ({ ...p, image: media(image_path) }));
}

export type SiteResult = {
  id: string;
  title: string;
  description: string | null;
  before: string;
  after: string;
};

export async function getResults(limit?: number): Promise<SiteResult[]> {
  const data = await rows<{
    id: string;
    title: string;
    description: string | null;
    before_image_path: string;
    after_image_path: string;
  }>("site_results", "id, title, description, before_image_path, after_image_path", { limit });
  return data.flatMap(({ before_image_path, after_image_path, ...r }) => {
    const before = media(before_image_path);
    const after = media(after_image_path);
    return before && after ? [{ ...r, before, after }] : [];
  });
}

export type SiteProduct = {
  id: string;
  title: string | null;
  description: string | null;
  price: string | null;
  image: string | null;
};

export async function getProducts(limit?: number): Promise<SiteProduct[]> {
  const data = await rows<{
    id: string;
    title: string | null;
    description: string | null;
    price: string | null;
    image_path: string | null;
  }>("site_products", "id, title, description, price, image_path", { limit });
  return data.map(({ image_path, ...p }) => ({ ...p, image: media(image_path) }));
}

export type SiteLink = { id: string; title: string; url: string };

export function getLinks(kind: "press" | "certification") {
  return rows<SiteLink>("site_links", "id, title, url", { eq: ["kind", kind] });
}

/** How many active rows a list has, for "See more". */
export async function countRows(table: "site_treatments" | "site_packages" | "site_products") {
  try {
    const { count } = await anon().from(table).select("id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}

// --------------------------------------------------------------- doctors --

export type SiteDoctor = {
  id: string;
  name: string;
  designation: string | null;
  photo: string | null;
};

export async function getDoctors(limit?: number): Promise<SiteDoctor[]> {
  const data = await rows<{
    id: string;
    full_name: string;
    specialty: string | null;
    photo_path: string | null;
  }>("website_doctors", "id, full_name, specialty, photo_path", { order: "created", limit });
  return data.map((d) => ({
    id: d.id,
    name: d.full_name,
    designation: d.specialty,
    photo: publicImageUrl("staff-photos", d.photo_path),
  }));
}

// -------------------------------------------------------------- settings --

async function setting<T>(key: string): Promise<T | null> {
  try {
    const { data } = await anon().from("site_settings").select("value").eq("key", key).maybeSingle();
    return (data?.value as T) ?? null;
  } catch {
    return null;
  }
}

export type SiteInstagram = {
  url: string;
  handle: string;
  posts: { id: string; url: string; image: string }[];
};

/** The profile and its posts; null when no profile link is set. */
export async function getInstagram(): Promise<SiteInstagram | null> {
  const [profile, posts] = await Promise.all([
    setting<{ url: string; handle: string | null }>("instagram"),
    rows<{ id: string; url: string; image_path: string }>(
      "site_instagram_posts",
      "id, url, image_path",
    ),
  ]);
  if (!profile?.url) return null;
  return {
    url: profile.url,
    handle: profile.handle || handleFromUrl(profile.url),
    posts: posts.flatMap((p) => {
      const image = media(p.image_path);
      return image ? [{ id: p.id, url: p.url, image }] : [];
    }),
  };
}

/** "https://www.instagram.com/dermasoul.aesthetics/" → "@dermasoul.aesthetics". */
export function handleFromUrl(url: string): string {
  const name = url.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").split(/[/?#]/)[0];
  return name ? `@${name}` : "Instagram";
}

export type GoogleReviewsSetting = { placeId: string; minRating: number };

export function getGoogleReviewsSetting() {
  return setting<GoogleReviewsSetting>("google_reviews");
}

/** Google's numbers, with reviews under the owner's minimum left out. */
export async function getReviews(): Promise<GoogleReviews | null> {
  const s = await getGoogleReviewsSetting();
  if (!s?.placeId) return null;
  const data = await getGoogleReviews(s.placeId);
  if (!data) return null;
  const reviews = data.reviews.filter((r) => r.rating >= (s.minRating ?? 4));
  return reviews.length ? { ...data, reviews } : null;
}
