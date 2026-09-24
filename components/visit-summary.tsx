import { formatClinicDate, formatClinicTime } from "@/lib/clinic";

export type VisitSummaryData = {
  visit_code: string;
  visit_type: string;
  chief_complaint: string | null;
  created_at: string;
  patient: {
    full_name: string;
    patient_code: string;
    phone: string;
    age: number | null;
    gender: string | null;
  } | null;
  doctorName?: string | null;
};

function Item({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="block text-[11px] uppercase tracking-wider text-ink-soft">
        {label}
      </span>
      <span className="text-sm text-ink">{value || "—"}</span>
    </div>
  );
}

/** What reception recorded. Read-only wherever it appears. */
export default function VisitSummary({ visit }: { visit: VisitSummaryData }) {
  const p = visit.patient;
  return (
    <section className="border border-line bg-paper px-8 py-7 rounded-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-2xl">{p?.full_name ?? "—"}</h1>
        <span className="text-xs text-ink-soft">
          {visit.visit_code} · checked in {formatClinicTime(visit.created_at)},{" "}
          {formatClinicDate(visit.created_at)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <Item label="Patient code" value={p?.patient_code ?? null} />
        <Item label="Age" value={p?.age != null ? String(p.age) : null} />
        <Item label="Gender" value={p?.gender ?? null} />
        <Item label="Phone" value={p?.phone ?? null} />
        <Item label="Visit type" value={visit.visit_type} />
        {visit.doctorName !== undefined && (
          <Item label="Doctor" value={visit.doctorName} />
        )}
      </div>

      {visit.chief_complaint && (
        <div className="mt-5 border-t border-line pt-4">
          <span className="block text-[11px] uppercase tracking-wider text-rose">
            Reason for visit
          </span>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            {visit.chief_complaint}
          </p>
        </div>
      )}
    </section>
  );
}
