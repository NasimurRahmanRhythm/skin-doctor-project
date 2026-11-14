import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Where the website's visit counter sends its events (lib/site/analytics.ts).
 * The public cannot write the events table, so this checks every field and
 * writes with the service role. Search engines and link previews are not
 * visitors and are dropped. Always answers 204: a counter must never trouble
 * the page.
 */

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const schema = z.object({
  event: z.enum(["page_view", "view_content", "contact", "book_click"]),
  path: z.string().trim().max(300).regex(/^\//),
  label: text(120),
  session_id: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  utm_source: text(100),
  utm_medium: text(100),
  utm_campaign: text(150),
  referrer_host: text(120),
});

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse/i;

export async function POST(request: Request) {
  const done = new Response(null, { status: 204 });
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return done;

  let input: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 4000) return done;
    input = JSON.parse(raw);
  } catch {
    return done;
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return done;

  const device = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop";
  const { error } = await createAdminClient()
    .from("site_events")
    .insert({ ...parsed.data, device });
  // Before migration 20261114000033 the table does not exist; stay quiet.
  if (error && !/site_events/i.test(error.message)) console.error("site event:", error.message);
  return done;
}
