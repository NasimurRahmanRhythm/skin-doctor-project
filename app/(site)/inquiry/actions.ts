"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { sendServerEvent } from "@/lib/site/meta-capi";
import { createAdminClient } from "@/lib/supabase/admin";

export type InquiryState = {
  ok?: boolean;
  /**
   * Set only when an inquiry was really saved: the browser sends its pixel
   * "Lead" with this id, the same one the server sent Meta, so it counts once.
   */
  leadEventId?: string;
  error?: string;
  fields?: Partial<Record<"name" | "email" | "phone" | "message", string>>;
};

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(120, "That name is too long."),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254),
  // Optional. Digits with the usual spaces, dashes, brackets or a leading +.
  phone: z
    .string()
    .trim()
    .max(30, "That phone number is too long.")
    .refine(
      (v) => v === "" || (/^\+?[\d\s\-().]+$/.test(v) && v.replace(/\D/g, "").length >= 6),
      "Please enter a valid phone number.",
    ),
  message: z
    .string()
    .trim()
    .min(1, "Please write a few words about what you need.")
    .max(3000, "Please keep it under 3000 characters."),
});

/** Anyone sending more than this many in an hour is a script, not a patient. */
const PER_HOUR = 5;
/** A person cannot read the form and fill it in faster than this. */
const MIN_FILL_MS = 3000;

/**
 * Saves a "Book a Consultation" inquiry for the owner's dashboard.
 *
 * The public has no access to the inquiries table at all, so this inserts
 * with the service role — after validating, and after the spam checks below.
 */
export async function submitInquiry(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  // Bots fill every field, including the one people never see; and they post
  // the instant the page loads. Either way, pretend it worked.
  if (String(formData.get("company") ?? "")) return { ok: true };
  const shownAt = Number(formData.get("t"));
  if (!shownAt || Date.now() - shownAt < MIN_FILL_MS) return { ok: true };

  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) {
    const fields: InquiryState["fields"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<InquiryState["fields"]>;
      fields[key] ??= issue.message;
    }
    return { fields };
  }

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;

  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  // Quoted, so an address or IPv6 with PostgREST's reserved characters in it
  // still reads as one value.
  const q = (v: string) => `"${v.replace(/["\\]/g, "")}"`;
  const sameSender = ip
    ? `email.eq.${q(parsed.data.email)},ip.eq.${q(ip)}`
    : `email.eq.${q(parsed.data.email)}`;
  const { count } = await admin
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .or(sameSender);
  if ((count ?? 0) >= PER_HOUR) {
    return { error: "We've already received several messages from you this hour. We'll be in touch soon." };
  }

  // The ad campaign this visitor arrived with, if any (the form carries it).
  const tag = (key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max) || null;
  const campaign = {
    utm_source: tag("utm_source", 100),
    utm_medium: tag("utm_medium", 100),
    utm_campaign: tag("utm_campaign", 150),
  };
  const session = String(formData.get("session_id") ?? "");
  const sessionId = /^[A-Za-z0-9_-]{8,64}$/.test(session) ? session : null;

  const { phone, ...rest } = parsed.data;
  let { error } = await admin.from("inquiries").insert({ ...rest, phone: phone || null, ip, ...campaign });
  // Before the campaign columns exist (migration 20261114000033), save without them.
  if (error && /utm_/i.test(error.message)) {
    ({ error } = await admin.from("inquiries").insert({ ...rest, phone: phone || null, ip }));
  }
  // Before the phone column exists (migration 20261008000022), keep the
  // number by adding it to the message rather than losing the inquiry.
  if (error && phone && /phone/i.test(error.message)) {
    ({ error } = await admin
      .from("inquiries")
      .insert({ ...rest, message: `${rest.message}\n\nPhone: ${phone}`, ip }));
  }
  if (error) {
    console.error("inquiry insert:", error.message);
    return { error: "Sorry — your message could not be sent. Please try again in a moment." };
  }

  revalidatePath("/admin/owner/inquiries");
  revalidatePath("/admin/owner");

  // The Lead for Meta's Conversions API, once the visitor has their answer:
  // a slow or failing Meta never holds up the form. Email and phone go only
  // hashed; the message never goes.
  const eventId = /^[\w-]{8,64}$/.test(String(formData.get("event_id") ?? ""))
    ? String(formData.get("event_id"))
    : crypto.randomUUID();
  const jar = await cookies();
  const userAgent = h.get("user-agent");
  const sourceUrl = h.get("referer") ?? "https://www.dermasoulbd.com/inquiry";
  // The site's own counter: a lead, credited to the visit it came from.
  after(async () => {
    await admin.from("site_events").insert({
      event: "lead",
      path: "/inquiry",
      session_id: sessionId,
      ...campaign,
      device: /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent ?? "") ? "mobile" : "desktop",
    });
  });
  after(() =>
    sendServerEvent({
      name: "Lead",
      id: eventId,
      sourceUrl,
      user: {
        email: parsed.data.email,
        phone: phone || null,
        ip,
        userAgent,
        fbp: jar.get("_fbp")?.value ?? null,
        fbc: jar.get("_fbc")?.value ?? null,
      },
    }),
  );

  return { ok: true, leadEventId: eventId };
}
