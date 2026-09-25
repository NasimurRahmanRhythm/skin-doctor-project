import type { ReactNode } from "react";
import {
  formatDose,
  formatDuration,
  MEAL_LABEL,
  type Investigation,
  type Medicine,
} from "@/lib/prescription";

/**
 * The prescription pad: one layout for the doctor's screen and for paper.
 *
 * The doctor types straight onto the sheet that prints, so what they see is
 * what the patient takes home. The editor fills the two columns with inputs;
 * the print page fills them with the read-only pieces at the bottom of this
 * file. Everything else — letterhead, patient row, footer — is shared.
 *
 * Gold here is fixed hex, not theme tokens: a letterhead is printed matter and
 * must look the same in dark mode and on paper.
 */

const GOLD_BAND =
  "linear-gradient(118deg, #5e3f17 0%, #8f6230 38%, #b8874f 72%, #d4a574 100%)";

export type PadPeople = {
  doctor: { name: string; specialty: string | null } | null;
  patient: { name: string; age: string | null; id: string | null };
  /** Already formatted, e.g. "25/09/2026". */
  date: string;
};

function Letterhead({ doctor }: { doctor: PadPeople["doctor"] }) {
  return (
    <header
      className="relative overflow-hidden text-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
      style={{
        background: GOLD_BAND,
        clipPath: "polygon(0 0, 100% 0, 100% 58%, 93% 100%, 0 100%)",
      }}
    >
      {/* A soft sheen across the band, the way light catches the foil logo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[46%] w-40 -skew-x-[28deg] bg-white/10"
      />
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-5 sm:px-9 sm:py-6">
        <div className="min-w-0">
          <p className="font-display text-[26px] font-bold leading-tight sm:text-[30px]">
            {doctor?.name ?? "Doctor"}
          </p>
          {doctor?.specialty && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#fbeedd]">
              {doctor.specialty}
            </p>
          )}
          <span className="mt-2.5 block h-px w-24 bg-white/45" />
        </div>

        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- must be in the
              document before window.print() fires, not lazy-loaded */}
          <img
            src="/brand/mark-light.png"
            alt=""
            width={62}
            height={62}
            className="h-12 w-12 sm:h-[62px] sm:w-[62px]"
          />
          <p className="mt-1 font-display text-xl font-semibold leading-none tracking-wide sm:text-2xl">
            DermaSoul
          </p>
          <p className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.34em] text-[#fbeedd]">
            Medical Aesthetics
          </p>
        </div>

        <div />
      </div>
    </header>
  );
}

function PatientRow({ patient, date }: Pick<PadPeople, "patient" | "date">) {
  const cell = (label: string, value: string | null) => (
    <div className="min-w-0">
      <span className="text-muted">{label}: </span>
      <strong className="font-bold text-fg">{value || "—"}</strong>
    </div>
  );
  return (
    <div className="mx-6 mt-5 grid grid-cols-2 gap-x-6 gap-y-1.5 border-y border-fg/70 py-2 text-[13px] sm:mx-9 sm:grid-cols-[1.6fr_1fr_1fr_1fr]">
      {cell("Name", patient.name)}
      {cell("Age", patient.age)}
      {cell("ID", patient.id)}
      {cell("Date", date)}
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto">
      <div className="flex justify-end px-6 pb-3 pt-10 sm:px-9">
        <div className="w-56 border-t border-fg/60 pt-1 text-center text-xs font-semibold text-muted">
          Doctor&rsquo;s signature
        </div>
      </div>
      <div
        className="px-6 py-2 text-center text-[10.5px] font-semibold tracking-[0.12em] text-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact] sm:px-9"
        style={{ background: GOLD_BAND }}
      >
        DERMASOUL MEDICAL AESTHETICS · BY DR. NUSRAT LIZA
      </div>
    </footer>
  );
}

/** The whole sheet. `left` and `right` are the two writing columns. */
export function PadSheet({
  people,
  left,
  right,
  className = "",
}: {
  people: PadPeople;
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`rx-sheet flex flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-card ${className}`}
    >
      <Letterhead doctor={people.doctor} />
      <PatientRow patient={people.patient} date={people.date} />

      <div className="grid flex-1 grid-cols-1 md:grid-cols-[minmax(0,35fr)_minmax(0,65fr)] print:grid-cols-[minmax(0,35fr)_minmax(0,65fr)]">
        <div className="space-y-7 px-6 py-6 sm:px-9 md:border-r md:border-fg/25 md:pr-6 print:border-r print:border-fg/25 print:pr-6">
          {left}
        </div>
        <div className="relative px-6 py-6 sm:px-9 md:pl-7 print:pl-7">
          {/* Watermark, like the seal on a printed pad. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- see Letterhead */}
          <img
            src="/brand/mark-256.png"
            alt=""
            aria-hidden
            width={256}
            height={256}
            className="pointer-events-none absolute left-1/2 top-1/2 w-[46%] max-w-64 -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
          />
          <div className="relative">{right}</div>
        </div>
      </div>

      <Footer />
    </article>
  );
}

/**
 * A4 with no browser margin, so the gold bands run to the paper's edge; a
 * zero margin also stops the browser printing the URL and date in it.
 * Render once on any page that prints a pad.
 */
export function PadPrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: A4; margin: 0; }
        .rx-sheet {
          width: 210mm !important;
          min-height: 297mm !important;
          max-width: none !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          margin: 0 !important;
        }
      }
    `}</style>
  );
}

/** A heading on the pad, with an optional control beside it (the + button). */
export function PadSection({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="break-inside-avoid">
      <div className="flex items-center gap-2">
        <h3 className="text-[15px] font-extrabold tracking-tight text-fg">{title}</h3>
        {action}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** The ℞ mark that heads the right-hand column. */
export function RxMark() {
  return (
    <span className="font-display text-[34px] font-bold leading-none text-primary">
      R<span className="text-[0.62em]">x</span>
    </span>
  );
}

// ---------------------------------------------------------- read-only ----

/** Blank lines to write on by hand when a section is empty on paper. */
function Blank({ lines = 2 }: { lines?: number }) {
  return (
    <div aria-hidden className="space-y-5 pt-2">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-px bg-hairline print:bg-transparent" />
      ))}
    </div>
  );
}

export function ReadBullets({ items, blank = 2 }: { items: string[]; blank?: number }) {
  if (items.length === 0) return <Blank lines={blank} />;
  return (
    <ul className="list-disc space-y-1 pl-5 text-[13.5px] marker:text-primary">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

export function ReadNumbered({ items, blank = 2 }: { items: string[]; blank?: number }) {
  if (items.length === 0) return <Blank lines={blank} />;
  return (
    <ol className="list-decimal space-y-1 pl-5 text-[13.5px] marker:font-semibold marker:text-muted">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ol>
  );
}

export function ReadInvestigations({ items }: { items: Investigation[] }) {
  if (items.length === 0) return <Blank />;
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] marker:text-primary">
      {items.map((t, i) => (
        <li key={i}>
          {t.name}
          {t.result && (
            <span className="block text-xs italic text-muted">{t.result}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** The dotted leader between the parts of a dosage line. */
export function Leader() {
  return (
    <span aria-hidden className="mx-3 min-w-6 flex-1 translate-y-[-3px] border-b border-dashed border-fg/35" />
  );
}

export function ReadMedicines({ items }: { items: Medicine[] }) {
  if (items.length === 0) return <Blank lines={6} />;
  return (
    <ol className="space-y-3.5">
      {items.map((m, i) => (
        <li key={i} className="break-inside-avoid">
          <div className="flex gap-2 text-[15px] font-semibold">
            <span className="w-5 shrink-0 text-right text-muted">{i + 1}.</span>
            <span>{m.name}</span>
          </div>
          <div className="mt-0.5 flex items-end pl-7 text-[13px]">
            <span className="font-semibold tabular-nums">{formatDose(m.dose)}</span>
            <Leader />
            <span>{MEAL_LABEL[m.meal]}</span>
            <Leader />
            <span className="font-medium">{formatDuration(m.duration)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
