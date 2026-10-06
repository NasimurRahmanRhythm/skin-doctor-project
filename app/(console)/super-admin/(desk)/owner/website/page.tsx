import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getGoogleReviews } from "@/lib/site/google-reviews";
import { publicImageUrl } from "@/lib/site-media";
import { createClient } from "@/lib/supabase/server";
import { SECTIONS, sectionByKey } from "@/lib/website-sections";
import SectionManager, { type ManagedRow } from "./section-manager";
import { GoogleReviewsForm, SocialLinksForm, type SocialLinks } from "./settings-forms";

const TABS = [
  ...SECTIONS.map((s) => ({ key: s.key as string, label: s.tab })),
  // The Google reviews tab is hidden for now. Uncomment to bring it back —
  // the form below still handles it. While hidden, ?tab=reviews falls back
  // to the first tab.
  // { key: "reviews", label: "Google reviews" },
];

/**
 * The website's content, one list per tab. Everything here shows on the
 * public landing page within moments of being saved.
 */
export default async function WebsitePage({
  searchParams,
}: PageProps<"/super-admin/owner/website">) {
  await requireRole("owner");
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" && TABS.some((t) => t.key === sp.tab) ? sp.tab : TABS[0].key;

  const supabase = await createClient();
  const def = sectionByKey(tab);

  let body: React.ReactNode;

  if (def) {
    // The owner policy returns hidden rows too, which is the point here.
    let q = supabase.from(def.table).select("*").order("sort_order").order("created_at");
    for (const [k, v] of Object.entries(def.fixed ?? {})) q = q.eq(k, v);
    const { data, error } = await q;

    const rows: ManagedRow[] = (data ?? []).map((r: Record<string, unknown>) => {
      const values: Record<string, string | null> = {};
      const images: Record<string, string | null> = {};
      for (const f of def.fields) {
        const v = r[f.name];
        // FAQ pairs and picked ids arrive as arrays; the form reads them back as JSON.
        values[f.name] = typeof v === "string" ? v : v == null ? null : JSON.stringify(v);
        if (f.type === "image") images[f.name] = publicImageUrl("site-media", values[f.name]);
      }
      return { id: String(r.id), is_active: r.is_active === true, values, images };
    });

    // The Social media tab: the profile links above the Instagram posts.
    let social: SocialLinks | null = null;
    if (def.key === "instagram") {
      const { data: settings } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["instagram", "social"]);
      const get = (key: string) =>
        (settings?.find((s) => s.key === key)?.value ?? {}) as Record<string, string | null | undefined>;
      const ig = get("instagram");
      const other = get("social");
      social = {
        instagram: ig.url ?? "",
        handle: ig.handle ?? "",
        facebook: other.facebook ?? "",
        x: other.x ?? "",
        linkedin: other.linkedin ?? "",
        youtube: other.youtube ?? "",
      };
    }

    body = (
      <div className="space-y-6">
        {error && <MigrationNotice message={error.message} />}
        {social && <SocialLinksForm links={social} />}
        <SectionManager def={def} rows={rows} />
      </div>
    );
  } else {
    const { data: s, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "google_reviews")
      .maybeSingle();
    const v = (s?.value ?? {}) as { placeId?: string; minRating?: number };
    const placeId = v.placeId ?? "";
    const minRating = v.minRating ?? 4;
    const preview = placeId ? await getGoogleReviews(placeId) : null;

    body = (
      <div className="space-y-6">
        {error && <MigrationNotice message={error.message} />}
        <GoogleReviewsForm
          placeId={placeId}
          minRating={minRating}
          hasKey={!!process.env.GOOGLE_PLACES_API_KEY}
          preview={preview}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="hero animate-rise relative overflow-hidden rounded-card px-6 py-7 shadow-lift sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-hero-fg/60">
              Website
            </p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-[28px]">What visitors see</h1>
            <p className="mt-1 text-sm text-hero-fg/75">
              Changes show on the website as soon as they are saved.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-hero-fg transition-ui hover:border-white/50 hover:bg-white/20"
            >
              Open the website <span aria-hidden="true">↗</span>
            </a>
            <Link
              href="/super-admin/owner"
              className="inline-flex items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-hero-fg transition-ui hover:border-white/50 hover:bg-white/20"
            >
              <span aria-hidden="true">←</span>
              Back to dashboard
            </Link>
          </div>
        </div>

        <nav aria-label="Website sections" className="mt-7 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/super-admin/owner/website?tab=${t.key}`}
              aria-current={t.key === tab ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-bold transition-ui ${
                t.key === tab
                  ? "border-white bg-white text-fg"
                  : "border-white/25 bg-white/10 text-hero-fg hover:border-white/50 hover:bg-white/20"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </section>

      {body}
    </div>
  );
}

/** Shown when the website tables do not exist yet. */
function MigrationNotice({ message }: { message: string }) {
  return (
    <p className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
      <strong>The database is not ready for this yet.</strong> Run the website migrations in
      Supabase (supabase/migrations/20261004000014 and 20261004000015), then reload.{" "}
      <span className="text-muted">({message})</span>
    </p>
  );
}
