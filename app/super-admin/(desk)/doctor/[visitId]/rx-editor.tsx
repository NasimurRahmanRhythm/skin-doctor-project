"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { btnGhost, btnPrimary } from "@/components/ui";
import {
  Leader,
  PadSection,
  PadSheet,
  RxMark,
  type PadPeople,
} from "@/components/rx-pad";
import {
  emptyMedicine,
  type Duration,
  type Investigation,
  type Medicine,
  type PadData,
} from "@/lib/prescription";
import { savePad } from "../actions";

// ------------------------------------------------------------ primitives --

/** Text that looks printed until you click it. */
const inlineInput =
  "w-full min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 -mx-1.5 text-fg " +
  "transition-ui hover:border-hairline focus:border-primary focus:bg-surface focus:shadow-[0_0_0_3px_var(--ring)] focus:outline-none";

/** The "type here and press Enter" box at the foot of each section. */
const addInput =
  "w-full min-w-0 rounded-control border border-dashed border-hairline bg-transparent px-3 py-2 text-[13px] text-fg " +
  "placeholder:text-muted/70 transition-ui hover:border-primary/50 " +
  "focus:border-solid focus:border-primary focus:bg-surface focus:shadow-[0_0_0_3px_var(--ring)] focus:outline-none";

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted/60 transition-ui hover:bg-danger/10 hover:text-danger focus-visible:text-danger"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/** The + beside a heading: jumps to that section's add box. */
function PlusButton({ label, target }: { label: string; target: RefObject<HTMLInputElement | null> }) {
  return (
    <button
      type="button"
      onClick={() => target.current?.focus()}
      aria-label={label}
      title={label}
      className="grid h-6 w-6 place-items-center rounded-full text-primary transition-ui hover:bg-primary-soft"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/**
 * An editable line that wraps like printed text instead of scrolling
 * sideways: a textarea sized to its content, where Enter never makes a
 * newline. (field-sizing is Chromium-only; elsewhere it is one row that
 * scrolls, which still works.)
 */
function InlineText({
  value,
  onChange,
  onEnterKey,
  onBlur,
  label,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onEnterKey?: () => void;
  onBlur?: (v: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <textarea
      rows={1}
      value={value}
      aria-label={label}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onEnterKey?.();
        }
      }}
      onBlur={(e) => onBlur?.(e.target.value)}
      className={`${inlineInput} resize-none overflow-hidden leading-snug [field-sizing:content] ${className}`}
    />
  );
}

function onEnter(e: KeyboardEvent<HTMLInputElement>, run: () => void) {
  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
    e.preventDefault();
    run();
  }
}

// ---------------------------------------------------------- simple lists --

/**
 * Chief complaints, examinations and advice: a list of lines. Type and press
 * Enter to add; every line stays editable in place; × removes it. Clearing a
 * line and leaving it removes it too, so there is no empty bullet to print.
 */
function LineList({
  items,
  onChange,
  placeholder,
  numbered = false,
  addRef,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  numbered?: boolean;
  addRef: RefObject<HTMLInputElement | null>;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, text]);
    setDraft("");
  }

  return (
    <div>
      {items.length > 0 && (
        <ul className="mb-2 space-y-0.5">
          {items.map((item, i) => (
            <li key={i} className="group flex items-start gap-1.5 text-[13.5px]">
              <span className="w-4 shrink-0 pt-1 text-center text-xs font-semibold text-muted">
                {numbered ? `${i + 1}.` : <span className="text-primary">•</span>}
              </span>
              <InlineText
                value={item}
                label={`Line ${i + 1}`}
                onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))}
                onBlur={(v) => {
                  if (!v.trim()) onChange(items.filter((_, j) => j !== i));
                }}
                onEnterKey={() => addRef.current?.focus()}
              />
              <RemoveButton
                label={`Remove "${item}"`}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ul>
      )}
      <input
        ref={addRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => onEnter(e, add)}
        onBlur={add}
        placeholder={placeholder}
        className={addInput}
      />
    </div>
  );
}

// --------------------------------------------------------- investigations --

/** Test name, then its result. Enter on the name moves to the result. */
function InvestigationList({
  items,
  onChange,
  addRef,
}: {
  items: Investigation[];
  onChange: (next: Investigation[]) => void;
  addRef: RefObject<HTMLInputElement | null>;
}) {
  const [name, setName] = useState("");
  const [result, setResult] = useState("");
  const resultRef = useRef<HTMLInputElement>(null);

  function add() {
    const n = name.trim();
    if (!n) return;
    onChange([...items, { name: n, result: result.trim() }]);
    setName("");
    setResult("");
    addRef.current?.focus();
  }

  const update = (i: number, patch: Partial<Investigation>) =>
    onChange(items.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  return (
    <div>
      {items.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {items.map((t, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="w-4 shrink-0 pt-0.5 text-center text-xs text-primary">•</span>
              <div className="min-w-0 flex-1">
                <InlineText
                  value={t.name}
                  label={`Investigation ${i + 1}`}
                  onChange={(v) => update(i, { name: v })}
                  onBlur={(v) => {
                    if (!v.trim()) onChange(items.filter((_, j) => j !== i));
                  }}
                  className="text-[13.5px]"
                />
                <input
                  value={t.result}
                  aria-label={`Result for ${t.name}`}
                  onChange={(e) => update(i, { result: e.target.value })}
                  placeholder="result"
                  className={`${inlineInput} text-xs italic text-muted placeholder:not-italic placeholder:text-muted/50`}
                />
              </div>
              <RemoveButton
                label={`Remove ${t.name}`}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-2">
        <input
          ref={addRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) =>
            onEnter(e, () => {
              if (name.trim()) resultRef.current?.focus();
            })
          }
          placeholder="Test, e.g. S. Creatinine"
          className={addInput}
        />
        <input
          ref={resultRef}
          value={result}
          onChange={(e) => setResult(e.target.value)}
          onKeyDown={(e) => onEnter(e, add)}
          placeholder="Result ↵"
          className={addInput}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Rx ----

const SLOT_LABELS = ["Morning", "Noon", "Night"] as const;

/** One of the three 0 + 0 + 0 boxes. Selects on focus so a digit replaces it. */
function DoseBox({
  value,
  label,
  onChange,
  inputRef,
}: {
  value: string;
  label: string;
  onChange: (v: string) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
}) {
  return (
    <input
      ref={inputRef}
      value={value}
      inputMode="decimal"
      maxLength={3}
      aria-label={label}
      title={label}
      onFocus={(e) => e.target.select()}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9½¼¾./]/g, ""))}
      onBlur={(e) => {
        if (!e.target.value.trim()) onChange("0");
      }}
      className="h-8 w-9 rounded-md border border-hairline bg-surface text-center text-sm font-bold tabular-nums text-fg transition-ui hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_var(--ring)] focus:outline-none"
    />
  );
}

function MealToggle({
  value,
  onChange,
}: {
  value: Medicine["meal"];
  onChange: (v: Medicine["meal"]) => void;
}) {
  const opt = (v: Medicine["meal"], label: string) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      aria-pressed={value === v}
      className={`rounded-[7px] px-2.5 py-1 text-xs font-semibold transition-ui ${
        value === v
          ? "bg-primary text-on-primary shadow-card"
          : "text-muted hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="When to take it" className="inline-flex shrink-0 rounded-control border border-hairline bg-subtle p-0.5">
      {opt("after", "After meal")}
      {opt("before", "Before meal")}
    </div>
  );
}

function DurationPicker({
  value,
  onChange,
}: {
  value: Duration;
  onChange: (v: Duration) => void;
}) {
  const count = value.unit === "continue" ? 7 : value.count;
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {value.unit !== "continue" && (
        <input
          type="number"
          min={1}
          max={365}
          value={count}
          aria-label="How many"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const n = Math.max(1, Math.min(365, Number(e.target.value) || 1));
            onChange({ unit: value.unit, count: n });
          }}
          className="h-8 w-14 rounded-md border border-hairline bg-surface text-center text-sm font-semibold text-fg transition-ui focus:border-primary focus:shadow-[0_0_0_3px_var(--ring)] focus:outline-none"
        />
      )}
      <select
        value={value.unit}
        aria-label="For how long"
        onChange={(e) => {
          const unit = e.target.value as Duration["unit"];
          onChange(unit === "continue" ? { unit } : { unit, count });
        }}
        className="h-8 rounded-md border border-hairline bg-surface px-2 text-xs font-semibold text-fg transition-ui focus:border-primary focus:shadow-[0_0_0_3px_var(--ring)] focus:outline-none"
      >
        <option value="continue">Continue</option>
        <option value="days">Days</option>
        <option value="weeks">Weeks</option>
        <option value="months">Months</option>
      </select>
    </div>
  );
}

function MedicineList({
  items,
  onChange,
  addRef,
}: {
  items: Medicine[];
  onChange: (next: Medicine[]) => void;
  addRef: RefObject<HTMLInputElement | null>;
}) {
  const [draft, setDraft] = useState("");
  // First dose box of each row, so a new medicine lands the cursor on its dose.
  const firstDose = useRef<(HTMLInputElement | null)[]>([]);

  function add() {
    const name = draft.trim();
    if (!name) return;
    const row = items.length;
    onChange([...items, emptyMedicine(name)]);
    setDraft("");
    // The row exists after the next paint.
    requestAnimationFrame(() => firstDose.current[row]?.focus());
  }

  const update = (i: number, patch: Partial<Medicine>) =>
    onChange(items.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      {items.length > 0 && (
        <ol className="mb-4 space-y-2">
          {items.map((m, i) => (
            <li
              key={i}
              className="group rounded-control border border-transparent px-2 py-2 -mx-2 transition-ui hover:border-hairline hover:bg-surface/80 focus-within:border-hairline focus-within:bg-surface/80"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-right text-[15px] font-semibold text-muted">
                  {i + 1}.
                </span>
                <InlineText
                  value={m.name}
                  label={`Medicine ${i + 1}`}
                  onChange={(v) => update(i, { name: v })}
                  onBlur={(v) => {
                    if (!v.trim()) onChange(items.filter((_, j) => j !== i));
                  }}
                  onEnterKey={() => firstDose.current[i]?.focus()}
                  className="text-[15px] font-semibold"
                />
                <div className="flex shrink-0 items-center opacity-0 transition-ui group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    title="Move up"
                    className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-subtle hover:text-fg disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    aria-label="Move down"
                    title="Move down"
                    className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-subtle hover:text-fg disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
                <RemoveButton
                  label={`Remove ${m.name}`}
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                />
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-y-2 pl-7">
                <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-muted">
                  {m.dose.map((d, k) => (
                    <span key={k} className="flex items-center gap-1">
                      {k > 0 && <span aria-hidden>+</span>}
                      <DoseBox
                        value={d}
                        label={`${SLOT_LABELS[k]} dose`}
                        inputRef={
                          k === 0 ? (el) => void (firstDose.current[i] = el) : undefined
                        }
                        onChange={(v) => {
                          const dose = [...m.dose] as Medicine["dose"];
                          dose[k] = v;
                          update(i, { dose });
                        }}
                      />
                    </span>
                  ))}
                </div>
                <Leader />
                <MealToggle value={m.meal} onChange={(meal) => update(i, { meal })} />
                <Leader />
                <DurationPicker
                  value={m.duration}
                  onChange={(duration) => update(i, { duration })}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex gap-2">
        <input
          ref={addRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => onEnter(e, add)}
          placeholder="Medicine, e.g. Tab. Cetirizine 10 mg — press Enter"
          className={`${addInput} text-sm`}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className={`${btnGhost} shrink-0 px-4 py-2`}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- the pad ----

type SaveState = "idle" | "saving" | "saved" | "error";

function SaveStatus({ state, error }: { state: SaveState; error: string | null }) {
  const text: Record<SaveState, ReactNode> = {
    idle: <span className="text-muted">All changes saved</span>,
    saving: <span className="text-muted">Saving…</span>,
    saved: <span className="text-ok">Saved</span>,
    error: <span className="text-danger">Not saved — {error}</span>,
  };
  return (
    <span aria-live="polite" className="text-xs font-semibold">
      {text[state]}
    </span>
  );
}

const AUTOSAVE_MS = 900;

export default function RxEditor({
  visitId,
  people,
  initial,
  completed,
  legacyPrescription,
}: {
  visitId: string;
  people: PadPeople;
  initial: PadData;
  completed: boolean;
  /** Free-text Rx from before the pad existed, shown read-only. */
  legacyPrescription: string | null;
}) {
  const router = useRouter();
  const [pad, setPad] = useState<PadData>(initial);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Latest pad for the save routine, which runs outside React's render.
  const latest = useRef(pad);
  useEffect(() => {
    latest.current = pad;
  }, [pad]);
  const inFlight = useRef<Promise<boolean> | null>(null);

  // Each section's add box, so the + beside its heading can jump to it.
  const complaintsRef = useRef<HTMLInputElement>(null);
  const examinationsRef = useRef<HTMLInputElement>(null);
  const investigationsRef = useRef<HTMLInputElement>(null);
  const advicesRef = useRef<HTMLInputElement>(null);
  const medicinesRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof PadData>(key: K, value: PadData[K]) {
    setPad((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }

  const save = useCallback(
    async (complete = false): Promise<boolean> => {
      // Let a save already on the wire land first, so two never race.
      if (inFlight.current) await inFlight.current;
      const run = (async () => {
        setSaveState("saving");
        setDirty(false);
        const res = await savePad(visitId, latest.current, complete);
        if (res.error) {
          // Not marked dirty again: that would retry every second against an
          // error that will not go away. The next edit, Print or Complete
          // retries.
          setSaveState("error");
          setSaveError(res.error);
          return false;
        }
        setSaveState("saved");
        setSaveError(null);
        return true;
      })();
      inFlight.current = run;
      try {
        return await run;
      } finally {
        inFlight.current = null;
      }
    },
    [visitId],
  );

  // Autosave shortly after the doctor stops typing.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [pad, dirty, save]);

  // Never lose a prescription to a closed tab.
  useEffect(() => {
    if (!dirty && saveState !== "saving") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saveState]);

  async function print() {
    // Open the tab now, inside the click, or the browser blocks it as a popup;
    // point it at the sheet once the latest edits are saved.
    const tab = window.open("", "_blank");
    const ok =
      dirty || saveState === "error"
        ? await save()
        : inFlight.current
          ? await inFlight.current
          : true;
    if (!ok) {
      tab?.close();
      return;
    }
    const url = `/super-admin/print/${visitId}`;
    if (tab) tab.location.href = url;
    else router.push(url);
  }

  async function complete() {
    setCompleting(true);
    const ok = await save(true);
    setCompleting(false);
    if (ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print z-20 sm:sticky sm:top-[61px] -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline bg-surface/90 px-4 py-2.5 shadow-card backdrop-blur-md">
        <Link
          href="/super-admin/doctor"
          className="text-sm font-bold text-primary underline-offset-4 transition-ui hover:underline"
        >
          ← Queue
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <SaveStatus state={saveState} error={saveError} />
          <button type="button" onClick={print} className={`${btnGhost} px-4 py-2`}>
            Print
          </button>
          {completed ? (
            <span className="rounded-full border border-ok/40 bg-ok/10 px-3 py-1 text-xs font-bold text-ok">
              Completed
            </span>
          ) : (
            <button
              type="button"
              onClick={complete}
              disabled={completing}
              className={`${btnPrimary} px-4 py-2`}
            >
              {completing ? "Completing…" : "Complete visit"}
            </button>
          )}
        </div>
      </div>

      <PadSheet
        people={people}
        left={
          <>
            <PadSection
              title="Chief Complaint"
              action={<PlusButton label="Add a complaint" target={complaintsRef} />}
            >
              <LineList
                items={pad.complaints}
                onChange={(v) => set("complaints", v)}
                placeholder="Complaint — press Enter"
                addRef={complaintsRef}
              />
            </PadSection>

            <PadSection
              title="On Examination"
              action={<PlusButton label="Add a finding" target={examinationsRef} />}
            >
              <LineList
                items={pad.examinations}
                onChange={(v) => set("examinations", v)}
                placeholder="Finding — press Enter"
                addRef={examinationsRef}
              />
            </PadSection>

            <PadSection
              title="Investigation"
              action={<PlusButton label="Add an investigation" target={investigationsRef} />}
            >
              <InvestigationList
                items={pad.investigations}
                onChange={(v) => set("investigations", v)}
                addRef={investigationsRef}
              />
            </PadSection>

            <PadSection
              title="Advice"
              action={<PlusButton label="Add advice" target={advicesRef} />}
            >
              <LineList
                items={pad.advices}
                onChange={(v) => set("advices", v)}
                placeholder="Advice — press Enter"
                numbered
                addRef={advicesRef}
              />
            </PadSection>
          </>
        }
        right={
          <PadSection
            title={<RxMark />}
            action={<PlusButton label="Add a medicine" target={medicinesRef} />}
          >
            {legacyPrescription && pad.medicines.length === 0 && (
              <div className="mb-4 rounded-control border border-hairline bg-subtle px-3.5 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Written before the new pad
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{legacyPrescription}</p>
              </div>
            )}
            <MedicineList
              items={pad.medicines}
              onChange={(v) => set("medicines", v)}
              addRef={medicinesRef}
            />
          </PadSection>
        }
      />
    </div>
  );
}
