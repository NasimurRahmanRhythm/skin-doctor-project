"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import ImageInput from "@/components/image-input";
import {
  btnPrimary,
  card,
  cardPad,
  field as fieldBase,
  fieldLabel as label,
  SectionHead,
} from "@/components/ui";
import { addStaff, type StaffState } from "../actions";

const field = `${fieldBase} mt-1.5`;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Creating…" : "Add to team"}
    </button>
  );
}

export default function AddStaffForm({ designations }: { designations: string[] }) {
  const [state, action] = useActionState<StaffState, FormData>(addStaff, {});
  const [role, setRole] = useState("doctor");

  return (
    <form
      action={action}
      key={state.notice ? "done" : "editing"}
      className={`${card} ${cardPad}`}
    >
      <SectionHead
        title="Add someone"
        hint="They sign in with a one-time code sent to this address — there is no password to share, so use an inbox they actually read."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="full_name" className={label}>
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            placeholder="Dr. Nabila Karim"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="email" className={label}>
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="nabila@clinic.com"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="role" className={label}>
            Role
          </label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={field}
          >
            <option value="doctor">Doctor</option>
            <option value="nurse">Nurse</option>
            <option value="receptionist">Receptionist</option>
            <option value="owner">Owner</option>
          </select>
        </div>
        {role === "doctor" && (
          <div>
            <label htmlFor="specialty" className={label}>
              Designation
            </label>
            {designations.length > 0 ? (
              <select id="specialty" name="specialty" required defaultValue="" className={field}>
                <option value="" disabled>
                  Choose a designation
                </option>
                {designations.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1.5 rounded-control border border-dashed border-hairline px-3 py-2.5 text-sm text-muted">
                Add a designation first, in the Designations card above.
              </p>
            )}
          </div>
        )}
        <div className="sm:col-span-2">
          <ImageInput name="photo" label="Profile photo" round />
        </div>
      </div>

      {state.error && (
        <p className="mt-4 text-sm font-semibold text-danger">{state.error}</p>
      )}
      {state.notice && (
        <p className="mt-4 text-sm font-semibold text-ok">{state.notice}</p>
      )}

      <div className="mt-6">
        <Submit />
      </div>
    </form>
  );
}
