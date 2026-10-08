"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { inquiry } from "@/lib/site/content";
import { Arrow } from "@/components/site/Icons";
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
      }}
    >
      <input ref={startedAt} type="hidden" name="t" defaultValue="" />
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
