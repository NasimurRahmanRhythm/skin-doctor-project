"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { btnGhost, card, cardPad, field, SectionHead } from "@/components/ui";
import { addDesignation, removeDesignation, type StaffState } from "../actions";

function Add() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${btnGhost} shrink-0 px-4`}>
      {pending ? "Adding…" : "Add"}
    </button>
  );
}

/** The designations a doctor can be given, e.g. "Consultant Dermatologist". */
export default function DesignationsCard({
  designations,
}: {
  designations: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<StaffState, FormData>(addDesignation, {});

  return (
    <section className={`${card} ${cardPad}`}>
      <SectionHead
        title="Designations"
        hint="What a doctor can be called, shown under their name on the prescription and the website. Removing one does not change doctors who already have it."
      />

      {designations.length > 0 ? (
        <ul className="mt-5 flex flex-wrap gap-2">
          {designations.map((d) => (
            <li
              key={d.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-subtle py-1 pl-3 pr-1 text-sm font-semibold"
            >
              {d.name}
              <form
                action={removeDesignation}
                onSubmit={(e) => {
                  if (!confirm(`Remove "${d.name}" from the list?`)) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={d.id} />
                <button
                  type="submit"
                  aria-label={`Remove ${d.name}`}
                  title="Remove"
                  className="grid h-6 w-6 place-items-center rounded-full text-muted transition-ui hover:bg-danger/10 hover:text-danger"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-muted">
          No designations yet. Add one before adding a doctor.
        </p>
      )}

      <form action={action} key={state.notice ?? "editing"} className="mt-5 flex gap-2">
        <input
          name="name"
          required
          maxLength={100}
          placeholder="e.g. Consultant Dermatologist"
          aria-label="New designation"
          className={field}
        />
        <Add />
      </form>
      {state.error && <p className="mt-3 text-sm font-semibold text-danger">{state.error}</p>}
      {state.notice && <p className="mt-3 text-sm font-semibold text-ok">{state.notice}</p>}
    </section>
  );
}
