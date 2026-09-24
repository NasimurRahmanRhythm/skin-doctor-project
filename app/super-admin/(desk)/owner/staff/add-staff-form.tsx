"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { addStaff, type StaffState } from "../actions";

const field =
  "mt-2 w-full border border-line bg-ivory px-4 py-3 text-sm text-ink outline-none focus:outline-2 focus:outline-sage rounded-card";
const label = "block text-xs text-ink-soft";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-sage bg-sage px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-sage-deep disabled:opacity-50 rounded-card"
    >
      {pending ? "Creating…" : "Add to team"}
    </button>
  );
}

export default function AddStaffForm() {
  const [state, action] = useActionState<StaffState, FormData>(addStaff, {});
  const [role, setRole] = useState("doctor");

  return (
    <form
      action={action}
      key={state.notice ? "done" : "editing"}
      className="border border-line bg-paper px-8 py-7 rounded-card"
    >
      <h2 className="font-serif text-lg">Add someone</h2>
      <p className="mt-1 text-sm text-ink-soft">
        They sign in with a one-time code sent to this address — there is no
        password to share, so use an inbox they actually read.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="full_name" className={label}>Full name</label>
          <input id="full_name" name="full_name" required placeholder="Dr. Nabila Karim" className={field} />
        </div>
        <div>
          <label htmlFor="email" className={label}>Work email</label>
          <input id="email" name="email" type="email" required placeholder="nabila@clinic.com" className={field} />
        </div>
        <div>
          <label htmlFor="role" className={label}>Role</label>
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
            <label htmlFor="specialty" className={label}>Specialty</label>
            <input id="specialty" name="specialty" placeholder="Dermatologist" className={field} />
          </div>
        )}
      </div>

      {state.error && <p className="mt-5 text-sm text-err">{state.error}</p>}
      {state.notice && <p className="mt-5 text-sm text-sage">{state.notice}</p>}

      <div className="mt-7">
        <Submit />
      </div>
    </form>
  );
}
