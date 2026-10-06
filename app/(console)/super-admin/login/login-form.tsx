"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { BrandLockup } from "@/components/brand";
import { btnPrimary, card, field, fieldLabel } from "@/components/ui";
import { sendCode, verifyCode, type LoginState } from "./actions";

const RESEND_SECONDS = 60;
const CODE_LENGTH = 6;

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
          <BrandLockup width={200} />
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
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    boxes.current[0]?.focus();
  }, []);

  /** Writes digits from one box onward, then moves on — or signs in when full. */
  const fill = (start: number, chars: string) => {
    const next = [...digits];
    for (let k = 0; k < chars.length && start + k < CODE_LENGTH; k++) {
      next[start + k] = chars[k];
    }
    setDigits(next);
    boxes.current[Math.min(start + chars.length, CODE_LENGTH - 1)]?.focus();
    // Once the hidden field has the new value, not before.
    if (next.every(Boolean)) setTimeout(() => formRef.current?.requestSubmit(), 0);
  };

  const onChange = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");
    if (!typed) {
      setDigits((prev) => prev.map((d, k) => (k === i ? "" : d)));
      return;
    }
    // A second digit typed into a full box replaces the one that was there.
    if (typed.length === 2 && digits[i]) {
      fill(i, typed[0] === digits[i] ? typed[1] : typed[0]);
      return;
    }
    // Longer than that is the browser or the keyboard offering the whole code.
    fill(typed.length > 1 ? 0 : i, typed);
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      setDigits((prev) => prev.map((d, k) => (k === i - 1 ? "" : d)));
      boxes.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      boxes.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) {
      e.preventDefault();
      boxes.current[i + 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    fill(0, pasted.slice(0, CODE_LENGTH));
  };

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
      <form ref={formRef} action={action} className="mt-6 space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="code" value={digits.join("")} />
        <div>
          <span id="code-label" className={fieldLabel}>
            Code sent to <span className="text-fg">{email}</span>
          </span>
          <div
            role="group"
            aria-labelledby="code-label"
            className="mt-1.5 grid grid-cols-6 gap-2"
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                value={d}
                onChange={(e) => onChange(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                // Only the first box, so an offered code lands once and spreads.
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
                className={`${field} h-12 px-0 text-center font-mono text-xl font-semibold`}
              />
            ))}
          </div>
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
