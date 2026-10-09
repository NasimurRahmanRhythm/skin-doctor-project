"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { btnGhost, btnPrimary, card, cardPad, field, fieldLabel, SectionHead } from "@/components/ui";
import {
  refreshGoogleReviews,
  saveGoogleReviews,
  saveSocialLinks,
  type WebsiteState,
} from "./actions";

function Submit({ label = "Save" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function Status({ state }: { state: WebsiteState }) {
  if (state.error) return <p className="mt-4 text-sm font-semibold text-danger">{state.error}</p>;
  if (state.notice) return <p className="mt-4 text-sm font-semibold text-ok">{state.notice}</p>;
  return null;
}

export type SocialLinks = {
  instagram: string;
  handle: string;
  facebook: string;
  x: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
};

const NETWORKS: { name: keyof SocialLinks; label: string; placeholder: string }[] = [
  { name: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/dermasoul" },
  { name: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/dermasoul.aesthetics/" },
  { name: "x", label: "X (Twitter)", placeholder: "https://x.com/dermasoul" },
  { name: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/company/dermasoul" },
  { name: "youtube", label: "YouTube channel", placeholder: "https://www.youtube.com/@dermasoul" },
  { name: "tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@dermasoul" },
];

/**
 * The clinic's social media profiles. Each one set shows as an icon in the
 * website's footer; Instagram also drives the Instagram section below.
 */
export function SocialLinksForm({ links }: { links: SocialLinks }) {
  const [state, action] = useActionState<WebsiteState, FormData>(saveSocialLinks, {});
  return (
    <form action={action} className={`${card} ${cardPad}`}>
      <SectionHead
        title="Social media"
        hint="Every link is optional. Each one you add shows as an icon in the website's footer. The Instagram link also opens from the Instagram section's heading, its “View on Instagram” button and the floating Instagram button; leave it empty to hide that section."
      />
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {NETWORKS.map((n) => (
          <div key={n.name}>
            <label htmlFor={`social-${n.name}`} className={fieldLabel}>
              {n.label} <span className="font-medium text-muted">(optional)</span>
            </label>
            <input
              id={`social-${n.name}`}
              name={n.name}
              type="url"
              defaultValue={links[n.name]}
              maxLength={300}
              placeholder={n.placeholder}
              className={`${field} mt-1.5`}
            />
          </div>
        ))}
        <div>
          <label htmlFor="social-handle" className={fieldLabel}>
            Instagram handle <span className="font-medium text-muted">(optional)</span>
          </label>
          <input
            id="social-handle"
            name="handle"
            defaultValue={links.handle}
            maxLength={60}
            placeholder="Taken from the Instagram link if empty"
            className={`${field} mt-1.5`}
          />
        </div>
      </div>
      <Status state={state} />
      <div className="mt-6">
        <Submit />
      </div>
    </form>
  );
}

export type ReviewsPreview = {
  rating: number;
  count: number;
  reviews: { author: string; rating: number; text: string; when: string }[];
} | null;

/** Which Google listing the Reviews section reads, with what Google returns now. */
export function GoogleReviewsForm({
  placeId,
  minRating,
  hasKey,
  preview,
}: {
  placeId: string;
  minRating: number;
  hasKey: boolean;
  preview: ReviewsPreview;
}) {
  const [state, action] = useActionState<WebsiteState, FormData>(saveGoogleReviews, {});
  return (
    <div className="space-y-6">
      <form action={action} className={`${card} ${cardPad}`}>
        <SectionHead
          title="Google reviews"
          hint="The Reviews section shows the clinic's Google rating and up to 5 reviews Google picks. They refresh by themselves every few hours."
        />
        {!hasKey && (
          <p className="mt-5 rounded-control border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-fg">
            <strong>Not connected yet.</strong> The server has no <code>GOOGLE_PLACES_API_KEY</code>,
            so the Reviews section stays hidden. Add the key to the environment, then come back here.
          </p>
        )}
        <div className="mt-5 grid gap-5 sm:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor="g-place" className={fieldLabel}>
              Google Place ID
            </label>
            <input
              id="g-place"
              name="placeId"
              defaultValue={placeId}
              placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
              className={`${field} mt-1.5 font-mono text-[13px]`}
            />
            <p className="mt-1.5 text-xs text-muted">
              Find it with Google&rsquo;s{" "}
              <a
                href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                Place ID Finder
              </a>{" "}
              by searching for the clinic. Leave empty to hide the section.
            </p>
          </div>
          <div>
            <label htmlFor="g-min" className={fieldLabel}>
              Show reviews with at least
            </label>
            <select id="g-min" name="minRating" defaultValue={String(minRating)} className={`${field} mt-1.5`}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "star" : "stars"}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted">The overall rating is always Google&rsquo;s real one.</p>
          </div>
        </div>
        <Status state={state} />
        <div className="mt-6 flex flex-wrap gap-3">
          <Submit />
          <button type="submit" formAction={refreshGoogleReviews} formNoValidate className={`${btnGhost} px-4 py-2.5`}>
            Refresh now
          </button>
        </div>
      </form>

      <section className={`${card} ${cardPad}`}>
        <SectionHead title="What Google returns now" />
        {preview ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm">
              <strong className="text-2xl font-extrabold">{preview.rating.toFixed(1)}</strong>{" "}
              <span className="text-muted">from {preview.count} Google ratings</span>
            </p>
            <ul className="divide-y divide-hairline">
              {preview.reviews.map((r, i) => (
                <li key={i} className="py-3 text-sm">
                  <span className="font-bold">{r.author}</span>{" "}
                  <span className="text-warn">{"★".repeat(Math.round(r.rating))}</span>{" "}
                  <span className="text-xs text-muted">{r.when}</span>
                  {r.rating < minRating && (
                    <span className="ml-2 rounded-full bg-subtle px-2 py-0.5 text-[11px] font-bold text-muted">
                      hidden by the minimum
                    </span>
                  )}
                  <p className="mt-1 line-clamp-3 text-muted">{r.text}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">
            Nothing yet — {hasKey ? "check the Place ID." : "the API key is missing."}
          </p>
        )}
      </section>
    </div>
  );
}
