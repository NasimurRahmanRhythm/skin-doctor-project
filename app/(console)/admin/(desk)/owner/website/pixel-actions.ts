"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { capiConfigured, sendServerEvent } from "@/lib/site/meta-capi";

export type PixelTestState = { ok?: boolean; message?: string };

/**
 * Sends Meta one PageView from this server, to show the access token works.
 * With a Test event code from Events Manager → Test events, it appears there
 * within seconds; without one it only reports whether Meta accepted it.
 */
export async function sendPixelTest(_prev: PixelTestState, formData: FormData): Promise<PixelTestState> {
  await requireRole("owner");
  if (!capiConfigured()) {
    return { ok: false, message: "The Conversions API token is not set on the server yet." };
  }
  const code = z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{0,20}$/, "A test code is letters and numbers, like TEST12345.")
    .safeParse(String(formData.get("test_code") ?? ""));
  if (!code.success) return { ok: false, message: code.error.issues[0]?.message };

  // Meta wants something about who; for a test, the owner's own browser.
  const h = await headers();
  const res = await sendServerEvent({
    name: "PageView",
    id: `test-${crypto.randomUUID()}`,
    sourceUrl: "https://www.dermasoulbd.com/",
    user: {
      ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip"),
      userAgent: h.get("user-agent"),
    },
    testCode: code.data || null,
  });
  if (!res.ok) return { ok: false, message: `Meta did not accept it: ${res.error}` };
  return {
    ok: true,
    message: code.data
      ? "Sent. It should show in Events Manager → Test events within a minute."
      : `Meta accepted it (${res.eventsReceived ?? 1} event received). The token works.`,
  };
}
