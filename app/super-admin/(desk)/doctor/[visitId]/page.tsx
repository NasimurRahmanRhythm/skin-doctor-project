import Link from "next/link";
import { notFound } from "next/navigation";
import VisitSummary from "@/components/visit-summary";
import { requireRole } from "@/lib/auth";
import { formatClinicDate, formatClinicTime } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";
import { markVisitRead } from "../../notification-actions";
import { ConsultForm, EntryForm } from "./consult-form";

function Vital({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="block text-[11px] uppercase tracking-wider text-ink-soft">
        {label}
      </span>
      <span className="text-sm text-ink">{value || "—"}</span>
    </div>
  );
}

export default async function DoctorVisitPage({
  params,
}: PageProps<"/super-admin/doctor/[visitId]">) {
  await requireRole("doctor");
  const { visitId } = await params;
  const supabase = await createClient();

  const { data: visit } = await supabase
    .from("visits")
    .select(
      `id, visit_code, visit_type, chief_complaint, created_at, status, patient_id,
       height_cm, weight_kg, blood_pressure, blood_sugar, temperature, pulse, nurse_notes, nurse_id,
       diagnosis, prescription, advice, follow_up_date,
       patients(full_name, patient_code, phone, age, gender)`,
    )
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) notFound();
  await markVisitRead(visitId);

  const patient = Array.isArray(visit.patients) ? visit.patients[0] : visit.patients;

  const [{ data: nurse }, { data: entries }, { data: history }] = await Promise.all([
    visit.nurse_id
      ? supabase.from("staff_directory").select("full_name").eq("id", visit.nurse_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("visit_entries")
      .select("id, type, title, body, file_path, file_name, file_type, created_at")
      .eq("visit_id", visitId)
      .order("created_at", { ascending: false }),
    // Earlier visits for the same patient. A real foreign-key join, so it
    // cannot drift the way matching on a phone string would.
    supabase
      .from("visits")
      .select("id, visit_code, created_at, diagnosis, status")
      .eq("patient_id", visit.patient_id)
      .neq("id", visitId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Files live in a private bucket, so each one needs its own short-lived link.
  const withLinks = await Promise.all(
    (entries ?? []).map(async (e) => {
      if (!e.file_path) return { ...e, url: null as string | null };
      const { data } = await supabase.storage
        .from("patient-files")
        .createSignedUrl(e.file_path, 60 * 10);
      return { ...e, url: data?.signedUrl ?? null };
    }),
  );

  const completed = visit.status === "completed";

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <Link href="/super-admin/doctor" className="text-sm text-sage underline underline-offset-2">
          ← Back to queue
        </Link>
        <Link
          href={`/super-admin/print/${visit.id}?scope=${completed ? "full" : "doctor"}`}
          target="_blank"
          className="border border-sage px-5 py-2 text-xs font-medium text-sage hover:bg-ivory-dim rounded-card"
        >
          Print
        </Link>
      </div>

      <VisitSummary
        visit={{
          visit_code: visit.visit_code,
          visit_type: visit.visit_type,
          chief_complaint: visit.chief_complaint,
          created_at: visit.created_at,
          patient: patient ?? null,
        }}
      />

      <section className="border border-line bg-paper px-8 py-7 rounded-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-lg">Vitals</h2>
          <span className="text-xs text-ink-soft">
            {nurse ? `taken by ${nurse.full_name}` : "—"}
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-6">
          <Vital label="Height" value={visit.height_cm ? `${visit.height_cm} cm` : null} />
          <Vital label="Weight" value={visit.weight_kg ? `${visit.weight_kg} kg` : null} />
          <Vital label="BP" value={visit.blood_pressure} />
          <Vital label="Sugar" value={visit.blood_sugar ? `${visit.blood_sugar}` : null} />
          <Vital label="Temp" value={visit.temperature ? `${visit.temperature} °C` : null} />
          <Vital label="Pulse" value={visit.pulse ? `${visit.pulse} bpm` : null} />
        </div>
        {visit.nurse_notes && (
          <p className="mt-4 whitespace-pre-wrap border-t border-line pt-4 text-sm">
            {visit.nurse_notes}
          </p>
        )}
      </section>

      {history && history.length > 0 && (
        <section className="border border-line bg-paper px-8 py-7 rounded-card">
          <h2 className="font-serif text-lg">
            Previous visits ({history.length})
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <span className="text-sm text-ink">
                  {formatClinicDate(h.created_at)}
                  <span className="ml-3 text-xs text-ink-soft">{h.visit_code}</span>
                </span>
                <span className="max-w-md text-right text-xs text-ink-soft">
                  {h.diagnosis ?? (h.status === "completed" ? "no diagnosis recorded" : h.status)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConsultForm
        visitId={visit.id}
        completed={completed}
        initial={{
          diagnosis: visit.diagnosis,
          prescription: visit.prescription,
          advice: visit.advice,
          follow_up_date: visit.follow_up_date,
        }}
      />

      {withLinks.length > 0 && (
        <section className="border border-line bg-paper px-8 py-7 rounded-card">
          <h2 className="font-serif text-lg">Record history</h2>
          <ul className="mt-4 space-y-5">
            {withLinks.map((e) => (
              <li key={e.id} className="border-l-2 border-line pl-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="rounded-full bg-ivory-dim px-2 py-0.5 text-[11px] text-ink-soft">
                    {e.type}
                  </span>
                  <span className="font-serif">{e.title}</span>
                  <span className="text-xs text-ink-soft">
                    {formatClinicDate(e.created_at)} {formatClinicTime(e.created_at)}
                  </span>
                </div>
                {e.body && <p className="mt-1 whitespace-pre-wrap text-sm">{e.body}</p>}
                {e.url && (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener"
                    className="mt-2 inline-block text-xs text-sage underline"
                  >
                    {e.file_name ?? "Attached file"}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <EntryForm visitId={visit.id} />
    </div>
  );
}
