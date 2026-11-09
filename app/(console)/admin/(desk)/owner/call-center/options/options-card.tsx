"use client";

import { useActionState } from "react";
import { btnPrimary, card, cardPad, field, SectionHead } from "@/components/ui";
import {
  addOption,
  deleteOption,
  moveOption,
  renameOption,
  toggleOption,
  type OptionState,
} from "./actions";

export type OptionRow = {
  id: string;
  value: string;
  label: string;
  is_active: boolean;
  built_in: boolean;
};

/** Delete, with the database's reason shown when it says no. */
function DeleteButton({ id, label }: { id: string; label: string }) {
  const [state, action] = useActionState<OptionState, FormData>(deleteOption, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Delete "${label}"? Only a choice no call has used can be deleted.`)) e.preventDefault();
      }}
      className="contents"
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-[11px] font-bold text-muted hover:text-danger">
        Delete
      </button>
      {state.error && <span className="basis-full text-xs font-semibold text-danger">{state.error}</span>}
    </form>
  );
}

/**
 * One of the call form's dropdowns: its choices in order, each renamable,
 * movable and switchable on or off, and a box to add another.
 */
export default function OptionsCard({
  kind,
  title,
  hint,
  rows,
}: {
  kind: "reason" | "outcome";
  title: string;
  hint: string;
  rows: OptionRow[];
}) {
  const [added, add] = useActionState<OptionState, FormData>(addOption, {});

  return (
    <section className={`${card} ${cardPad}`}>
      <SectionHead title={title} hint={hint} />

      <ol className="mt-5 divide-y divide-hairline rounded-control border border-hairline">
        {rows.map((r, i) => (
          <li key={r.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 ${r.is_active ? "" : "bg-subtle/60"}`}>
            <span className="w-5 text-right text-xs font-bold tabular text-muted">{i + 1}.</span>
            <form action={renameOption} className="flex min-w-0 flex-1 items-center gap-1.5">
              <input type="hidden" name="id" value={r.id} />
              <input
                name="label"
                defaultValue={r.label}
                maxLength={60}
                aria-label={`Name of ${r.label}`}
                className={`min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold transition-ui hover:border-hairline focus:border-primary focus:bg-surface focus:outline-none ${r.is_active ? "" : "text-muted line-through"}`}
              />
              <button type="submit" className="text-[11px] font-bold text-primary hover:underline">
                Save
              </button>
            </form>
            {r.built_in && (
              <span
                title="Counted by other features (sales, complaints, follow-ups). It can be renamed or turned off, not deleted."
                className="rounded-full border border-hairline px-2 py-0.5 text-[10px] font-bold text-muted"
              >
                Built-in
              </span>
            )}
            <span className="flex items-center gap-0.5">
              {(["up", "down"] as const).map((dir) => (
                <form key={dir} action={moveOption}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="kind" value={kind} />
                  <input type="hidden" name="dir" value={dir} />
                  <button
                    type="submit"
                    disabled={dir === "up" ? i === 0 : i === rows.length - 1}
                    aria-label={`Move ${r.label} ${dir}`}
                    className="grid h-7 w-7 place-items-center rounded-full text-muted transition-ui hover:bg-subtle hover:text-fg disabled:opacity-30"
                  >
                    {dir === "up" ? "↑" : "↓"}
                  </button>
                </form>
              ))}
            </span>
            <form action={toggleOption}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="active" value={r.is_active ? "0" : "1"} />
              <button
                type="submit"
                title={r.is_active ? "Offered in the call form. Click to turn off." : "Not offered. Click to turn on."}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold transition-ui ${
                  r.is_active
                    ? "border-ok/40 bg-ok/10 text-ok hover:border-ok"
                    : "border-hairline bg-subtle text-muted hover:text-fg"
                }`}
              >
                {r.is_active ? "On" : "Off"}
              </button>
            </form>
            {!r.built_in && <DeleteButton id={r.id} label={r.label} />}
          </li>
        ))}
      </ol>

      <form action={add} className="mt-4 flex gap-2">
        <input type="hidden" name="kind" value={kind} />
        <input
          name="label"
          required
          maxLength={60}
          placeholder={kind === "reason" ? "e.g. Price inquiry" : "e.g. Appointment booked"}
          aria-label={`New ${kind}`}
          className={field}
        />
        <button type="submit" className={`${btnPrimary} shrink-0`}>
          Add
        </button>
      </form>
      {added.error && <p className="mt-2 text-sm font-semibold text-danger">{added.error}</p>}
      {added.notice && <p className="mt-2 text-sm font-semibold text-ok">{added.notice}</p>}
    </section>
  );
}
