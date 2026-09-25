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
        hint="Blood sugar can be left blank if it was not measured."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="height_cm" className={label}>Height (cm)</label>
          <input id="height_cm" name="height_cm" type="number" step="0.1" min={30} max={250} required placeholder="165" className={`${field} font-mono`} />
        </div>
        <div>
          <label htmlFor="weight_kg" className={label}>Weight (kg)</label>
          <input id="weight_kg" name="weight_kg" type="number" step="0.1" min={1} max={400} required placeholder="60" className={`${field} font-mono`} />
        </div>
        <div>
          <label htmlFor="blood_pressure" className={label}>Blood pressure</label>
          <input id="blood_pressure" name="blood_pressure" required pattern="\d{2,3}/\d{2,3}" title="Systolic/diastolic, e.g. 120/80" placeholder="120/80" className={`${field} font-mono`} />
        </div>
        <div>
          <label htmlFor="blood_sugar" className={label}>
            Blood sugar (mg/dL) <span className="text-muted">(optional)</span>
          </label>
          <input id="blood_sugar" name="blood_sugar" type="number" step="0.1" min={20} max={800} placeholder="95" className={`${field} font-mono`} />
        </div>
      </div>

      {state.error && <p className="mt-4 text-sm font-semibold text-danger">{state.error}</p>}

      <div className="mt-6">
        <SubmitButton />
      </div>
    </form>
  );
}
