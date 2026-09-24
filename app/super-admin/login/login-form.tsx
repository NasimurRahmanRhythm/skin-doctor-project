"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Brand from "@/components/brand";
import { btnPrimary, card, field, fieldLabel } from "@/components/ui";
import { sendCode, verifyCode, type LoginState } from "./actions";

const RESEND_SECONDS = 60;

const initial: LoginState = { step: "email", email: "" };

function SubmitButton({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
      {pending ? busy : label}
    </button>
  );
}

export default function LoginForm({ expired }: { expired: boolean }) {
  const [emailState, submitEmail] = useActionState(sendCode, initial);
  const [codeState, submitCode] = useActionState(verifyCode, initial);

  const onCodeStep = emailState.step === "code";
  const state = onCodeStep && codeState.error ? codeState : emailState;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>

        <div className={`${card} px-6 py-7 sm:px-7`}>
          <h1 className="text-lg font-semibold">Staff sign in</h1>
          <p className="mt-1 text-sm text-muted">
            We email a six-digit code. No password to remember.
          </p>

          {expired && !state.error && (
            <p className="mt-5 rounded-control border border-warn/40 bg-warn/10 px-3.5 py-2.5 text-sm text-warn">
              Your session expired after 7 days. Please sign in again.
            </p>
          )}

          {!onCodeStep ? (
            <form action={submitEmail} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className={fieldLabel}>
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
                  className={`${field} mt-1.5`}
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

          {state.error && <p className="mt-4 text-sm text-danger">{state.error}</p>}
          {!state.error && onCodeStep && emailState.notice && (
            <p className="mt-4 text-sm text-muted">{emailState.notice}</p>
          )}
        </div>
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
  // wasted request eats the daily email quota.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  return (
    <>
      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="email" value={email} />
        <div>
          <label htmlFor="code" className={fieldLabel}>
            Code sent to <span className="text-fg">{email}</span>
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
            className={`${field} mt-1.5 text-center font-mono text-xl tracking-[0.5em]`}
          />
        </div>
        <SubmitButton label="Sign in" busy="Checking…" />
      </form>

      <form action={resend} className="mt-3 text-center">
        <input type="hidden" name="email" value={email} />
        <button
          type="submit"
          disabled={secondsLeft > 0}
          onClick={() => setSecondsLeft(RESEND_SECONDS)}
          className="text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
        >
          {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
        </button>
      </form>
    </>
  );
}
