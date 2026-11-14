"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { inquiry } from "@/lib/site/content";
import { Arrow } from "@/components/site/Icons";
import { currentCampaign, sessionId } from "@/lib/site/analytics";
import { newEventId, track } from "@/lib/site/pixel";
import { submitInquiry, type InquiryState } from "./actions";

function Send() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-dark btn-block">
      <span>{pending ? "Sending…" : "Send inquiry"}</span>
      <Arrow width={18} />
    </button>
  );
}

/** Name, email, an optional phone number, and a message. */
export default function InquiryForm({ about }: { about: string | null }) {
  const [state, action] = useActionState<InquiryState, FormData>(submitInquiry, {});
  // When the visitor first touched the form. A post with none, or one that
  // comes back a moment later, is a script rather than a person.
  const startedAt = useRef<HTMLInputElement>(null);
  // One id per inquiry, shared with the server's copy of the Lead for Meta.
  const eventId = useRef<HTMLInputElement>(null);
  // The visit and the ad campaign it came from, so the owner sees which ad
  // brought this inquiry.
  const visit = useRef<HTMLDivElement>(null);

  // A Lead only for an inquiry that was really saved (spam is answered "ok"
  // too, but without an id).
  useEffect(() => {
    if (state.leadEventId) track("Lead", {}, state.leadEventId);
  }, [state.leadEventId]);

  if (state.ok) {
    return (
      <div className="inquiry-form">
        <p className="inquiry-msg" role="status">
          {inquiry.thanks}
        </p>
      </div>
    );
  }

  const err = state.fields ?? {};

  return (
    <form
      action={action}
      className="inquiry-form"
      noValidate
      onFocus={() => {
        if (startedAt.current && !startedAt.current.value) startedAt.current.value = String(Date.now());
        if (eventId.current && !eventId.current.value) eventId.current.value = newEventId();
        const box = visit.current;
        if (box && !box.dataset.filled) {
          box.dataset.filled = "1";
          const c = currentCampaign();
          const set = (name: string, value?: string) => {
            const input = box.querySelector<HTMLInputElement>(`input[name="${name}"]`);
            if (input) input.value = value ?? "";
          };
          set("session_id", sessionId());
          set("utm_source", c.source);
          set("utm_medium", c.medium);
          set("utm_campaign", c.campaign);
        }
      }}
    >
      <input ref={startedAt} type="hidden" name="t" defaultValue="" />
      <input ref={eventId} type="hidden" name="event_id" defaultValue="" />
      <div ref={visit} hidden>
        {["session_id", "utm_source", "utm_medium", "utm_campaign"].map((name) => (
          <input key={name} type="hidden" name={name} defaultValue="" />
        ))}
      </div>
      <div className="field-trap" aria-hidden>
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="field">
        <input
          id="name"
          name="name"
          type="text"
          placeholder=" "
          required
          maxLength={120}
          autoComplete="name"
          aria-invalid={!!err.name}
        />
        <label htmlFor="name">Your name</label>
        {err.name && <p className="field-error">{err.name}</p>}
      </div>
      <div className="field">
        <input
          id="email"
          name="email"
          type="email"
          placeholder=" "
          required
          maxLength={254}
          autoComplete="email"
          aria-invalid={!!err.email}
        />
        <label htmlFor="email">Email</label>
        {err.email && <p className="field-error">{err.email}</p>}
      </div>
      <div className="field">
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder=" "
          maxLength={30}
          autoComplete="tel"
          inputMode="tel"
          aria-invalid={!!err.phone}
        />
        <label htmlFor="phone">Phone number</label>
        {err.phone && <p className="field-error">{err.phone}</p>}
      </div>
      <div className="field">
        <textarea
          id="message"
          name="message"
          placeholder=" "
          required
          maxLength={3000}
          defaultValue={about ? `I'm interested in: ${about}\n\n` : ""}
          aria-invalid={!!err.message}
        />
        <label htmlFor="message">How can we help?</label>
        {err.message && <p className="field-error">{err.message}</p>}
      </div>

      <Send />
      {state.error && (
        <p className="inquiry-msg is-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
