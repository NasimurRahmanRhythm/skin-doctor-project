"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addEntry, saveConsultation, type ConsultState, type EntryState } from "../actions";

const field =
  "mt-2 w-full border border-line bg-ivory px-4 py-3 text-sm text-ink outline-none focus:outline-2 focus:outline-sage rounded-card";
const label = "block text-xs text-ink-soft";

function Submit({ label: text, busy, variant = "primary" }: { label: string; busy: string; variant?: "primary" | "ghost" }) {
  const { pending } = useFormStatus();
  const cls =
    variant === "primary"
      ? "border border-sage bg-sage text-paper hover:bg-sage-deep"
      : "border border-sage text-sage hover:bg-ivory-dim";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${cls} px-6 py-3 text-sm font-medium transition-colors disabled:opacity-50 rounded-card`}
    >
      {pending ? busy : text}
    </button>
  );
}

export function ConsultForm({
  visitId,
  initial,
  completed,
}: {
  visitId: string;
  initial: {
    diagnosis: string | null;
    prescription: string | null;
    advice: string | null;
    follow_up_date: string | null;
  };
  completed: boolean;
}) {
  const [state, action] = useActionState<ConsultState, FormData>(saveConsultation, {});

  return (
    <form action={action} className="border border-line bg-paper px-8 py-7 rounded-card">
      <input type="hidden" name="visit_id" value={visitId} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg">Consultation</h2>
        {completed && (
          <span className="rounded-full border border-sage px-3 py-0.5 text-[11px] text-sage">
            Completed
          </span>
        )}
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <label htmlFor="diagnosis" className={label}>Diagnosis</label>
          <textarea
            id="diagnosis"
            name="diagnosis"
            rows={2}
            defaultValue={initial.diagnosis ?? ""}
            placeholder="Contact dermatitis, both forearms"
            className={`${field} resize-y`}
          />
        </div>
        <div>
          <label htmlFor="prescription" className={label}>Prescription</label>
          <textarea
            id="prescription"
            name="prescription"
            rows={5}
            defaultValue={initial.prescription ?? ""}
            placeholder={"Mometasone 0.1% cream — thin layer, twice daily, 10 days\nCetirizine 10mg — one at night, 7 days"}
            className={`${field} resize-y font-mono text-[13px]`}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="advice" className={label}>Advice</label>
            <textarea
              id="advice"
              name="advice"
              rows={3}
              defaultValue={initial.advice ?? ""}
              className={`${field} resize-y`}
            />
          </div>
          <div>
            <label htmlFor="follow_up_date" className={label}>Follow-up date</label>
            <input
              id="follow_up_date"
              name="follow_up_date"
              type="date"
              defaultValue={initial.follow_up_date ?? ""}
              className={field}
            />
          </div>
        </div>
      </div>

      {state.error && <p className="mt-5 text-sm text-err">{state.error}</p>}
      {state.saved && !state.error && (
        <p className="mt-5 text-sm text-sage">Saved.</p>
      )}

      <div className="mt-7 flex flex-wrap gap-3">
        <Submit label="Save" busy="Saving…" variant="ghost" />
        {!completed && (
          <button
            type="submit"
            name="complete"
            value="1"
            className="border border-sage bg-sage px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-sage-deep rounded-card"
          >
            Save &amp; complete visit
          </button>
        )}
      </div>
    </form>
  );
}

export function EntryForm({ visitId }: { visitId: string }) {
  const [state, action] = useActionState<EntryState, FormData>(addEntry, {});

  return (
    <form
      action={action}
      className="border border-line bg-ivory-dim px-8 py-7 rounded-card"
      key={state.saved ? "saved" : "editing"}
    >
      <input type="hidden" name="visit_id" value={visitId} />
      <h2 className="font-serif text-lg">Add to the record</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Lab reports, photos, or a note. Files stay private — they are only ever
        served through a short-lived link.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className={label}>Type</label>
          <select id="type" name="type" defaultValue="report" className={field}>
            <option value="report">Report</option>
            <option value="prescription">Prescription</option>
            <option value="note">Note</option>
            <option value="file">Other file</option>
          </select>
        </div>
        <div>
          <label htmlFor="title" className={label}>Title</label>
          <input id="title" name="title" required placeholder="CBC — 24 Sept" className={field} />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="body" className={label}>Notes</label>
        <textarea id="body" name="body" rows={3} className={`${field} resize-y`} />
      </div>

      <div className="mt-5">
        <label htmlFor="file" className={label}>
          Attach a file <span className="text-ink-soft">(optional, max 8 MB)</span>
        </label>
        <input id="file" name="file" type="file" className={`${field} bg-paper`} />
      </div>

      {state.error && <p className="mt-5 text-sm text-err">{state.error}</p>}
      {state.saved && !state.error && <p className="mt-5 text-sm text-sage">Added.</p>}

      <div className="mt-6">
        <Submit label="Add to record" busy="Saving…" />
      </div>
    </form>
  );
}
