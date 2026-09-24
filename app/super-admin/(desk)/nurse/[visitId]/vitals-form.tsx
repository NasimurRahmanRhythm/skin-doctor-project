"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  btnPrimary,
  card,
  cardPad,
  field as fieldBase,
  fieldLabel as label,
  SectionHead,
} from "@/components/ui";
import { saveVitals, type VitalsState } from "../actions";

const field = `${fieldBase} mt-1.5`;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Saving…" : "Save vitals & send to doctor"}
    </button>
  );
}

export default function VitalsForm({ visitId }: { visitId: string }) {
  const [state, action] = useActionState<VitalsState, FormData>(saveVitals, {});

  return (
    <form action={action} className={`${card} ${cardPad}`}>
      <input type="hidden" name="visit_id" value={visitId} />
      <SectionHead
        title="Vitals"
        hint="Leave anything you did not measure blank."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="height_cm" className={label}>Height (cm)</label>
          <input id="height_cm" name="height_cm" type="number" step="0.1" placeholder="165" className={`${field} font-mono`} />
        </div>
        <div>
          <label htmlFor="weight_kg" className={label}>Weight (kg)</label>
          <input id="weight_kg" name="weight_kg" type="number" step="0.1" placeholder="60" className={`${field} font-mono`} />
        </div>
        <div>
          <label htmlFor="blood_pressure" className={label}>Blood pressure</label>
          <input id="blood_pressure" name="blood_pressure" placeholder="120/80" className={`${field} font-mono`} />
        </div>
        <div>
          <label htmlFor="blood_sugar" className={label}>Blood sugar (mg/dL)</label>
          <input id="blood_sugar" name="blood_sugar" type="number" step="0.1" placeholder="95" className={`${field} font-mono`} />
        </div>
        <div>
          <label htmlFor="temperature" className={label}>Temperature (°C)</label>
          <input id="temperature" name="temperature" type="number" step="0.1" placeholder="36.8" className={`${field} font-mono`} />
        </div>
        <div>
          <label htmlFor="pulse" className={label}>Pulse (bpm)</label>
          <input id="pulse" name="pulse" type="number" placeholder="72" className={`${field} font-mono`} />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="nurse_notes" className={label}>
          Notes for the doctor <span className="text-muted">(optional)</span>
        </label>
        <textarea id="nurse_notes" name="nurse_notes" rows={3} className={`${field} resize-y`} />
      </div>

      {state.error && <p className="mt-4 text-sm font-semibold text-danger">{state.error}</p>}

      <div className="mt-6">
        <SubmitButton />
      </div>
    </form>
  );
}
