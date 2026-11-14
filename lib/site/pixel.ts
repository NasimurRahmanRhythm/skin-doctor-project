/**
 * The Meta (Facebook / Instagram) Pixel, browser side.
 *
 * The pixel is a public number — it appears in every page's script anyway —
 * so it may live here; NEXT_PUBLIC_META_PIXEL_ID overrides it. What it is
 * told is deliberately thin: which page, which treatment, that a lead came in
 * or a contact button was pressed. Never a name, a phone number, an email or
 * what someone wrote: this is a clinic, and Meta's rules forbid health data.
 *
 * Everything here quietly does nothing when the pixel is off, blocked by an
 * ad-blocker, or not loaded yet — tracking must never break the site.
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "1820242252196435";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

/** Meta's standard events this site sends. */
export type StandardEvent = "PageView" | "ViewContent" | "Lead" | "Contact";

/**
 * An id for one event, shared by the browser pixel and the server's
 * Conversions API so Meta counts the pair once.
 */
export function newEventId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Calls the pixel. On the first page an event can come before Meta's snippet
 * has run (both start right after the page wakes up), so it waits a little —
 * up to about five seconds — rather than being lost. Blocked or switched off,
 * it gives up quietly.
 */
function fbq(...args: unknown[]) {
  if (typeof window === "undefined") return;
  let tries = 0;
  const send = () => {
    if (typeof window.fbq === "function") {
      try {
        window.fbq(...args);
      } catch {
        // Tracking is never worth an error on the page.
      }
    } else if (tries++ < 25) {
      setTimeout(send, 200);
    }
  };
  send();
}

/** A standard event, optionally with its id for deduplication. */
export function track(event: StandardEvent, params?: Record<string, unknown>, eventId?: string) {
  fbq("track", event, params ?? {}, eventId ? { eventID: eventId } : undefined);
}

/** An event of the site's own, e.g. "BookClick". */
export function trackCustom(event: string, params?: Record<string, unknown>) {
  fbq("trackCustom", event, params ?? {});
}
