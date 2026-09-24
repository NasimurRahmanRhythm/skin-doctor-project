import Link from "next/link";
import { notFound } from "next/navigation";
import { card, cardPad, ENTRY_TYPE_LABEL, Person } from "@/components/ui";
import VisitSummary from "@/components/visit-summary";
import { requireRole } from "@/lib/auth";
import { formatClinicDate, formatClinicTime } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";
import { markVisitRead } from "../../notification-actions";
import { ConsultForm, EntryForm } from "./consult-form";

function Vital({ label, value }: { label: string; value: string | null }) {
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
       height_cm, weight_kg, blood_pressure, blood_sugar, temperature, pulse, nurse_notes,
       nurse_id, receptionist_id,
       diagnosis, prescription, advice, follow_up_date,
       patients(full_name, patient_code, phone, age, gender)`,
    )
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) notFound();
  await markVisitRead(visitId);

  const patient = Array.isArray(visit.patients) ? visit.patients[0] : visit.patients;

  const handlerIds = [visit.nurse_id, visit.receptionist_id].filter(
    Boolean,
  ) as string[];

  const [{ data: handlers }, { data: entries }, { data: history }] = await Promise.all([
    handlerIds.length
      ? supabase.from("staff_directory").select("id, full_name").in("id", handlerIds)
      : Promise.resolve({ data: [] }),
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

  const handlerById = new Map((handlers ?? []).map((s) => [s.id, s.full_name]));
  const nurseName = visit.nurse_id ? handlerById.get(visit.nurse_id) ?? null : null;
  const receptionistName = visit.receptionist_id
    ? handlerById.get(visit.receptionist_id) ?? null
    : null;

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
    <div className="animate-rise space-y-6">
      <div className="no-print flex items-center justify-between">
        <Link href="/super-admin/doctor" className="text-sm font-bold text-primary underline-offset-4 transition-ui hover:underline">
          ← Back to queue
        </Link>
        <Link
          href={`/super-admin/print/${visit.id}?scope=${completed ? "full" : "doctor"}`}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-control border border-hairline bg-surface px-4 py-2 text-xs font-bold text-fg transition-ui hover:border-primary hover:bg-primary-soft hover:text-primary"
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
          receptionistName,
          nurseName,
        }}
      />

      <section className={`${card} ${cardPad}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold">Vitals</h2>
          {nurseName ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
              taken by <Person name={nurseName} role="nurse" />
            </span>
          ) : (
            <span className="text-xs text-muted">—</span>
          )}
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
          <p className="mt-4 whitespace-pre-wrap border-t border-hairline pt-4 text-sm">
            {visit.nurse_notes}
          </p>
        )}
      </section>

      {history && history.length > 0 && (
        <section className="rounded-card border border-hairline bg-surface px-5 py-5 shadow-card sm:px-7 sm:py-6">
          <h2 className="text-base font-extrabold">
            Previous visits ({history.length})
          </h2>
          <ul className="mt-4 divide-y divide-hairline">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <span className="text-sm text-fg">
                  {formatClinicDate(h.created_at)}
                  <span className="ml-3 text-xs text-muted">{h.visit_code}</span>
                </span>
                <span className="max-w-md text-right text-xs text-muted">
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
        <section className="rounded-card border border-hairline bg-surface px-5 py-5 shadow-card sm:px-7 sm:py-6">
          <h2 className="text-base font-extrabold">Record history</h2>
          <ul className="mt-4 space-y-5">
            {withLinks.map((e) => (
              <li key={e.id} className="border-l-2 border-hairline pl-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="rounded-full bg-subtle px-2.5 py-1 text-[11px] font-bold text-muted">
                    {ENTRY_TYPE_LABEL[e.type] ?? e.type}
                  </span>
                  <span className="font-bold">{e.title}</span>
                  <span className="text-xs text-muted">
                    {formatClinicDate(e.created_at)} {formatClinicTime(e.created_at)}
                  </span>
                </div>
                {e.body && <p className="mt-1 whitespace-pre-wrap text-sm">{e.body}</p>}
                {e.url && (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener"
                    className="mt-2 inline-block text-xs text-primary underline"
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
