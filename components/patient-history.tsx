import Link from "next/link";
import { notFound } from "next/navigation";
import { ENTRY_TYPE_LABEL, Person } from "@/components/ui";
import {
  formatClinicDate,
  formatClinicTime,
  formatDateOfBirth,
  patientAge,
} from "@/lib/clinic";
import { PadSummary } from "@/components/rx-pad";
import { readPad, type PadSource } from "@/lib/prescription";
import { SKIN_CONDITIONS, SKIN_TYPES, skinLabels } from "@/lib/skin";
import { bmiLabel } from "@/lib/vitals";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  awaiting_vitals: "With nurse",
  awaiting_doctor: "With doctor",
  completed: "Completed",
};

function Field({ label, value }: { label: string; value: string | null }) {
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

function Handler({
  label,
  name,
  role,
}: {
  label: string;
  name: string | null;
  role: "receptionist" | "nurse" | "doctor";
}) {
  return (
    <div>
      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">
        {label}
      </span>
      <span className="mt-1 block text-sm">
        <Person name={name} role={role} />
      </span>
    </div>
  );
}

/**
 * A patient's details and every visit on file, newest first. Every desk that
 * opens this sees the whole history; RLS decides who may open it at all.
 */
export default async function PatientHistory({
  patientId,
  backHref,
  children,
}: {
  patientId: string;
  backHref: string;
  /** Shown above the patient's details, e.g. the visit an alert pointed at. */
  children?: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select(
      "id, patient_code, full_name, phone, email, age, date_of_birth, gender, address, created_at",
    )
    .eq("id", patientId)
    .maybeSingle();

  if (!patient) notFound();

  const { data: visits } = await supabase
    .from("visits")
    .select(
      `id, visit_code, status, visit_type, doctor_requested, chief_complaint,
       skin_types, skin_conditions, intake_notes,
       created_at, vitals_at, completed_at,
       height_cm, weight_kg, blood_pressure, blood_sugar, temperature, pulse, nurse_notes,
       diagnosis, prescription, advice, follow_up_date,
       complaints, examinations, investigations, advices, medicines,
       receptionist_id, nurse_id, doctor_id`,
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  const visitIds = (visits ?? []).map((v) => v.id);
  const { data: entries } = visitIds.length
    ? await supabase
        .from("visit_entries")
        .select("id, visit_id, type, title, body, file_name, created_at, author_id")
        .in("visit_id", visitIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const entriesByVisit = new Map<string, typeof entries>();
  for (const e of entries ?? []) {
    const list = entriesByVisit.get(e.visit_id) ?? [];
    list.push(e);
    entriesByVisit.set(e.visit_id, list);
  }

  // Names come from the directory view, which every desk may read; the staff
  // table itself is owner-only, so a join through it would be blank for a doctor.
  const staffIds = [
    ...new Set(
      [
        ...(visits ?? []).flatMap((v) => [v.receptionist_id, v.nurse_id, v.doctor_id]),
        ...(entries ?? []).map((e) => e.author_id),
      ].filter(Boolean),
    ),
  ] as string[];
  const { data: people } = staffIds.length
    ? await supabase
        .from("staff_directory")
        .select("id, full_name, specialty")
        .in("id", staffIds)
    : { data: [] };
  const personById = new Map(
    (people ?? []).map((s) => [
      s.id as string,
      s as { full_name: string; specialty: string | null },
    ]),
  );
  const person = (id: string | null) => (id ? personById.get(id) ?? null : null);

  return (
    <div className="animate-rise space-y-6">
      <Link
        href={backHref}
        className="no-print inline-block text-sm font-bold text-primary underline-offset-4 transition-ui hover:underline"
      >
        ← Back to search
      </Link>

      {children}

      <section className="rounded-card border border-hairline bg-surface px-5 py-5 shadow-card sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-extrabold">{patient.full_name}</h1>
          <span className="text-xs text-muted">
            {patient.patient_code} · registered {formatClinicDate(patient.created_at)}
          </span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <Field label="Phone" value={patient.phone} />
          <Field
            label="Date of birth"
            value={
              patient.date_of_birth
                ? `${formatDateOfBirth(patient.date_of_birth)} (${patientAge(patient)}y)`
                : patient.age != null
                  ? `${patient.age}y`
                  : null
            }
          />
          <Field label="Email" value={patient.email} />
          <Field label="Total visits" value={String((visits ?? []).length)} />
          {patient.gender && <Field label="Gender" value={patient.gender} />}
          {patient.address && (
            <div className="sm:col-span-4">
              <Field label="Address" value={patient.address} />
            </div>
          )}
        </div>
      </section>

      {(visits ?? []).map((v) => {
        const rec = person(v.receptionist_id);
        const nur = person(v.nurse_id);
        const doc = person(v.doctor_id);
        const visitEntries = entriesByVisit.get(v.id) ?? [];

        return (
          <section key={v.id} className="rounded-card border border-hairline bg-surface px-5 py-5 shadow-card sm:px-7 sm:py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-extrabold">
                {formatClinicDate(v.created_at)}
                <span className="ml-3 text-xs text-muted">{v.visit_code}</span>
              </h2>
              <div className="flex items-baseline gap-4">
                <span className="text-xs text-muted">
                  {STATUS_LABEL[v.status] ?? v.status}
                </span>
                <Link
                  href={`/admin/print/${v.id}`}
                  target="_blank"
                  className="no-print text-xs font-bold text-primary underline-offset-4 transition-ui hover:underline"
                >
                  Print
                </Link>
              </div>
            </div>

            {/* Who handled this visit, and how long each stage took. */}
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-y border-hairline py-4">
              <Handler
                label="Checked in by"
                name={rec?.full_name ?? null}
                role="receptionist"
              />
              <Handler label="Vitals by" name={nur?.full_name ?? null} role="nurse" />
              <Handler
                label={`Doctor${doc ? (v.doctor_requested ? " · requested" : " · auto") : ""}`}
                name={doc?.full_name ?? null}
                role="doctor"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-x-6 text-[11px] text-muted">
              <span>in {formatClinicTime(v.created_at)}</span>
              {v.vitals_at && <span>vitals {formatClinicTime(v.vitals_at)}</span>}
              {v.completed_at && <span>done {formatClinicTime(v.completed_at)}</span>}
            </div>

            {(v.skin_types?.length > 0 || v.skin_conditions?.length > 0) && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Skin type" value={skinLabels(v.skin_types, SKIN_TYPES)} />
                <Field
                  label="Skin condition"
                  value={skinLabels(v.skin_conditions, SKIN_CONDITIONS)}
                />
              </div>
            )}

            {v.chief_complaint && (
              <p className="mt-4 whitespace-pre-wrap text-sm">{v.chief_complaint}</p>
            )}

            {v.intake_notes && (
              <p className="mt-4 whitespace-pre-wrap text-sm">{v.intake_notes}</p>
            )}

            {(v.blood_pressure || v.height_cm || v.weight_kg) && (
              <div className="mt-4 grid gap-4 sm:grid-cols-4">
                <Field label="Height" value={v.height_cm ? `${v.height_cm} cm` : null} />
                <Field label="Weight" value={v.weight_kg ? `${v.weight_kg} kg` : null} />
                <Field label="BMI" value={bmiLabel(v.height_cm, v.weight_kg)} />
                <Field label="BP" value={v.blood_pressure} />
                <Field label="Sugar" value={v.blood_sugar ? String(v.blood_sugar) : null} />
                <Field label="Pulse" value={v.pulse ? `${v.pulse} bpm` : null} />
                {/* Temperature is no longer taken; older visits keep theirs. */}
                {v.temperature && <Field label="Temp" value={`${v.temperature} °C`} />}
              </div>
            )}

            {/* The doctor's pad, once anything has been written on it. */}
            {(v.complaints || v.medicines || v.advices || v.investigations) &&
              (() => {
                const pad = readPad(v as unknown as PadSource);
                return (
                  <div className="mt-5 border-t border-hairline pt-4">
                    <PadSummary pad={pad} />
                  </div>
                );
              })()}

            {(v.diagnosis || v.prescription || v.advice) && !v.advices && (
              <div className="mt-5 space-y-4 border-t border-hairline pt-4">
                {v.diagnosis && (
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">
                      Diagnosis
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{v.diagnosis}</p>
                  </div>
                )}
                {v.prescription && (
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">
                      Prescription
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{v.prescription}</p>
                  </div>
                )}
                {v.advice && (
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">
                      Advice
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{v.advice}</p>
                  </div>
                )}
                {v.follow_up_date && (
                  <Field label="Follow-up" value={formatClinicDate(v.follow_up_date)} />
                )}
              </div>
            )}

            {visitEntries.length > 0 && (
              <ul className="mt-5 space-y-3 border-t border-hairline pt-4">
                {visitEntries.map((e) => {
                  const author = person(e.author_id);
                  return (
                    <li key={e.id} className="border-l-2 border-hairline pl-4">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="rounded-full bg-subtle px-2.5 py-1 text-[11px] font-bold text-muted">
                          {ENTRY_TYPE_LABEL[e.type] ?? e.type}
                        </span>
                        <span className="text-sm">{e.title}</span>
                        <span className="text-[11px] text-muted">
                          {author?.full_name ?? "—"} ·{" "}
                          {formatClinicDate(e.created_at)}
                        </span>
                      </div>
                      {e.body && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                          {e.body}
                        </p>
                      )}
                      {e.file_name && (
                        <span className="mt-1 block text-[11px] text-muted">
                          attachment: {e.file_name}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
