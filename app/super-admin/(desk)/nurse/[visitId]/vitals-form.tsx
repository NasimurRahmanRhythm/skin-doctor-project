"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveVitals, type VitalsState } from "../actions";

const field =
  "mt-2 w-full border border-line bg-ivory px-4 py-3 text-sm text-ink outline-none focus:outline-2 focus:outline-sage rounded-card";
const label = "block text-xs text-ink-soft";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-sage bg-sage px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-sage-deep disabled:opacity-50 rounded-card"
    >
      {pending ? "Saving…" : "Save vitals & send to doctor"}
    </button>
  );
}

export default function VitalsForm({ visitId }: { visitId: string }) {
  const [state, action] = useActionState<VitalsState, FormData>(saveVitals, {});

  return (
    <form action={action} className="border border-line bg-paper px-8 py-7 rounded-card">
      <input type="hidden" name="visit_id" value={visitId} />
      <h2 className="font-serif text-lg">Vitals</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Leave anything you did not measure blank.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="height_cm" className={label}>Height (cm)</label>
          <input id="height_cm" name="height_cm" type="number" step="0.1" placeholder="165" className={field} />
        </div>
        <div>
          <label htmlFor="weight_kg" className={label}>Weight (kg)</label>
          <input id="weight_kg" name="weight_kg" type="number" step="0.1" placeholder="60" className={field} />
        </div>
        <div>
          <label htmlFor="blood_pressure" className={label}>Blood pressure</label>
          <input id="blood_pressure" name="blood_pressure" placeholder="120/80" className={field} />
        </div>
        <div>
          <label htmlFor="blood_sugar" className={label}>Blood sugar (mg/dL)</label>
          <input id="blood_sugar" name="blood_sugar" type="number" step="0.1" placeholder="95" className={field} />
        </div>
        <div>
          <label htmlFor="temperature" className={label}>Temperature (°C)</label>
          <input id="temperature" name="temperature" type="number" step="0.1" placeholder="36.8" className={field} />
        </div>
        <div>
          <label htmlFor="pulse" className={label}>Pulse (bpm)</label>
          <input id="pulse" name="pulse" type="number" placeholder="72" className={field} />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="nurse_notes" className={label}>
          Notes for the doctor <span className="text-ink-soft">(optional)</span>
        </label>
        <textarea id="nurse_notes" name="nurse_notes" rows={3} className={`${field} resize-y`} />
      </div>

      {state.error && <p className="mt-5 text-sm text-err">{state.error}</p>}

      <div className="mt-7">
        <SubmitButton />
      </div>
    </form>
  );
}
