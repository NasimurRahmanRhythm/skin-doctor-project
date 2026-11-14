import "server-only";
import { createHash } from "node:crypto";
import { META_PIXEL_ID } from "@/lib/site/pixel";

/**
 * Meta's Conversions API: the same events the browser pixel sends, sent again
 * from this server, so an ad-blocker or iPhone's tracking settings cannot
 * lose them. Each carries the browser's event id, and Meta counts the pair
 * once.
 *
 * The access token lives only in META_CAPI_ACCESS_TOKEN (never NEXT_PUBLIC_,
 * so it never reaches a browser), is read only here, and is never logged.
 * Without it this does nothing, and the browser pixel carries on alone.
 *
 * What Meta is told about the person is only what lets it recognise them:
 * the email and phone hashed (SHA-256), never in the clear; the IP and
 * browser they came from; and Meta's own cookies. Never a name or what they
 * wrote.
 */

const TOKEN_ENV = "META_CAPI_ACCESS_TOKEN";

export function capiConfigured(): boolean {
  return Boolean(process.env[TOKEN_ENV]?.trim() && META_PIXEL_ID);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Bangladeshi numbers with the country code, digits only: 01711… → 8801711…. */
function normalisePhone(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  if (d.length < 6) return null;
  if (d.startsWith("880")) return d;
  if (d.startsWith("0") && d.length === 11) return `88${d}`;
  return d;
}

export type ServerEvent = {
  name: "Lead" | "Contact" | "ViewContent" | "PageView";
  /** The browser pixel's event id for the same event. */
  id: string;
  sourceUrl: string;
  user: {
    email?: string | null;
    phone?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    /** Meta's _fbp and _fbc cookies, if the browser had them. */
    fbp?: string | null;
    fbc?: string | null;
  };
  /** Only for Meta's "Test events" screen; never set in normal use. */
  testCode?: string | null;
};

export type ServerEventResult = { ok: boolean; error?: string; eventsReceived?: number };

/** Sends one event. Never throws: a failure is returned (and logged without the token). */
export async function sendServerEvent(event: ServerEvent): Promise<ServerEventResult> {
  const token = process.env[TOKEN_ENV]?.trim();
  if (!token || !META_PIXEL_ID) return { ok: false, error: "The Conversions API token is not set." };

  const email = event.user.email?.trim().toLowerCase();
  const phone = event.user.phone ? normalisePhone(event.user.phone) : null;
  const user_data: Record<string, unknown> = {
    ...(email ? { em: [sha256(email)] } : {}),
    ...(phone ? { ph: [sha256(phone)] } : {}),
    ...(event.user.ip ? { client_ip_address: event.user.ip } : {}),
    ...(event.user.userAgent ? { client_user_agent: event.user.userAgent } : {}),
    ...(event.user.fbp ? { fbp: event.user.fbp } : {}),
    ...(event.user.fbc ? { fbc: event.user.fbc } : {}),
  };

  const testCode = event.testCode ?? process.env.META_CAPI_TEST_CODE?.trim();
  const body = {
    data: [
      {
        event_name: event.name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.id,
        action_source: "website",
        event_source_url: event.sourceUrl,
        user_data,
      },
    ],
    ...(testCode ? { test_event_code: testCode } : {}),
    access_token: token,
  };

  // No version in the path: Meta then answers with the app's own version,
  // which it keeps supporting, rather than one that later retires.
  const version = process.env.META_GRAPH_API_VERSION?.trim();
  const url = `https://graph.facebook.com/${version ? `${version}/` : ""}${encodeURIComponent(META_PIXEL_ID)}/events`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    const json = (await res.json().catch(() => ({}))) as {
      events_received?: number;
      error?: { message?: string };
    };
    if (!res.ok) {
      const error = json.error?.message ?? `Meta answered ${res.status}.`;
      console.error("meta capi:", error);
      return { ok: false, error };
    }
    return { ok: true, eventsReceived: json.events_received };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Could not reach Meta.";
    console.error("meta capi:", error);
    return { ok: false, error };
  }
}
