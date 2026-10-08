import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getGoogleReviews, type GoogleReviews } from "@/lib/site/google-reviews";
import { publicImageUrl } from "@/lib/site-media";
import { socialDefaults } from "@/lib/site/content";

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

/** One treatment and its page. Every part but the name may be missing. */
export type SiteTreatment = {
  id: string;
  /** Where its page lives: /treatments/<href>, the slug or else the id. */
  href: string;
  title: string;
  category: string | null;
  subtitle: string | null;
  image: string | null;
  /** The introduction; the landing page shows its first sentences. */
  description: string | null;
  whatToExpect: string | null;
  resultsRecovery: string | null;
  beforeCare: string | null;
  afterCare: string | null;
  faqs: { q: string; a: string }[];
  closingTitle: string | null;
  closingBody: string | null;
  relatedIds: string[];
};

type TreatmentRow = {
  id: string;
  slug: string | null;
  title: string | null;
  category: string | null;
  subtitle: string | null;
  image_path: string | null;
  description: string | null;
  what_to_expect: string | null;
  results_recovery: string | null;
  before_care: string | null;
  after_care: string | null;
  faqs: unknown;
  closing_title: string | null;
  closing_body: string | null;
  related_ids: string[] | null;
};

const TREATMENT_COLUMNS =
  "id, slug, title, category, subtitle, image_path, description, what_to_expect, results_recovery, before_care, after_care, faqs, closing_title, closing_body, related_ids";

function toTreatment(r: TreatmentRow & { title: string }): SiteTreatment {
  const faqs = Array.isArray(r.faqs) ? (r.faqs as { q?: unknown; a?: unknown }[]) : [];
  return {
    id: r.id,
    href: r.slug || r.id,
    title: r.title,
    category: r.category,
    subtitle: r.subtitle,
    image: media(r.image_path),
    description: r.description,
    whatToExpect: r.what_to_expect,
    resultsRecovery: r.results_recovery,
    beforeCare: r.before_care,
    afterCare: r.after_care,
    faqs: faqs
      .map((f) => ({ q: typeof f?.q === "string" ? f.q : "", a: typeof f?.a === "string" ? f.a : "" }))
      .filter((f) => f.q),
    closingTitle: r.closing_title,
    closingBody: r.closing_body,
    relatedIds: r.related_ids ?? [],
  };
}

/**
 * The shown treatments, in the owner's order. One saved without a title has
 * nothing to be called on the website, so it is left out (and the landing
 * page's `limit` counts only the ones with a title).
 */
export async function getTreatments(limit?: number): Promise<SiteTreatment[]> {
  const data = await rows<TreatmentRow>("site_treatments", TREATMENT_COLUMNS);
  const named = data.filter((r): r is TreatmentRow & { title: string } => !!r.title?.trim());
  return named.slice(0, limit ?? named.length).map(toTreatment);
}

/** The treatment a /treatments/<slug-or-id> page is for, or null. */
export async function getTreatment(
  key: string,
): Promise<{ treatment: SiteTreatment; similar: SiteTreatment[] } | null> {
  const all = await getTreatments();
  const treatment = all.find((t) => t.href === key || t.id === key);
  if (!treatment) return null;

  // Hand-picked first, in the owner's list order; else the same category.
  const others = all.filter((t) => t.id !== treatment.id);
  const picked = others.filter((t) => treatment.relatedIds.includes(t.id));
  const similar = picked.length
    ? picked
    : treatment.category
      ? others.filter((t) => t.category?.toLowerCase() === treatment.category?.toLowerCase())
      : [];
  return { treatment, similar: similar.slice(0, 8) };
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

/** Every part is optional; an entry with neither a title nor a logo is left out. */
export type SiteLink = { id: string; title: string | null; url: string | null; logo: string | null };

/**
 * "As seen in" or the certifications, each with its logo if it has one.
 * Reads every column so the list still shows (as titles) on a database where
 * the logo migration has not been run yet.
 */
export async function getLinks(kind: "press" | "certification"): Promise<SiteLink[]> {
  const data = await rows<{ id: string; title: string | null; url: string | null; logo_path?: string | null }>(
    "site_links",
    "*",
    { eq: ["kind", kind] },
  );
  return data
    .map((l) => ({ id: l.id, title: l.title || null, url: l.url || null, logo: media(l.logo_path ?? null) }))
    .filter((l) => l.title || l.logo);
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

export type SocialNetwork = "facebook" | "instagram" | "tiktok" | "x" | "linkedin" | "youtube";
export type SiteSocialLink = { network: SocialNetwork; label: string; url: string };

const NETWORK_LABEL: Record<SocialNetwork, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

/**
 * The clinic's profiles, in footer order: the links saved under Social media
 * in the dashboard, else the clinic's own (socialDefaults).
 */
export async function getSocialLinks(): Promise<SiteSocialLink[]> {
  const [instagram, other] = await Promise.all([
    setting<{ url?: string }>("instagram"),
    setting<Partial<Record<Exclude<SocialNetwork, "instagram">, string>>>("social"),
  ]);
  const saved: Partial<Record<SocialNetwork, string | undefined>> = { ...other, instagram: instagram?.url };
  const urls: Partial<Record<SocialNetwork, string>> = { ...socialDefaults };
  for (const [network, url] of Object.entries(saved)) if (url) urls[network as SocialNetwork] = url;
  return (Object.keys(NETWORK_LABEL) as SocialNetwork[]).flatMap((network) => {
    const url = urls[network];
    return url ? [{ network, label: NETWORK_LABEL[network], url }] : [];
  });
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
