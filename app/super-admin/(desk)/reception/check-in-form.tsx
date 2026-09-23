"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  checkIn,
  lookupPatient,
  type CheckInState,
  type PatientMatch,
} from "./actions";

type Doctor = { id: string; full_name: string; specialty: string | null };

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
      {pending ? "Saving…" : "Check in & send to nurse"}
    </button>
  );
}

export default function CheckInForm({ doctors }: { doctors: Doctor[] }) {
  const [state, action] = useActionState<CheckInState, FormData>(checkIn, {});
  const [match, setMatch] = useState<PatientMatch>(null);
  const [, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  function onPhoneBlur(e: React.FocusEvent<HTMLInputElement>) {
    const phone = e.target.value;
    startTransition(async () => setMatch(await lookupPatient(phone)));
  }

  if (state.success) {
    const s = state.success;
    return (
      <div className="border border-line bg-paper px-8 py-10 text-center rounded-card">
        <p className="font-serif italic text-rose">Checked in</p>
        <h2 className="mt-1 font-serif text-2xl">Sent to the nurse</h2>

        <div className="my-6 inline-block border border-dashed border-line bg-ivory-dim px-8 py-4 font-serif text-3xl tracking-wide text-sage-deep rounded-card">
          {s.visitCode}
        </div>

        <dl className="mx-auto max-w-sm space-y-1 text-sm text-ink-soft">
          <div>
            {s.patientName} · {s.patientCode}{" "}
            <span className="text-ink">
              ({s.returning ? "returning" : "new"} patient)
            </span>
          </div>
          <div>
            Doctor: <span className="text-ink">{s.doctorName}</span>{" "}
            {s.wasRequested ? "(requested)" : "(first available)"}
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setMatch(null);
              setFormKey((k) => k + 1);
              window.location.reload();
            }}
            className="border border-sage bg-sage px-6 py-3 text-sm font-medium text-paper hover:bg-sage-deep rounded-card"
          >
            Check in another patient
          </button>
          <Link
            href={`/super-admin/print/${s.visitId}?scope=reception`}
            target="_blank"
            className="border border-sage px-6 py-3 text-sm font-medium text-sage hover:bg-ivory-dim rounded-card"
          >
            Print slip
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      key={formKey}
      action={action}
      className="border border-line bg-paper px-8 py-8 rounded-card"
    >
      <h2 className="font-serif text-xl">Patient check-in</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Goes to the nurse for vitals, then on to the doctor.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="phone" className={label}>
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            onBlur={onPhoneBlur}
            placeholder="01711 744427"
            className={field}
          />
          {match && (
            <p className="mt-2 text-xs text-sage">
              Returning patient — {match.full_name} · {match.patient_code} ·{" "}
              {match.visitCount} previous{" "}
              {match.visitCount === 1 ? "visit" : "visits"}. Their history stays
              under the same code.
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="full_name" className={label}>
            Patient name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            defaultValue={match?.full_name ?? ""}
            placeholder="Farhana Islam"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="age" className={label}>
            Age
          </label>
          <input
            id="age"
            name="age"
            type="number"
            min={0}
            max={129}
            defaultValue={match?.age ?? ""}
            placeholder="34"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="gender" className={label}>
            Gender
          </label>
          <select id="gender" name="gender" defaultValue="" className={field}>
            <option value="">Not stated</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address" className={label}>
            Address <span className="text-ink-soft">(optional)</span>
          </label>
          <input id="address" name="address" className={field} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="chief_complaint" className={label}>
            Reason for visit <span className="text-ink-soft">(optional)</span>
          </label>
          <textarea
            id="chief_complaint"
            name="chief_complaint"
            rows={3}
            placeholder="Itchy rash on both forearms for two weeks"
            className={`${field} resize-y`}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="preferred_doctor" className={label}>
            Which doctor?
          </label>
          <select
            id="preferred_doctor"
            name="preferred_doctor"
            defaultValue="any"
            className={field}
          >
            <option value="any">No preference — first available</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
                {d.specialty ? ` — ${d.specialty}` : ""}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-ink-soft">
            No preference goes to whichever doctor has the lightest queue today.
          </p>
        </div>
      </div>

      {state.error && <p className="mt-5 text-sm text-err">{state.error}</p>}

      <div className="mt-7">
        <SubmitButton />
      </div>
    </form>
  );
}
