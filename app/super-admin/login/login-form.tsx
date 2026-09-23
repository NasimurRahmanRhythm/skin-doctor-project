"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendCode, verifyCode, type LoginState } from "./actions";

const RESEND_SECONDS = 60;

const initial: LoginState = { step: "email", email: "" };

function SubmitButton({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full border border-sage bg-sage px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-sage-deep disabled:opacity-50 rounded-card"
    >
      {pending ? busy : label}
    </button>
  );
}

export default function LoginForm({ expired }: { expired: boolean }) {
  const [emailState, submitEmail] = useActionState(sendCode, initial);
  const [codeState, submitCode] = useActionState(verifyCode, initial);

  // Once a code has been sent, the code form owns the screen.
  const onCodeStep = emailState.step === "code";
  const state = onCodeStep && codeState.error ? codeState : emailState;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm border border-line bg-paper px-8 py-10 rounded-card">
        <h1 className="font-serif text-2xl">
          Lum<em className="italic text-rose">e</em>n &amp; Leaf
        </h1>
        <p className="mt-1 text-sm text-ink-soft">Staff sign in</p>

        {expired && !state.error && (
          <p className="mt-6 border border-line bg-ivory-dim px-4 py-3 text-sm text-ink-soft rounded-card">
            Your session has expired after 7 days. Please sign in again.
          </p>
        )}

        {!onCodeStep ? (
          <form action={submitEmail} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs text-ink-soft">
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={emailState.email}
                placeholder="you@clinic.com"
                className="mt-2 w-full border border-line bg-ivory px-4 py-3 text-sm text-ink outline-none focus:outline-2 focus:outline-sage rounded-card"
              />
            </div>
            <SubmitButton label="Send code" busy="Sending…" />
          </form>
        ) : (
          <CodeForm
            email={emailState.email}
            action={submitCode}
            resend={submitEmail}
          />
        )}

        {state.error && (
          <p className="mt-4 text-sm text-err">{state.error}</p>
        )}
        {!state.error && emailState.notice && (
          <p className="mt-4 text-sm text-ink-soft">{emailState.notice}</p>
        )}
      </div>
    </main>
  );
}

function CodeForm({
  email,
  action,
  resend,
}: {
  email: string;
  action: (formData: FormData) => void;
  resend: (formData: FormData) => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Supabase allows one code request per 60s. Showing the countdown is kinder
  // than letting someone mash the button into a rate-limit error — and every
  // wasted request eats the Resend daily quota.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  return (
    <>
      <form action={action} className="mt-8 space-y-4">
        <input type="hidden" name="email" value={email} />
        <div>
          <label htmlFor="code" className="block text-xs text-ink-soft">
            6-digit code sent to {email}
          </label>
          <input
            ref={inputRef}
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="\d{6}"
            required
            placeholder="123456"
            className="mt-2 w-full border border-line bg-ivory px-4 py-3 text-center font-serif text-xl tracking-[0.4em] text-ink outline-none focus:outline-2 focus:outline-sage rounded-card"
          />
        </div>
        <SubmitButton label="Sign in" busy="Checking…" />
      </form>

      <form action={resend} className="mt-4 text-center">
        <input type="hidden" name="email" value={email} />
        <button
          type="submit"
          disabled={secondsLeft > 0}
          onClick={() => setSecondsLeft(RESEND_SECONDS)}
          className="text-xs text-sage underline disabled:no-underline disabled:opacity-60"
        >
          {secondsLeft > 0
            ? `Resend code in ${secondsLeft}s`
            : "Resend code"}
        </button>
      </form>
    </>
  );
}
