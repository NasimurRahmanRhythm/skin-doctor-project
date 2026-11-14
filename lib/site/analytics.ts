/**
 * The website's own visit counter (public.site_events), browser side. It runs
 * beside the Meta Pixel but does not depend on it, so an ad-blocker that stops
 * Meta does not stop this.
 *
 * Nothing about the person is sent: a random id for this visit (one browser
 * tab session), the ad campaign the visitor arrived with (utm_* in the link),
 * which site sent them, and what they did. The server works out phone or
 * computer from the browser it sees.
 */

export type SiteEvent = "page_view" | "view_content" | "contact" | "book_click";

const SESSION_KEY = "ds_sid";
const REFERRER_KEY = "ds_ref";
const CAMPAIGN_KEY = "ds_utm";
/** How long a campaign is remembered after the visitor came from it. */
const CAMPAIGN_DAYS = 30;

export type Campaign = { source?: string; medium?: string; campaign?: string };

function store(kind: "session" | "local"): Storage | null {
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null; // private mode or storage switched off
  }
}

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/** This visit's id, made on its first page and kept until the tab closes. */
export function sessionId(): string {
  const s = store("session");
  let id = s?.getItem(SESSION_KEY) ?? "";
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = randomId();
    s?.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Notes, on each page, where the visitor came from: the utm_* tags in the
 * link (kept for 30 days, so an inquiry days later is still credited to the
 * ad) and, for a visit's first page, the site that sent them.
 */
export function noteArrival() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const tag = (k: string) => params.get(k)?.trim().slice(0, 150) || undefined;
  const found: Campaign = { source: tag("utm_source"), medium: tag("utm_medium"), campaign: tag("utm_campaign") };
  if (found.source || found.campaign) {
    store("local")?.setItem(CAMPAIGN_KEY, JSON.stringify({ ...found, at: Date.now() }));
  }
  const s = store("session");
  if (s && s.getItem(REFERRER_KEY) === null) {
    let host = "";
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.host !== window.location.host) host = ref.host;
    } catch {
      // an unreadable referrer counts as none
    }
    s.setItem(REFERRER_KEY, host);
  }
}

/** The campaign this visitor came from, if within the last 30 days. */
export function currentCampaign(): Campaign {
  try {
    const raw = store("local")?.getItem(CAMPAIGN_KEY);
    if (!raw) return {};
    const c = JSON.parse(raw) as Campaign & { at?: number };
    if (!c.at || Date.now() - c.at > CAMPAIGN_DAYS * 86_400_000) return {};
    return { source: c.source, medium: c.medium, campaign: c.campaign };
  } catch {
    return {};
  }
}

/** Records one event. Fire and forget: it survives the page closing, and never throws. */
export function record(event: SiteEvent, label?: string) {
  if (typeof window === "undefined") return;
  try {
    const c = currentCampaign();
    const body = JSON.stringify({
      event,
      path: window.location.pathname,
      label: label?.slice(0, 120),
      session_id: sessionId(),
      utm_source: c.source,
      utm_medium: c.medium,
      utm_campaign: c.campaign,
      referrer_host: store("session")?.getItem(REFERRER_KEY) || undefined,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/events", blob)) {
      void fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {
    // Counting is never worth an error on the page.
  }
}
