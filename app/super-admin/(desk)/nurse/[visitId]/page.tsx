import Link from "next/link";
import { notFound } from "next/navigation";
import VisitSummary from "@/components/visit-summary";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markVisitRead } from "../../notification-actions";
import VitalsForm from "./vitals-form";

export default async function NurseVisitPage({
  params,
}: PageProps<"/super-admin/nurse/[visitId]">) {
  await requireRole("nurse");
  const { visitId } = await params;
  const supabase = await createClient();

  const { data: visit } = await supabase
    .from("visits")
    .select(
      `id, visit_code, visit_type, chief_complaint, created_at, status, doctor_id,
       patients(full_name, patient_code, phone, age, gender)`,
    )
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) notFound();

  const { data: doctor } = visit.doctor_id
    ? await supabase
        .from("staff_directory")
        .select("full_name, specialty")
        .eq("id", visit.doctor_id)
        .maybeSingle()
    : { data: null };

  // Opening the patient is the moment the alert stops being useful.
  await markVisitRead(visitId);

  const patient = Array.isArray(visit.patients) ? visit.patients[0] : visit.patients;
  const alreadyDone = visit.status !== "awaiting_vitals";

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <Link href="/super-admin/nurse" className="text-sm text-sage underline underline-offset-2">
          ← Back to queue
        </Link>
        <Link
          href={`/super-admin/print/${visit.id}?scope=nurse`}
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
          doctorName: doctor
            ? `${doctor.full_name}${doctor.specialty ? ` — ${doctor.specialty}` : ""}`
            : null,
        }}
      />

      {alreadyDone ? (
        <p className="border border-line bg-paper px-8 py-7 text-sm text-ink-soft rounded-card">
          Vitals for this visit have already been recorded and the patient has
          moved on to the doctor.
        </p>
      ) : (
        <VitalsForm visitId={visit.id} />
      )}
    </div>
  );
}
