"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  btnGhost,
  btnPrimary,
  card,
  cardPad,
  field as fieldBase,
  fieldLabel as label,
  SectionHead,
} from "@/components/ui";
import {
  CALL_TYPES,
  optionLabel,
  type CallOptions,
  type PhoneLookup,
} from "@/lib/call-log";
import { formatClinicDate, formatDateOfBirth } from "@/lib/clinic";
import { logCall, lookupPhone, type LogCallState } from "./actions";

const field = `${fieldBase} mt-1.5`;

/** What the confirmation lists, in the form's order. */
const summary = (o: CallOptions): { name: string; label: string; options?: readonly { value: string; label: string }[] }[] => [
  { name: "customer_name", label: "Customer" },
  { name: "phone", label: "Phone" },
  { name: "call_type", label: "Call type", options: CALL_TYPES },
  { name: "reason", label: "Reason", options: o.reasons },
  { name: "product", label: "Product / skin concern" },
  { name: "outcome", label: "Outcome", options: o.outcomes },
  { name: "duration_min", label: "Duration (minutes)" },
  { name: "follow_up_date", label: "Follow-up date" },
  { name: "recording_url", label: "Recording link" },
  { name: "notes", label: "Notes" },
];

/** Starting values, from "Log follow-up" on a callback that is owed. */
export type CallPrefill = { customer_name?: string; phone?: string; reason?: string };

const digits = (phone: string) => phone.replace(/\D/g, "").length;

/**
 * Under the phone box: whether this number has called before, the last call,
 * and whether it belongs to a clinic patient. Looked up a beat after typing.
 */
function PhoneHistory({
  looked,
  data,
  duplicate,
  options,
  onUseName,
}: {
  /** Whether the number in the box has been looked up yet. */
  looked: boolean;
  data: PhoneLookup | null;
  duplicate: string | null;
  options: CallOptions;
  onUseName: (name: string) => void;
}) {
  if (!looked) return null;
  if (!data || (data.calls === 0 && data.patients.length === 0)) {
    return <p className="mt-1.5 text-xs text-muted">New number — no calls or patient record yet.</p>;
  }

  const last = data.last;
  const owed = last?.follow_up_date && last.outcome !== "sold";
  return (
    <div className="mt-2 space-y-1.5 rounded-control border border-primary/30 bg-primary-soft/40 p-3 text-xs">
      {duplicate && (
        <p role="alert" className="rounded-md bg-warn/15 px-2 py-1.5 font-bold text-warn">
          ⚠ {duplicate} Make sure you are not logging the same call twice.
        </p>
      )}
      {data.calls > 0 && last && (
        <p>
          <span className="font-bold">
            Called {data.calls} {data.calls === 1 ? "time" : "times"} before.
          </span>{" "}
          Last: {formatClinicDate(last.created_at)} — {optionLabel(options.outcomes, last.outcome)},{" "}
          {optionLabel(options.reasons, last.reason).toLowerCase()}
          {last.agent ? ` (${last.agent})` : ""}.
          {owed && (
            <span className="font-bold text-warn">
              {" "}Follow-up due {formatDateOfBirth(last.follow_up_date!)}.
            </span>
          )}
          {last.notes && <span className="mt-0.5 block text-muted">“{last.notes}”</span>}
        </p>
      )}
      {data.patients.map((p) => (
        <p key={p.patient_code}>
          <span className="font-bold text-ok">Clinic patient:</span>{" "}
          <span className="font-mono font-bold">{p.patient_code}</span> · {p.full_name} ·{" "}
          {p.visits} {p.visits === 1 ? "visit" : "visits"}
          {p.last_visit ? `, last ${formatClinicDate(p.last_visit)}` : ""}
        </p>
      ))}
      {(last?.customer_name || data.patients[0]?.full_name) && (
        <button
          type="button"
          onClick={() => onUseName(data.patients[0]?.full_name ?? last!.customer_name)}
          className="font-bold text-primary hover:underline"
        >
          Use the name “{data.patients[0]?.full_name ?? last!.customer_name}”
        </button>
      )}
    </div>
  );
}

/** "0:42" from 42 seconds; "1:05:09" past the hour. */
function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/**
 * Start when the call starts, Stop when it ends: the duration fills itself in,
 * to the nearest half minute (at least half a minute).
 */
function CallTimer({ onStop }: { onStop: (minutes: number) => void }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (startedAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const elapsed = startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));

  return startedAt === null ? (
    <button
      type="button"
      onClick={() => {
        const t = Date.now();
        setStartedAt(t);
        setNow(t);
      }}
      className={`${btnGhost} shrink-0 px-3`}
      title="Start timing the call"
    >
      ▶ Start
    </button>
  ) : (
    <button
      type="button"
      onClick={() => {
        const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        onStop(Math.max(0.5, Math.round((seconds / 60) * 2) / 2));
        setStartedAt(null);
      }}
      className={`${btnPrimary} shrink-0 px-3 tabular`}
      title="Stop and fill in the duration"
      aria-live="polite"
    >
      ■ {clock(elapsed)}
    </button>
  );
}

/**
 * The agent's "Log a call" form. Saving is final — an agent cannot edit or
 * delete a call afterwards — so Save first shows everything that was typed and
 * asks them to confirm it is right.
 */
export default function CallForm({
  prefill,
  options,
}: {
  prefill?: CallPrefill;
  options: CallOptions;
}) {
  const [state, action] = useActionState<LogCallState, FormData>(logCall, {});
  const [pending, startTransition] = useTransition();
  // The form's values while the agent reads them back, tagged with the last
  // save at the time: once a newer save lands, the read-back is over.
  const [draft, setPending] = useState<{ data: FormData; since?: number } | null>(null);
  const review = draft && draft.since === state.savedAt ? draft.data : null;
  const setReview = (data: FormData | null) =>
    setPending(data ? { data, since: state.savedAt } : null);

  function confirmSave() {
    if (!review) return;
    const data = review;
    startTransition(() => action(data));
  }

  return (
    <section className={`${card} ${cardPad}`}>
      <SectionHead
        title="Log a call"
        hint="Fill in the call, then check it before saving — a saved call cannot be edited or deleted."
      />

      {/* A new key after each save gives a blank form for the next call. */}
      <FormBody
        key={state.savedAt ?? 0}
        // A follow-up's details fill the first form only, not the one after it.
        prefill={state.savedAt ? undefined : prefill}
        hidden={Boolean(review)}
        onReview={setReview}
        state={state}
        options={options}
      />

      {review && (
        <div className="mt-5 rounded-control border border-warn/40 bg-warn/10 p-4 sm:p-5" role="alertdialog" aria-labelledby="confirm-title">
          <p id="confirm-title" className="text-sm font-extrabold text-warn">
            You can&rsquo;t edit or delete this call after saving. Are you sure the information is correct?
          </p>
          {review.get("_duplicate") && (
            <p className="mt-2 rounded-md bg-warn/15 px-3 py-2 text-sm font-bold text-warn">
              ⚠ {String(review.get("_duplicate"))} Is this a new call, not the same one again?
            </p>
          )}

          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {summary(options).map((f) => {
              const raw = String(review.get(f.name) ?? "").trim();
              const shown = f.options ? f.options.find((o) => o.value === raw)?.label ?? raw : raw;
              return (
                <div key={f.name} className={f.name === "notes" ? "sm:col-span-2" : ""}>
                  <dt className="text-xs font-bold text-muted">{f.label}</dt>
                  <dd className="whitespace-pre-line break-words font-semibold">{shown || "—"}</dd>
                </div>
              );
            })}
          </dl>

          {state.error && <p className="mt-4 text-sm font-semibold text-danger">{state.error}</p>}

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={confirmSave} disabled={pending} className={btnPrimary}>
              {pending ? "Saving…" : "Yes, save"}
            </button>
            <button type="button" onClick={() => setReview(null)} disabled={pending} className={btnGhost}>
              Go back and edit
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** How recent a call to the same number must be to ask "the same call twice?". */
const DUPLICATE_MINUTES = 10;

function FormBody({
  prefill,
  hidden,
  onReview,
  state,
  options,
}: {
  prefill?: CallPrefill;
  hidden: boolean;
  onReview: (data: FormData) => void;
  state: LogCallState;
  options: CallOptions;
}) {
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  // What is known about the number, looked up a beat after typing stops.
  // `at` is when the answer came back, to tell how long ago the last call was.
  const [found, setFound] = useState<{ phone: string; data: PhoneLookup | null; at: number } | null>(null);

  useEffect(() => {
    if (digits(phone) < 6) return;
    const t = setTimeout(async () => {
      const data = await lookupPhone(phone);
      setFound({ phone, data, at: Date.now() });
    }, 400);
    return () => clearTimeout(t);
  }, [phone]);

  // Only the answer for what is in the box now; nothing for a short number.
  const looked = digits(phone) >= 6 && found?.phone === phone;
  const lookup = looked ? found!.data : null;
  const lastAt = lookup?.last ? new Date(lookup.last.created_at).getTime() : null;
  const minutesAgo = lastAt === null ? null : Math.max(0, Math.round((found!.at - lastAt) / 60000));
  const duplicate =
    minutesAgo !== null && minutesAgo <= DUPLICATE_MINUTES
      ? `This number was logged ${minutesAgo === 0 ? "just now" : `${minutesAgo} min ago`}${
          lookup?.last?.agent ? ` by ${lookup.last.agent}` : ""
        }.`
      : null;
  const nameRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);

  return (
    <form
      id="log-call"
      autoComplete="off"
      onSubmit={(e) => {
        e.preventDefault();
        onReview(new FormData(e.currentTarget));
      }}
      className={hidden ? "hidden" : "mt-5"}
    >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="customer_name" className={label}>Customer name</label>
            <input
              ref={nameRef}
              id="customer_name"
              name="customer_name"
              required
              maxLength={120}
              defaultValue={prefill?.customer_name}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="phone" className={label}>Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              maxLength={40}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={field}
            />
            {/* Carried into the confirmation, which asks again. */}
            {duplicate && <input type="hidden" name="_duplicate" value={duplicate} />}
            <PhoneHistory
              looked={looked}
              data={lookup}
              duplicate={duplicate}
              options={options}
              onUseName={(n) => {
                if (nameRef.current) nameRef.current.value = n;
              }}
            />
          </div>
          <div>
            <label htmlFor="call_type" className={label}>Call type</label>
            <select id="call_type" name="call_type" className={field}>
              {CALL_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reason" className={label}>Reason</label>
            <select id="reason" name="reason" defaultValue={prefill?.reason} className={field}>
              {options.reasons.filter((o) => o.active).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="product" className={label}>Product / skin concern</label>
            <input id="product" name="product" maxLength={200} className={field} />
          </div>
          <div>
            <label htmlFor="outcome" className={label}>Outcome</label>
            <select id="outcome" name="outcome" className={field}>
              {options.outcomes.filter((o) => o.active).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="duration_min" className={label}>Duration (minutes)</label>
            <div className="mt-1.5 flex gap-2">
              <input
                ref={durationRef}
                id="duration_min"
                name="duration_min"
                type="number"
                min={0}
                max={1440}
                step={0.5}
                className={fieldBase}
              />
              <CallTimer
                onStop={(minutes) => {
                  if (durationRef.current) durationRef.current.value = String(minutes);
                }}
              />
            </div>
          </div>
          <div>
            <label htmlFor="follow_up_date" className={label}>Follow-up date</label>
            <input id="follow_up_date" name="follow_up_date" type="date" className={field} />
          </div>
          <div>
            <label htmlFor="recording_url" className={label}>Recording link</label>
            <input id="recording_url" name="recording_url" type="url" placeholder="https://" maxLength={500} className={field} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor="notes" className={label}>Notes</label>
            <textarea id="notes" name="notes" rows={3} maxLength={2000} className={`${field} resize-y`} />
          </div>
        </div>

        {state.error && <p className="mt-4 text-sm font-semibold text-danger">{state.error}</p>}
        {state.savedAt && !state.error && (
          <p className="mt-4 text-sm font-semibold text-ok">Call saved.</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="submit" className={btnPrimary}>Save call</button>
          <button type="reset" className={btnGhost}>Clear form</button>
        </div>
    </form>
  );
}
