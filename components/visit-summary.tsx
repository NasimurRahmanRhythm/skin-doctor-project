import { card, cardPad, Code, HandledBy } from "@/components/ui";
import {
  formatClinicDate,
  formatClinicTime,
  formatDateOfBirth,
  patientAge,
} from "@/lib/clinic";
import { SKIN_CONDITIONS, SKIN_TYPES, skinLabels } from "@/lib/skin";

export type VisitSummaryData = {
  visit_code: string;
  visit_type: string;
  chief_complaint: string | null;
  skin_types: string[] | null;
  skin_conditions: string[] | null;
  intake_notes: string | null;
  created_at: string;
  patient: {
    full_name: string;
    patient_code: string;
    phone: string;
    age: number | null;
    gender: string | null;
    date_of_birth: string | null;
    email: string | null;
  } | null;
  /**
   * Who handled the visit. Passing a key at all is what makes it show, so a
   * desk that has not happened yet — no nurse before vitals — can leave the
   * line out rather than printing a dash.
   */
  receptionistName?: string | null;
  nurseName?: string | null;
  doctorName?: string | null;
};

function Item({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">
        {label}
      </span>
      <span className="mt-0.5 block text-sm font-semibold text-fg">
        {value || "—"}
      </span>
    </div>
  );
}

/** What reception recorded. Read-only wherever it appears. */
export default function VisitSummary({ visit }: { visit: VisitSummaryData }) {
  const p = visit.patient;
  const age = p ? patientAge(p) : null;
  const hasHandlers =
    visit.receptionistName !== undefined ||
    visit.nurseName !== undefined ||
    visit.doctorName !== undefined;

  return (
    <section className={`${card} ${cardPad} animate-rise`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-extrabold">{p?.full_name ?? "—"}</h1>
        <span className="text-xs font-semibold text-muted">
          <Code>{visit.visit_code}</Code> · checked in{" "}
          {formatClinicTime(visit.created_at)},{" "}
          {formatClinicDate(visit.created_at)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Item label="Patient code" value={p?.patient_code ?? null} />
        <Item
          label="Date of birth"
          value={
            p?.date_of_birth
              ? `${formatDateOfBirth(p.date_of_birth)} (${age}y)`
              : age != null
                ? `${age}y`
                : null
          }
        />
        <Item label="Phone" value={p?.phone ?? null} />
        <Item label="Email" value={p?.email ?? null} />
        <Item label="Visit type" value={visit.visit_type} />
        {/* Only asked before the intake rework; kept for older records. */}
        {p?.gender && <Item label="Gender" value={p.gender} />}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Item label="Skin type" value={skinLabels(visit.skin_types, SKIN_TYPES)} />
        <Item
          label="Skin condition"
          value={skinLabels(visit.skin_conditions, SKIN_CONDITIONS)}
        />
      </div>

      {hasHandlers && (
        <div className="mt-5 border-t border-hairline pt-5">
          <HandledBy
            receptionist={visit.receptionistName}
            nurse={visit.nurseName}
            doctor={visit.doctorName}
          />
        </div>
      )}

      {visit.chief_complaint && (
        <div className="mt-5 rounded-control border-l-[3px] border-accent bg-accent-soft/60 px-4 py-3">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">
            Reason for visit
          </span>
          <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
            {visit.chief_complaint}
          </p>
        </div>
      )}

      {visit.intake_notes && (
        <div className="mt-5 rounded-control border-l-[3px] border-accent bg-accent-soft/60 px-4 py-3">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">
            Reception notes
          </span>
          <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
            {visit.intake_notes}
          </p>
        </div>
      )}
    </section>
  );
}
