"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import ImageInput from "@/components/image-input";
import { btnGhost, btnPrimary, btnQuiet, card, cardPad, field, fieldLabel, SectionHead } from "@/components/ui";
import type { FieldDef, SectionDef } from "@/lib/website-sections";
import { deleteItem, moveItem, saveItem, toggleItem, type WebsiteState } from "./actions";

/** One row as the page hands it over: its columns, plus image URLs by field. */
export type ManagedRow = {
  id: string;
  is_active: boolean;
  values: Record<string, string | null>;
  images: Record<string, string | null>;
};

function Submit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Saving…" : editing ? "Save changes" : "Add"}
    </button>
  );
}

/** A JSON array the page serialised into `values`, or [] if it is missing or not one. */
function parseList<T>(json: string | null | undefined): T[] {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Question/answer pairs, added and removed in place; posted as <name>_q / <name>_a. */
function FaqInput({ f, initial }: { f: FieldDef; initial: string | null }) {
  const [pairs, setPairs] = useState(() => {
    const list = parseList<{ q?: string; a?: string }>(initial).map((p, i) => ({
      key: i,
      q: p.q ?? "",
      a: p.a ?? "",
    }));
    return list.length ? list : [{ key: 0, q: "", a: "" }];
  });
  const [next, setNext] = useState(pairs.length);

  return (
    <div className="sm:col-span-2">
      <span className={fieldLabel}>
        {f.label}
        <span className="font-medium text-muted"> (optional)</span>
      </span>
      <ol className="mt-1.5 space-y-3">
        {pairs.map((p, i) => (
          <li key={p.key} className="rounded-control border border-hairline p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-muted">Question {i + 1}</span>
              <button
                type="button"
                onClick={() => setPairs((ps) => ps.filter((x) => x.key !== p.key))}
                className={`${btnQuiet} hover:text-danger`}
              >
                Remove
              </button>
            </div>
            <input
              name={`${f.name}_q`}
              defaultValue={p.q}
              maxLength={f.max}
              placeholder="e.g. Is it painful?"
              aria-label={`Question ${i + 1}`}
              className={`${field} mt-1.5`}
            />
            <textarea
              name={`${f.name}_a`}
              defaultValue={p.a}
              maxLength={f.max}
              rows={3}
              placeholder="The answer"
              aria-label={`Answer ${i + 1}`}
              className={`${field} mt-2 resize-y leading-relaxed`}
            />
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => {
          setPairs((ps) => [...ps, { key: next, q: "", a: "" }]);
          setNext((n) => n + 1);
        }}
        className={`${btnGhost} mt-3 px-4 py-2`}
      >
        + Add a question
      </button>
      <p className="mt-1.5 text-xs text-muted">A question left blank is not saved.</p>
    </div>
  );
}

/** Tick-boxes for the other rows of this list; posts every ticked id under one name. */
function RelationsInput({
  f,
  initial,
  options,
}: {
  f: FieldDef;
  initial: string | null;
  options: { id: string; label: string }[];
}) {
  const picked = new Set(parseList<string>(initial));
  return (
    <fieldset className="sm:col-span-2">
      <legend className={fieldLabel}>
        {f.label}
        <span className="font-medium text-muted"> (optional)</span>
      </legend>
      {options.length === 0 ? (
        <p className="mt-1.5 text-sm text-muted">Add more treatments to pick from.</p>
      ) : (
        <div className="mt-1.5 grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={f.name} value={o.id} defaultChecked={picked.has(o.id)} />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      )}
      {f.hint && <p className="mt-1.5 text-xs text-muted">{f.hint}</p>}
    </fieldset>
  );
}

function firstLine(text: string | null | undefined, max = 90): string {
  const line = (text ?? "").split("\n").find((l) => l.trim()) ?? "";
  return line.length > max ? `${line.slice(0, max).trimEnd()}…` : line;
}

/**
 * One owner-managed list on the website: the form to add or edit an item,
 * then the items in order with ↑/↓, show/hide, edit and delete.
 */
export default function SectionManager({ def, rows }: { def: SectionDef; rows: ManagedRow[] }) {
  const [state, action] = useActionState<WebsiteState, FormData>(saveItem, {});
  // Edit mode lasts until the next successful save, which bumps savedAt.
  const [edit, setEdit] = useState<{ row: ManagedRow; since?: number } | null>(null);
  const editing = edit && edit.since === state.savedAt ? edit.row : null;
  const setEditing = (row: ManagedRow | null) => setEdit(row ? { row, since: state.savedAt } : null);

  const imageFields = def.fields.filter((f) => f.type === "image");

  return (
    <div className="space-y-6">
      <form
        action={action}
        key={`${editing?.id ?? "new"}-${state.savedAt ?? 0}`}
        className={`${card} ${cardPad}`}
      >
        <SectionHead
          title={editing ? `Edit ${def.noun}` : `Add a ${def.noun}`}
          hint={def.hint}
        />
        <input type="hidden" name="section" value={def.key} />
        {editing && <input type="hidden" name="id" value={editing.id} />}

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {def.fields.map((f) => {
            const value = editing?.values[f.name] ?? "";
            const wide = f.type === "textarea" || f.type === "url" || (f.type === "text" && imageFields.length === 0);
            const heading = f.group && (
              <h3
                key={`${f.name}-group`}
                className="border-t border-hairline pt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-muted first:border-t-0 first:pt-0 sm:col-span-2"
              >
                {f.group}
              </h3>
            );
            let input: React.ReactNode;
            if (f.type === "faq") {
              input = <FaqInput key={f.name} f={f} initial={editing?.values[f.name] ?? null} />;
            } else if (f.type === "relations") {
              input = (
                <RelationsInput
                  key={f.name}
                  f={f}
                  initial={editing?.values[f.name] ?? null}
                  options={rows
                    .filter((r) => r.id !== editing?.id)
                    .map((r) => ({ id: r.id, label: r.values[def.titleField] || "Untitled" }))}
                />
              );
            } else if (f.type === "image") {
              input = (
                <ImageInput
                  key={f.name}
                  name={f.name}
                  label={f.label}
                  required={f.required}
                  currentUrl={editing?.images[f.name] ?? null}
                  hint={f.hint}
                />
              );
            } else {
              input = (
                <div key={f.name} className={wide ? "sm:col-span-2" : ""}>
                  <label htmlFor={`${def.key}-${f.name}`} className={fieldLabel}>
                    {f.label}
                    {!f.required && <span className="font-medium text-muted"> (optional)</span>}
                  </label>
                  {f.type === "textarea" ? (
                    <textarea
                      id={`${def.key}-${f.name}`}
                      name={f.name}
                      required={f.required}
                      maxLength={f.max}
                      defaultValue={value}
                      placeholder={f.placeholder}
                      rows={f.max && f.max > 1000 ? 7 : 3}
                      className={`${field} mt-1.5 resize-y leading-relaxed`}
                    />
                  ) : (
                    <input
                      id={`${def.key}-${f.name}`}
                      name={f.name}
                      type={f.type === "url" ? "url" : "text"}
                      required={f.required}
                      maxLength={f.max}
                      defaultValue={value}
                      placeholder={f.placeholder}
                      list={f.suggestions ? `${def.key}-${f.name}-list` : undefined}
                      className={`${field} mt-1.5`}
                    />
                  )}
                  {f.suggestions && (
                    <datalist id={`${def.key}-${f.name}-list`}>
                      {f.suggestions.map((o) => (
                        <option key={o} value={o} />
                      ))}
                    </datalist>
                  )}
                  {f.hint && <p className="mt-1.5 text-xs text-muted">{f.hint}</p>}
                </div>
              );
            }
            return heading ? [heading, input] : input;
          })}
        </div>

        {state.error && <p className="mt-4 text-sm font-semibold text-danger">{state.error}</p>}
        {state.notice && !editing && (
          <p className="mt-4 text-sm font-semibold text-ok">{state.notice}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Submit editing={!!editing} />
          {editing && (
            <button type="button" onClick={() => setEditing(null)} className={`${btnGhost} px-4 py-2.5`}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className={`${card} ${cardPad}`}>
        <SectionHead
          title={`${def.title} · ${rows.length}`}
          hint="The order here is the order on the website. Hidden items stay saved but are not shown."
        />

        {rows.length === 0 ? (
          <p className="mt-5 text-sm text-muted">
            Nothing yet. Until something is added, this part of the website stays hidden.
          </p>
        ) : (
          <ol className="mt-5 divide-y divide-hairline">
            {rows.map((r, i) => {
              const title = r.values[def.titleField] || "Untitled";
              const sub = def.subField ? firstLine(r.values[def.subField]) : "";
              // Keyed by field, not URL: a placeholder result uses one picture for both sides.
              const thumbs = imageFields.flatMap((f) => {
                const src = r.images[f.name];
                return src ? [{ field: f.name, label: f.label, src }] : [];
              });
              return (
                <li
                  key={r.id}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5 ${
                    r.is_active ? "" : "opacity-55"
                  } ${editing?.id === r.id ? "rounded-control bg-primary-soft/50 px-2 -mx-2" : ""}`}
                >
                  <span className="w-6 text-right text-sm font-bold text-muted tabular">{i + 1}.</span>

                  {thumbs.length > 0 && (
                    <span className="flex gap-1">
                      {thumbs.map((t) => (
                        // eslint-disable-next-line @next/next/no-img-element -- a list thumbnail
                        <img
                          key={t.field}
                          src={t.src}
                          alt=""
                          title={t.label}
                          className="h-11 w-11 rounded-md border border-hairline object-cover"
                        />
                      ))}
                    </span>
                  )}

                  <span className="min-w-0 flex-1">
                    {def.titleField === "url" ? (
                      <a
                        href={title}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-bold text-primary hover:underline"
                      >
                        {title}
                      </a>
                    ) : (
                      <span className="block truncate text-sm font-bold">{title}</span>
                    )}
                    {sub &&
                      (def.subField === "url" ? (
                        <a
                          href={r.values.url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-xs text-muted hover:text-primary hover:underline"
                        >
                          {sub}
                        </a>
                      ) : (
                        <span className="block truncate text-xs text-muted">{sub}</span>
                      ))}
                  </span>

                  <span className="flex items-center gap-1">
                    {(["up", "down"] as const).map((dir) => (
                      <form key={dir} action={moveItem}>
                        <input type="hidden" name="section" value={def.key} />
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="dir" value={dir} />
                        <button
                          type="submit"
                          disabled={dir === "up" ? i === 0 : i === rows.length - 1}
                          aria-label={dir === "up" ? "Move up" : "Move down"}
                          title={dir === "up" ? "Move up" : "Move down"}
                          className="grid h-7 w-7 place-items-center rounded-full text-muted transition-ui hover:bg-subtle hover:text-fg disabled:opacity-30"
                        >
                          {dir === "up" ? "↑" : "↓"}
                        </button>
                      </form>
                    ))}

                    <form action={toggleItem}>
                      <input type="hidden" name="section" value={def.key} />
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="active" value={r.is_active ? "0" : "1"} />
                      <button
                        type="submit"
                        className={`ml-1 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold transition-ui ${
                          r.is_active
                            ? "border-ok/40 bg-ok/10 text-ok hover:border-ok"
                            : "border-hairline bg-subtle text-muted hover:text-fg"
                        }`}
                        title={r.is_active ? "Shown on the website. Click to hide." : "Hidden. Click to show."}
                      >
                        {r.is_active ? "Shown" : "Hidden"}
                      </button>
                    </form>

                    <button
                      type="button"
                      onClick={() => {
                        setEditing(r);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`${btnQuiet} ml-2`}
                    >
                      Edit
                    </button>

                    <form
                      action={deleteItem}
                      onSubmit={(e) => {
                        if (!confirm(`Delete this ${def.noun}? This cannot be undone.`)) e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="section" value={def.key} />
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className={`${btnQuiet} hover:text-danger`}>
                        Delete
                      </button>
                    </form>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {def.note && <p className="mt-4 text-xs text-muted">{def.note}</p>}
      </section>
    </div>
  );
}
