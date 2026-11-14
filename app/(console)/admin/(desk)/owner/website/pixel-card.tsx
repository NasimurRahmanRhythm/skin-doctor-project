"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { btnPrimary, card, cardPad, field, fieldLabel, SectionHead } from "@/components/ui";
import { sendPixelTest, type PixelTestState } from "./pixel-actions";

function Send({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className={btnPrimary}>
      {pending ? "Sending…" : "Send test event"}
    </button>
  );
}

function Status({ on, label, detail }: { on: boolean; label: string; detail: string }) {
  return (
    <div className="rounded-control border border-hairline bg-subtle/50 px-4 py-3">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <span className={`mt-1 block text-sm font-extrabold ${on ? "text-ok" : "text-warn"}`}>
        {on ? "● Connected" : "○ Not set"}
      </span>
      <span className="mt-0.5 block break-all text-xs text-muted">{detail}</span>
    </div>
  );
}

/**
 * Whether the Meta Pixel and the Conversions API are working. The token is
 * never shown — only whether the server has one — and the test asks Meta
 * itself whether it is accepted.
 */
export default function PixelCard({ pixelId, capi }: { pixelId: string; capi: boolean }) {
  const [state, action] = useActionState<PixelTestState, FormData>(sendPixelTest, {});
  return (
    <section className={`${card} ${cardPad}`}>
      <SectionHead
        title="Meta Pixel"
        hint="Tells Facebook and Instagram ads which visits turn into inquiries. Visitors see nothing; results show in Meta's Events Manager and Ads Manager."
        trailing={
          <a
            href={`https://business.facebook.com/events_manager2/list/pixel/${encodeURIComponent(pixelId)}/overview`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-primary hover:underline"
          >
            Open Events Manager ↗
          </a>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Status on={Boolean(pixelId)} label="Browser pixel" detail={pixelId ? `Pixel ID ${pixelId}` : "No pixel ID"} />
        <Status
          on={capi}
          label="Conversions API (server)"
          detail={capi ? "Access token set on the server" : "Add META_CAPI_ACCESS_TOKEN in Vercel, then redeploy"}
        />
      </div>

      <div className="mt-5 rounded-control border border-hairline p-4 text-sm">
        <h3 className="font-extrabold">What is sent</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li><span className="font-semibold text-fg">PageView</span> — every page of the website</li>
          <li><span className="font-semibold text-fg">ViewContent</span> — a treatment page, with the treatment&rsquo;s name</li>
          <li><span className="font-semibold text-fg">Lead</span> — an inquiry sent (from the browser and from the server)</li>
          <li><span className="font-semibold text-fg">Contact</span> — WhatsApp, Instagram message or phone tapped</li>
          <li><span className="font-semibold text-fg">BookClick</span> — any &ldquo;Book a Consultation&rdquo; button tapped</li>
        </ul>
        <p className="mt-2 text-xs text-muted">
          Never a name, a message or anything about someone&rsquo;s skin. Email and phone reach Meta only scrambled (hashed), so it can match the person without reading them.
        </p>
      </div>

      <form action={action} className="mt-5 flex flex-wrap items-end gap-3">
        <label className={`${fieldLabel} min-w-48 flex-1`}>
          Test event code <span className="font-medium text-muted">(optional)</span>
          <input
            name="test_code"
            maxLength={20}
            placeholder="e.g. TEST12345, from Events Manager → Test events"
            className={`${field} mt-1.5`}
          />
        </label>
        <Send disabled={!capi} />
      </form>
      {state.message && (
        <p className={`mt-3 text-sm font-semibold ${state.ok ? "text-ok" : "text-danger"}`}>{state.message}</p>
      )}
    </section>
  );
}
