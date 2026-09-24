import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { formatClinicDate, formatClinicTime } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  awaiting_vitals: "With nurse",
  awaiting_doctor: "With doctor",
  completed: "Completed",
};

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="block text-[11px] uppercase tracking-wider text-ink-soft">
        {label}
      </span>
      <span className="text-sm text-ink">{value || "—"}</span>
    </div>
  );
}

function Handler({ role, name }: { role: string; name: string | null }) {
  return (
    <span className="text-xs text-ink-soft">
      {role} <span className="text-ink">{name ?? "—"}</span>
    </span>
  );
}

export default async function OwnerPatientPage({
  params,
}: PageProps<"/super-admin/owner/patients/[patientId]">) {
  await requireRole("owner");
  const { patientId } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, patient_code, full_name, phone, age, gender, address, created_at")
    .eq("id", patientId)
    .maybeSingle();

  if (!patient) notFound();

  const { data: visits } = await supabase
    .from("visits")
    .select(
      `id, visit_code, status, visit_type, doctor_requested, chief_complaint,
       created_at, vitals_at, completed_at,
       height_cm, weight_kg, blood_pressure, blood_sugar, temperature, pulse, nurse_notes,
       diagnosis, prescription, advice, follow_up_date,
       receptionist:receptionist_id(full_name),
       nurse:nurse_id(full_name),
       doctor:doctor_id(full_name, specialty)`,
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  const visitIds = (visits ?? []).map((v) => v.id);
  const { data: entries } = visitIds.length
    ? await supabase
        .from("visit_entries")
        .select("id, visit_id, type, title, body, file_name, created_at, author:author_id(full_name)")
        .in("visit_id", visitIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const entriesByVisit = new Map<string, typeof entries>();
  for (const e of entries ?? []) {
    const list = entriesByVisit.get(e.visit_id) ?? [];
    list.push(e);
    entriesByVisit.set(e.visit_id, list);
  }

  const one = <T,>(x: T | T[] | null) => (Array.isArray(x) ? (x[0] ?? null) : x);

  return (
    <div className="space-y-6">
      <Link
        href="/super-admin/owner"
        className="no-print inline-block text-sm text-sage underline underline-offset-2"
      >
        ← Back to search
      </Link>

      <section className="border border-line bg-paper px-8 py-7 rounded-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-2xl">{patient.full_name}</h1>
          <span className="text-xs text-ink-soft">
            {patient.patient_code} · registered {formatClinicDate(patient.created_at)}
          </span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <Field label="Phone" value={patient.phone} />
          <Field label="Age" value={patient.age != null ? String(patient.age) : null} />
          <Field label="Gender" value={patient.gender} />
          <Field label="Total visits" value={String((visits ?? []).length)} />
          {patient.address && (
            <div className="sm:col-span-4">
              <Field label="Address" value={patient.address} />
            </div>
          )}
        </div>
      </section>

      {(visits ?? []).map((v) => {
        const rec = one(v.receptionist) as { full_name: string } | null;
        const nur = one(v.nurse) as { full_name: string } | null;
        const doc = one(v.doctor) as { full_name: string; specialty: string | null } | null;
        const visitEntries = entriesByVisit.get(v.id) ?? [];

        return (
          <section key={v.id} className="border border-line bg-paper px-8 py-7 rounded-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-lg">
                {formatClinicDate(v.created_at)}
                <span className="ml-3 text-xs text-ink-soft">{v.visit_code}</span>
              </h2>
              <div className="flex items-baseline gap-4">
                <span className="text-xs text-ink-soft">
                  {STATUS_LABEL[v.status] ?? v.status}
                </span>
                <Link
                  href={`/super-admin/print/${v.id}?scope=full`}
                  target="_blank"
                  className="no-print text-xs text-sage underline underline-offset-2"
                >
                  Print
                </Link>
              </div>
            </div>

            {/* Who handled this visit, and how long each stage took. */}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-y border-line py-3">
              <Handler role="Reception" name={rec?.full_name ?? null} />
              <Handler role="Nurse" name={nur?.full_name ?? null} />
              <Handler
                role="Doctor"
                name={
                  doc
                    ? `${doc.full_name}${v.doctor_requested ? " (requested)" : " (auto)"}`
                    : null
                }
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-x-6 text-[11px] text-ink-soft">
              <span>in {formatClinicTime(v.created_at)}</span>
              {v.vitals_at && <span>vitals {formatClinicTime(v.vitals_at)}</span>}
              {v.completed_at && <span>done {formatClinicTime(v.completed_at)}</span>}
            </div>

            {v.chief_complaint && (
              <p className="mt-4 whitespace-pre-wrap text-sm">{v.chief_complaint}</p>
            )}

            {(v.blood_pressure || v.height_cm || v.weight_kg) && (
              <div className="mt-4 grid gap-4 sm:grid-cols-6">
                <Field label="Height" value={v.height_cm ? `${v.height_cm} cm` : null} />
                <Field label="Weight" value={v.weight_kg ? `${v.weight_kg} kg` : null} />
                <Field label="BP" value={v.blood_pressure} />
                <Field label="Sugar" value={v.blood_sugar ? String(v.blood_sugar) : null} />
                <Field label="Temp" value={v.temperature ? `${v.temperature} °C` : null} />
                <Field label="Pulse" value={v.pulse ? `${v.pulse} bpm` : null} />
              </div>
            )}

            {(v.diagnosis || v.prescription || v.advice) && (
              <div className="mt-5 space-y-4 border-t border-line pt-4">
                {v.diagnosis && (
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-rose">
                      Diagnosis
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{v.diagnosis}</p>
                  </div>
                )}
                {v.prescription && (
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-rose">
                      Prescription
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{v.prescription}</p>
                  </div>
                )}
                {v.advice && (
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-rose">
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
              <ul className="mt-5 space-y-3 border-t border-line pt-4">
                {visitEntries.map((e) => {
                  const author = one(e.author) as { full_name: string } | null;
                  return (
                    <li key={e.id} className="border-l-2 border-line pl-4">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="rounded-full bg-ivory-dim px-2 py-0.5 text-[11px] text-ink-soft">
                          {e.type}
                        </span>
                        <span className="text-sm">{e.title}</span>
                        <span className="text-[11px] text-ink-soft">
                          {author?.full_name ?? "—"} ·{" "}
                          {formatClinicDate(e.created_at)}
                        </span>
                      </div>
                      {e.body && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
                          {e.body}
                        </p>
                      )}
                      {e.file_name && (
                        <span className="mt-1 block text-[11px] text-ink-soft">
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
