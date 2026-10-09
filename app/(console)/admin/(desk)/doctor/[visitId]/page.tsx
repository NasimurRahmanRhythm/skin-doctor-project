import { notFound, redirect } from "next/navigation";
import { card, Code } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatClinicTime } from "@/lib/clinic";
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
import PreviousVisits from "./previous-visits";
import RxEditor from "./rx-editor";

export default async function DoctorVisitPage({
  params,
}: PageProps<"/admin/doctor/[visitId]">) {
  const staff = await requireRole("doctor");
  const { visitId } = await params;
  const supabase = await createClient();

  const { data: visit } = await supabase
    .from("visits")
    .select(
      `id, visit_code, visit_type, chief_complaint, intake_notes, created_at, status,
       patient_id, doctor_id, nurse_id, receptionist_id, ${PAD_COLUMNS},
       patients(full_name, patient_code, phone, age, date_of_birth)`,
    )
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) notFound();

  // A doctor can read a shared patient's visits with other doctors, but only
  // their own visit opens as a pad they can write on.
  if (visit.doctor_id !== staff.id) {
    redirect(`/admin/doctor/patients/${visit.patient_id}`);
  }
  await markVisitRead(visitId);

  const patient = Array.isArray(visit.patients) ? visit.patients[0] : visit.patients;

  const handlerIds = [visit.nurse_id, visit.receptionist_id].filter(
    Boolean,
  ) as string[];

  const { data: handlers } = handlerIds.length
    ? await supabase.from("staff_directory").select("id, full_name").in("id", handlerIds)
    : { data: [] };

  const handlerById = new Map((handlers ?? []).map((s) => [s.id, s.full_name]));
  const nurseName = visit.nurse_id ? handlerById.get(visit.nurse_id) ?? null : null;
  const receptionistName = visit.receptionist_id
    ? handlerById.get(visit.receptionist_id) ?? null
    : null;

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

      {/* Earlier prescriptions, above today's so they are read before it is
          written. */}
      <PreviousVisits patientId={visit.patient_id} currentVisitId={visit.id} />

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
    </div>
  );
}
