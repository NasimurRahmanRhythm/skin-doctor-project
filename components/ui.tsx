import type { ReactNode } from "react";

/**
 * Shared class strings and small presentational pieces.
 *
 * Kept as plain exports rather than wrapper components so a page can still
 * drop its own classes alongside them without fighting prop APIs.
 */

export const card = "border border-hairline bg-surface rounded-card shadow-card";

export const cardPad = "px-5 py-5 sm:px-7 sm:py-6";

/** For cards that are also links. Lifts a hair on hover, nothing more. */
export const cardInteractive =
  "transition-ui hover:border-primary/55 hover:shadow-lift hover:-translate-y-px";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-control bg-primary px-5 py-2.5 text-sm font-bold text-on-primary shadow-card " +
  "transition-ui hover:bg-primary-hover hover:shadow-lift active:translate-y-px active:shadow-card " +
  "disabled:pointer-events-none disabled:opacity-45";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-control border border-hairline bg-surface px-5 py-2.5 text-sm font-semibold text-fg " +
  "transition-ui hover:border-primary hover:bg-primary-soft hover:text-primary active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-45";

export const btnQuiet =
  "inline-flex items-center gap-1 rounded-control px-2 py-1 text-xs font-semibold text-muted transition-ui hover:bg-subtle hover:text-fg";

/**
 * A single soft halo on focus rather than a thick ring. The old treatment
 * stacked a 2px ring on top of the browser outline, which read as two borders
 * fighting; the outline is now suppressed for fields in globals.css.
 */
export const field =
  "w-full rounded-control border border-hairline bg-surface px-3.5 py-2.5 text-sm font-medium text-fg " +
  "placeholder:font-normal placeholder:text-muted/60 " +
  "transition-ui hover:border-muted/45 " +
  "focus:border-primary focus:shadow-[0_0_0_3px_var(--ring)] focus:outline-none";

export const fieldLabel =
  "block text-xs font-bold tracking-wide text-muted";

/** Record codes, so 0/O and 1/l stay distinguishable when read aloud. */
export function Code({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[0.82em] font-medium tracking-tight ${className}`}>
      {children}
    </span>
  );
}

const STATUS_STYLE: Record<string, string> = {
  awaiting_vitals: "border-warn/35 bg-warn/12 text-warn",
  awaiting_doctor: "border-primary/35 bg-primary/12 text-primary",
  completed: "border-ok/35 bg-ok/12 text-ok",
};

export const STATUS_LABEL: Record<string, string> = {
  awaiting_vitals: "With nurse",
  awaiting_doctor: "With doctor",
  completed: "Completed",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        STATUS_STYLE[status] ?? "border-hairline bg-subtle text-muted"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/**
 * Timeline entry types. `intake` is what the patient handed over at reception,
 * and it reads as "brought in" so a doctor can tell at a glance that the
 * clinic did not produce it.
 */
export const ENTRY_TYPE_LABEL: Record<string, string> = {
  prescription: "prescription",
  report: "report",
  note: "note",
  file: "file",
  intake: "brought in",
};

/** Drops an honorific so "Dr. Nabila Karim" initialises as NK, not DN. */
function initials(name: string) {
  const parts = name
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "")
    .trim()
    .split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

const PERSON_TONE: Record<string, string> = {
  receptionist: "bg-accent-soft text-accent",
  nurse: "bg-warn/12 text-warn",
  doctor: "bg-primary-soft text-primary",
};

/**
 * Who handled a patient, as initials plus a name.
 *
 * Every visit passes through three people, and "which nurse took these
 * vitals" is the first question asked when something looks wrong — so the
 * name belongs next to the record, not only in the owner's table.
 */
export function Person({
  name,
  role,
  className = "",
}: {
  name: string | null | undefined;
  role?: "receptionist" | "nurse" | "doctor";
  className?: string;
}) {
  if (!name) return <span className="text-muted">—</span>;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden="true"
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${
          PERSON_TONE[role ?? ""] ?? "bg-subtle text-muted"
        }`}
      >
        {initials(name)}
      </span>
      <span className="truncate font-semibold">{name}</span>
    </span>
  );
}

/** A labelled name, for the summary panels on the desk pages. */
export function HandledBy({
  receptionist,
  nurse,
  doctor,
}: {
  receptionist?: string | null;
  nurse?: string | null;
  doctor?: string | null;
}) {
  const people: [string, string | null | undefined, "receptionist" | "nurse" | "doctor"][] = [
    ["Checked in by", receptionist, "receptionist"],
    ["Vitals by", nurse, "nurse"],
    ["Doctor", doctor, "doctor"],
  ];
  const shown = people.filter(([, name]) => name !== undefined);
  if (shown.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      {shown.map(([label, name, role]) => (
        <div key={label}>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">
            {label}
          </span>
          <span className="mt-1 block text-sm">
            <Person name={name} role={role} />
          </span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ tables --

export const tableWrap =
  "overflow-x-auto rounded-card border border-hairline bg-surface shadow-card";

export const tableEl = "w-full min-w-[820px] text-left text-sm";

export const thCell =
  "whitespace-nowrap bg-subtle px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.09em] text-fg/65";

export const tdCell = "px-4 py-3.5 align-top";

/**
 * Rows tint on hover and grow a gold edge on the left, so the eye can follow
 * one patient across six columns without a zebra pattern shouting underneath.
 */
export const trRow =
  "border-t border-hairline transition-ui hover:bg-primary-soft/55 " +
  "[box-shadow:inset_3px_0_0_0_transparent] hover:[box-shadow:inset_3px_0_0_0_var(--primary)]";

/** A section heading with optional trailing content on the same line. */
export function SectionHead({
  title,
  hint,
  trailing,
}: {
  title: string;
  hint?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
      <div>
        <h2 className="text-base font-extrabold">{title}</h2>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
      {trailing}
    </div>
  );
}

/**
 * Empty states say what will make the emptiness go away, rather than just
 * reporting that there is nothing — a blank panel at a busy desk reads as a
 * bug.
 */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-hairline bg-subtle/40 px-6 py-12 text-center">
      <p className="text-sm font-bold text-fg">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Grey bars used by the route-level loading screens. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-subtle ${className}`} aria-hidden="true" />
  );
}
