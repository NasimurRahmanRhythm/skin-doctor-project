import { notFound } from "next/navigation";
import { card, cardPad, Code, ENTRY_TYPE_LABEL } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatClinicDate, formatClinicTime } from "@/lib/clinic";
import {
  ageLabel,
  formatPadDate,
  PAD_COLUMNS,
  readPad,
  type PadSource,
} from "@/lib/prescription";
import { SKIN_CONDITIONS, skinLabels } from "@/lib/skin";
import { createClient } from "@/lib/supabase/server";
import { markVisitRead } from "../../notification-actions";
import { EntryForm } from "./consult-form";
import RxEditor from "./rx-editor";

export default async function DoctorVisitPage({
  params,
}: PageProps<"/super-admin/doctor/[visitId]">) {
  const staff = await requireRole("doctor");
  const { visitId } = await params;
  const supabase = await createClient();

  const { data: visit } = await supabase
    .from("visits")
    .select(
      `id, visit_code, visit_type, chief_complaint, intake_notes, created_at, status, patient_id,
       nurse_id, receptionist_id, ${PAD_COLUMNS},
       patients(full_name, patient_code, phone, age, date_of_birth)`,
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
      .select("id, visit_code, created_at, complaints, diagnosis, medicines, status")
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

  const conditions = skinLabels(visit.skin_conditions, SKIN_CONDITIONS);
  const receptionNote = visit.intake_notes ?? visit.chief_complaint;

  return (
    <div className="animate-rise space-y-6">
      {/* What the front desk and the nurse passed on, above the pad so it is
          read before anything is written. */}
      <section className={`${card} px-5 py-4 sm:px-7`}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          <span>
            <Code className="text-fg">{visit.visit_code}</Code> · {visit.visit_type} ·
            checked in {formatClinicTime(visit.created_at)}
          </span>
          {patient?.phone && <span>{patient.phone}</span>}
          {receptionistName && (
            <span>
              checked in by <span className="font-semibold text-fg">{receptionistName}</span>
            </span>
          )}
          {nurseName && (
            <span>
              vitals by <span className="font-semibold text-fg">{nurseName}</span>
            </span>
          )}
        </div>
        {(conditions || receptionNote) && (
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 border-t border-hairline pt-3 text-sm">
            {conditions && (
              <p>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Reception ticked{" "}
                </span>
                {conditions}
              </p>
            )}
            {receptionNote && (
              <p className="min-w-0 whitespace-pre-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Note{" "}
                </span>
                {receptionNote}
              </p>
            )}
          </div>
        )}
      </section>

      <RxEditor
        visitId={visit.id}
        completed={visit.status === "completed"}
        people={{
          doctor: { name: staff.full_name, specialty: staff.specialty },
          patient: {
            name: patient?.full_name ?? "—",
            age: patient ? ageLabel(patient) : null,
            id: patient?.patient_code ?? null,
          },
          date: formatPadDate(visit.created_at),
        }}
        initial={readPad(visit as unknown as PadSource)}
        legacyPrescription={visit.prescription}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {history && history.length > 0 && (
          <section className={`${card} ${cardPad}`}>
            <h2 className="text-base font-extrabold">
              Previous visits ({history.length})
            </h2>
            <ul className="mt-4 divide-y divide-hairline">
              {history.map((h) => {
                const summary =
                  (h.complaints as string[] | null)?.join(", ") || h.diagnosis;
                const rx = Array.isArray(h.medicines) ? h.medicines.length : 0;
                return (
                  <li key={h.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                    <span className="text-sm text-fg">
                      {formatClinicDate(h.created_at)}
                      <span className="ml-3 text-xs text-muted">{h.visit_code}</span>
                    </span>
                    <span className="max-w-xs text-right text-xs text-muted">
                      {summary ?? (h.status === "completed" ? "nothing recorded" : h.status)}
                      {rx > 0 && ` · ${rx} medicine${rx === 1 ? "" : "s"}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {withLinks.length > 0 && (
          <section className={`${card} ${cardPad}`}>
            <h2 className="text-base font-extrabold">Files &amp; notes</h2>
            <ul className="mt-4 space-y-4">
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
      </div>

      <EntryForm visitId={visit.id} />
    </div>
  );
}
