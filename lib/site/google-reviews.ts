/**
 * The clinic's Google rating and reviews, from the Places API (New).
 *
 * Google returns the overall rating, the number of ratings and at most five
 * reviews it picks itself. The response is cached for six hours, so Google is
 * asked a few times a day however busy the site is; the dashboard's "Refresh
 * now" expires the cache through GOOGLE_REVIEWS_TAG.
 *
 * Every failure — no API key, a wrong Place ID, quota, network — comes back
 * as null and the Reviews section hides itself. The website must never break
 * because Google did.
 *
 * Server only: the API key must not reach the browser.
 */

export const GOOGLE_REVIEWS_TAG = "google-reviews";

export type GoogleReview = {
  text: string;
  rating: number;
  author: string;
  authorUrl: string | null;
  photoUrl: string | null;
  when: string;
};

export type GoogleReviews = {
  rating: number;
  count: number;
  mapsUrl: string | null;
  reviews: GoogleReview[];
};

type PlaceResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    rating?: number;
    relativePublishTimeDescription?: string;
    text?: { text?: string };
    originalText?: { text?: string };
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }[];
};

export async function getGoogleReviews(placeId: string): Promise<GoogleReviews | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !placeId) return null;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`,
      {
        headers: {
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri",
        },
        next: { revalidate: 21600, tags: [GOOGLE_REVIEWS_TAG] },
      },
    );
    if (!res.ok) {
      console.error(`Google Places: ${res.status} ${await res.text().catch(() => "")}`);
      return null;
    }
    const place = (await res.json()) as PlaceResponse;

    const reviews: GoogleReview[] = (place.reviews ?? [])
      .map((r) => ({
        text: (r.originalText?.text || r.text?.text || "").trim(),
        rating: r.rating ?? 0,
        author: r.authorAttribution?.displayName || "Google user",
        authorUrl: r.authorAttribution?.uri ?? null,
        photoUrl: r.authorAttribution?.photoUri ?? null,
        when: r.relativePublishTimeDescription ?? "",
      }))
      // A star rating with no words has nothing to quote.
      .filter((r) => r.text);

    return {
      rating: place.rating ?? 0,
      count: place.userRatingCount ?? 0,
      mapsUrl: place.googleMapsUri ?? null,
      reviews,
    };
  } catch (err) {
    console.error("Google Places:", err);
    return null;
  }
}
